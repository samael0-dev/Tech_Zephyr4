// src/services/spectraService.js
import { apiClient } from './apiClient';
import { mockGetSpectra, mockApproveSpectra, mockRejectSpectra } from './mockAdapter';

function normalizeSpectraEvent(item) {
  const reqRoom = item.requested_room || item.assigned_room_id || item.room || 'AUD';
  const assignedRoom = item.assigned_room_id || reqRoom;
  const clubName = item.requester || item.club || 'Club Lead';

  return {
    ...item,
    id: item.id || item.request_id,
    title: item.title || item.event_name || 'Spectra Event',
    club: clubName,
    room: assignedRoom,
    requestedRoom: reqRoom,
    alternativeRoom: item.alternative_room || item.suggested_room || 'SH-2',
    day: item.assigned_day || item.day || 'FRI',
    startPeriod: item.assigned_start_period || item.start_period || 6,
    endPeriod: item.assigned_end_period || item.end_period || 8,
    status: item.status || 'pending',
    priority: item.priority || (item.effective_category === 'institute_event' ? 1 : 4),
    category: item.effective_category || item.requested_category || item.category || 'Technical',
    attendance: item.attendance || 100,
    displacements: item.displacements || item.displaced_sessions || [],
    reason: item.decision_reason || item.reason,
  };
}

export const spectraService = {
  getEvents: async (filters = {}) => {
    try {
      const data = await apiClient.get('/bookings');
      const list = Array.isArray(data) ? data : data?.bookings || [];
      const spectraList = list.filter(
        (b) =>
          b.series_id === 'spectra' ||
          b.requested_category?.includes('event') ||
          b.effective_category?.includes('event') ||
          b.title?.toLowerCase().includes('fest') ||
          b.title?.toLowerCase().includes('spectra')
      );

      const target = spectraList.length > 0 ? spectraList : list;
      return { data: target.map(normalizeSpectraEvent), demo: false };
    } catch (err) {
      console.warn('Real /bookings API unavailable for spectra, using fallback:', err.message);
      return mockGetSpectra(filters);
    }
  },

  evaluateEvents: async () => {
    try {
      const data = await apiClient.post('/bookings/evaluate');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /bookings/evaluate API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  approveEvent: async (id, reason = 'Approved by Spectra Committee') => {
    try {
      const data = await apiClient.post(`/bookings/${id}/decision`, {
        decision: 'approved',
        reason,
      });
      return { data: normalizeSpectraEvent(data), demo: false };
    } catch (err) {
      console.warn(`Real /bookings/${id}/decision approve failed:`, err.message);
      return mockApproveSpectra(id, reason);
    }
  },

  rejectEvent: async (id, reason = 'Scheduling conflict', alternativeRoom = null) => {
    try {
      const data = await apiClient.post(`/bookings/${id}/decision`, {
        decision: alternativeRoom ? 'alternative_offered' : 'rejected',
        reason,
        room_id: alternativeRoom,
      });
      return { data: normalizeSpectraEvent(data), demo: false };
    } catch (err) {
      console.warn(`Real /bookings/${id}/decision reject failed:`, err.message);
      return mockRejectSpectra(id, reason, alternativeRoom);
    }
  },
};

export default spectraService;
