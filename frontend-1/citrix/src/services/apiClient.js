// src/services/apiClient.js
/**
 * Centralized API Client for CITRIX.
 * Connects to the authoritative FastAPI backend.
 * Handles JWT bearer authentication, error envelopes, dynamic API base URLs,
 * and automatic detection of static Vercel proxy / CORS configurations.
 */

import { useAuthStore } from '@/store/authStore';

export function getBaseUrl() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('citrix_api_url') : null;
  if (custom && custom.trim()) {
    const clean = custom.trim().replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return 'https://tech-zephyr4.onrender.com/api/v1';
    }
  }
  return '/api/v1';
}

export function setCustomApiUrl(url) {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('citrix_api_url');
    } else {
      localStorage.setItem('citrix_api_url', url.trim());
    }
    window.dispatchEvent(new CustomEvent('citrix:api_url_changed', { detail: url }));
  }
}

export function getCustomApiUrl() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('citrix_api_url') || '';
  }
  return '';
}

export async function testBackendHealth(targetUrl) {
  const base = targetUrl
    ? (targetUrl.trim().replace(/\/+$/, '').endsWith('/api/v1')
        ? targetUrl.trim().replace(/\/+$/, '')
        : `${targetUrl.trim().replace(/\/+$/, '')}/api/v1`)
    : getBaseUrl();
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message || 'Connection refused or CORS error' };
  }
}

export class ApiError extends Error {
  constructor(message, status = 500, code = 'UNKNOWN_ERROR', details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, String(value));
      }
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function request(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Bearer token if available
  const token = useAuthStore.getState?.()?.token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiError(
      `Unable to connect to CITRIX backend (${err.message || 'Network error'}). Ensure backend URL is configured correctly.`,
      0,
      'NETWORK_ERROR'
    );
  }

  // Parse JSON or text
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred.';
    let code = `HTTP_${response.status}`;
    let details = [];

    if (response.status === 405) {
      message = 'Backend API endpoint not reachable (HTTP 405). The request hit the Vercel static frontend host instead of your FastAPI backend. Please configure your Backend URL.';
      code = 'BACKEND_NOT_CONFIGURED';
    } else if (data && typeof data === 'object') {
      if (data.error) {
        message = data.error.message || message;
        code = data.error.code || code;
        details = data.error.details || [];
      } else if (data.detail) {
        if (typeof data.detail === 'string') {
          message = data.detail;
        } else if (Array.isArray(data.detail)) {
          message = data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
          details = data.detail;
        }
      }
    }

    // 401 Unauthorized handling: session expired or token invalid
    if (response.status === 401) {
      if (token) {
        useAuthStore.getState?.()?.logout?.();
      }
    }

    throw new ApiError(message, response.status, code, details);
  }

  // Standard backend envelope unwrapping: { success: true, data: T, message: str }
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data;
  }

  return data;
}

export const apiClient = {
  get: (endpoint, params) =>
    request(`${endpoint}${buildQueryString(params)}`, { method: 'GET' }),

  post: (endpoint, body, options = {}) => {
    const qs = options.params ? buildQueryString(options.params) : '';
    const cleanOptions = { ...options };
    delete cleanOptions.params;
    return request(`${endpoint}${qs}`, {
      method: 'POST',
      body: body === null || body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
      ...cleanOptions,
    });
  },

  put: (endpoint, body, options = {}) => {
    const qs = options.params ? buildQueryString(options.params) : '';
    const cleanOptions = { ...options };
    delete cleanOptions.params;
    return request(`${endpoint}${qs}`, {
      method: 'PUT',
      body: body === null || body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
      ...cleanOptions,
    });
  },

  delete: (endpoint, options = {}) => {
    const qs = options?.params ? buildQueryString(options.params) : '';
    const cleanOptions = { ...(options || {}) };
    delete cleanOptions.params;
    return request(`${endpoint}${qs}`, {
      method: 'DELETE',
      ...cleanOptions,
    });
  },
};

export default apiClient;
