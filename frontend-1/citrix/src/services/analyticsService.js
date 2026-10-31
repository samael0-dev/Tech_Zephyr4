// src/services/analyticsService.js
import { apiClient } from './apiClient';

export const analyticsService = {
  getResources: async () => {
    try {
      const data = await apiClient.get('/analytics/resources');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /analytics/resources API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getEvents: async () => {
    try {
      const data = await apiClient.get('/analytics/events');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /analytics/events API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  getConflicts: async () => {
    try {
      const data = await apiClient.get('/analytics/conflicts');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /analytics/conflicts API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },
};

export default analyticsService;
