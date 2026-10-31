// src/services/apiClient.js
/**
 * Centralized API Client for CITRIX.
 * Connects to the authoritative FastAPI backend.
 * Handles JWT bearer authentication, error envelopes, and consistent data extraction.
 */

import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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
      `Unable to connect to CITRIX backend server (${err.message || 'Network error'}). Please check backend connection.`,
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

    if (data && typeof data === 'object') {
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
