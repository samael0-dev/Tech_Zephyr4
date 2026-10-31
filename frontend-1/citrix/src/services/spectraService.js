// src/services/spectraService.js
import { apiClient } from './apiClient';

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
    priority: item.priority || (item.effective_category === 'institute_event' ? 3 : 6),
    category: item.effective_category || item.requested_category || item.category || 'club_event',
    attendance: item.attendance || 100,
    displacements: item.displacements || item.displaced_sessions || [],
    reason: item.decision_reason || item.reason,
  };
}

export const spectraService = {
  getEvents: async () => {
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
      console.error('Real /bookings API error for spectra:', err.message);
      throw err;
    }
  },

  evaluateEvents: async () => {
    try {
      const data = await apiClient.post('/bookings/evaluate');
      return { data, demo: false };
    } catch (err) {
      console.error('Real /bookings/evaluate API error:', err.message);
      throw err;
    }
  },

  approveEvent: async (id, decisionParams = {}) => {
    try {
      let placement = typeof decisionParams === 'string'
        ? { reason: decisionParams }
        : { ...decisionParams };

      if (!placement.room_id || !placement.day || !placement.start_period || !placement.end_period) {
        try {
          const existing = await apiClient.get(`/bookings/${id}`);
          if (existing) {
            placement.room_id = placement.room_id || existing.assigned_room_id || existing.requested_room || 'AUD';
            placement.day = placement.day || existing.assigned_day || existing.windows?.[0]?.day || 'FRI';
            placement.start_period = placement.start_period ?? existing.assigned_start_period ?? existing.windows?.[0]?.from_period ?? 6;
            placement.end_period = placement.end_period ?? existing.assigned_end_period ?? existing.windows?.[0]?.to_period ?? ((placement.start_period || 6) + (existing.duration_periods || 2) - 1);
          }
        } catch (fetchErr) {
          console.warn(`Could not pre-fetch booking ${id} details for Spectra approval:`, fetchErr.message);
        }
      }

      const payload = {
        decision: 'approved',
        day: placement.day,
        start_period: Number(placement.start_period),
        end_period: Number(placement.end_period),
        room_id: placement.room_id,
        reason: placement.reason || 'Approved by Spectra Committee',
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeSpectraEvent(data), demo: false };
    } catch (err) {
      console.error(`Real /bookings/${id}/decision approve failed:`, err.message);
      throw err;
    }
  },

  rejectEvent: async (id, reason = 'Scheduling conflict', alternativeRoom = null) => {
    try {
      const reasonText = reason + (alternativeRoom ? ` (Suggested alternative: ${alternativeRoom})` : '');
      const payload = {
        decision: 'rejected',
        reason: reasonText,
        room_id: null,
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeSpectraEvent(data), demo: false };
    } catch (err) {
      console.error(`Real /bookings/${id}/decision reject failed:`, err.message);
      throw err;
    }
  },
};

export default spectraService;
