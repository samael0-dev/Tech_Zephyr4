// src/services/dashboardService.js
import { apiClient } from './apiClient';

export const dashboardService = {
  getDeanDashboard: async () => {
    try {
      const data = await apiClient.get('/dashboard/dean');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /dashboard/dean API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getCoordinatorDashboard: async () => {
    try {
      const data = await apiClient.get('/dashboard/coordinator');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /dashboard/coordinator API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getFacultyDashboard: async () => {
    try {
      const data = await apiClient.get('/dashboard/faculty');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /dashboard/faculty API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getClubDashboard: async () => {
    try {
      const data = await apiClient.get('/dashboard/club');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /dashboard/club API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getStudentDashboard: async () => {
    try {
      const data = await apiClient.get('/dashboard/student');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /dashboard/student API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },
};

export default dashboardService;
