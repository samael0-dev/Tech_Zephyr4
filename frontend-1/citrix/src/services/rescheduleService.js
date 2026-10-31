// src/services/rescheduleService.js
import { apiClient } from './apiClient';

export const rescheduleService = {
  submitDisruption: async (disruptionData) => {
    try {
      const payload = {
        disruption_type: disruptionData.type || disruptionData.disruption_type || 'faculty_unavailable',
        faculty_id: disruptionData.faculty_id || disruptionData.facultyId,
        room_id: disruptionData.room_id || disruptionData.roomId,
        days: disruptionData.days || (disruptionData.day ? [disruptionData.day] : ['MON']),
        periods: disruptionData.periods || [1, 2],
        reason: disruptionData.reason || 'Reported unavailability',
      };
      const data = await apiClient.post('/reschedule', payload);
      return { data, demo: false };
    } catch (err) {
      console.warn('Real POST /reschedule API unavailable:', err.message);
      return {
        data: {
          request_id: Date.now(),
          status: 'pending',
          message: 'Disruption request saved locally (offline mode).',
        },
        demo: true,
      };
    }
  },

  getDisruption: async (requestId) => {
    return apiClient.get(`/reschedule/${requestId}`);
  },

  generateProposal: async (requestId, timeLimitSeconds = 30.0) => {
    try {
      const data = await apiClient.post(`/reschedule/${requestId}/propose`, null, {
        params: { time_limit_seconds: timeLimitSeconds },
      });
      return { data, demo: false };
    } catch (err) {
      console.warn(`Real /reschedule/${requestId}/propose API error:`, err.message);
      throw err;
    }
  },

  approveProposal: async (requestId) => {
    try {
      const data = await apiClient.post(`/reschedule/${requestId}/approve`);
      return { data, demo: false };
    } catch (err) {
      console.warn(`Real /reschedule/${requestId}/approve API error:`, err.message);
      throw err;
    }
  },
};

export default rescheduleService;
