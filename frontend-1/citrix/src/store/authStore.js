// src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/services/apiClient';
import { DEMO_ACCOUNTS } from '../data/demoData';

// Mapping of frontend demo persona IDs to real backend credentials
export const DEMO_CREDENTIALS = {
  'demo-admin': { username_or_email: 'dean@cit.edu', password: 'password123' },
  'demo-coordinator': { username_or_email: 'coordinator.cse@cit.edu', password: 'password123' },
  'demo-faculty': { username_or_email: 'f01@cit.edu', password: 'password123' },
  'demo-club': { username_or_email: 'coding@cit.edu', password: 'password123' },
};

function normalizeUser(backendUser) {
  if (!backendUser) return null;
  const role = backendUser.role === 'department_coordinator' ? 'coordinator' : backendUser.role;
  return {
    ...backendUser,
    role, // 'admin' | 'coordinator' | 'faculty' | 'club' | 'student'
    rawRole: backendUser.role,
    avatar: backendUser.name
      ? backendUser.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'U',
    color:
      role === 'admin'
        ? 'bg-blue-600'
        : role === 'coordinator'
        ? 'bg-teal-600'
        : role === 'faculty'
        ? 'bg-indigo-600'
        : role === 'club'
        ? 'bg-purple-600'
        : 'bg-emerald-600',
  };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      loginWithCredentials: async (usernameOrEmail, password) => {
        set({ loading: true, error: null });
        try {
          const authData = await apiClient.post('/auth/login', {
            username_or_email: usernameOrEmail,
            password: password,
          });

          const normalized = normalizeUser(authData.user);
          set({
            user: normalized,
            token: authData.access_token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return normalized;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;
        }
      },

      loginWithDemo: async (demoAccountId) => {
        const creds = DEMO_CREDENTIALS[demoAccountId] || {
          username_or_email: 'dean@cit.edu',
          password: 'password123',
        };
        try {
          return await get().loginWithCredentials(creds.username_or_email, creds.password);
        } catch (err) {
          // If backend connection fails, fall back to offline demo persona with clear warning
          console.warn('Backend unavailable, falling back to local demo state:', err.message);
          const localAccount = DEMO_ACCOUNTS.find((a) => a.id === demoAccountId) || DEMO_ACCOUNTS[0];
          set({
            user: localAccount,
            token: 'demo-local-token',
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return localAccount;
        }
      },

      // Backward compatible login method
      login: (accountId) => {
        return get().loginWithDemo(accountId);
      },

      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token || token === 'demo-local-token') return get().user;
        try {
          const userData = await apiClient.get('/auth/me');
          const normalized = normalizeUser(userData);
          set({ user: normalized, isAuthenticated: true });
          return normalized;
        } catch {
          // Session expired or invalid
          get().logout();
          return null;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      hasRole: (role) => {
        const u = get().user;
        if (!u) return false;
        if (role === 'coordinator') {
          return u.role === 'coordinator' || u.rawRole === 'department_coordinator';
        }
        return u.role === role || u.rawRole === role;
      },

      canApprove: (requesterId) => {
        const user = get().user;
        if (!user) return false;
        // Nobody can approve their own request (strict No Self-Approval)
        if (user.id === requesterId || (user.email && user.email === requesterId)) return false;
        return (
          user.role === 'admin' ||
          user.role === 'coordinator' ||
          user.rawRole === 'department_coordinator'
        );
      },
    }),
    { name: 'citrix-auth' }
  )
);
