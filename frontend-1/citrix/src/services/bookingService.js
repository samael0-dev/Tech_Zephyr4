// src/services/bookingService.js
import { apiClient } from './apiClient';

function normalizeBooking(b) {
  return {
    ...b,
    id: b.id,
    title: b.title || 'Untitled Booking',
    room: b.assigned_room_id || b.requested_room || 'TBD',
    requested_room: b.requested_room,
    day: b.assigned_day || b.windows?.[0]?.day || 'TBD',
    time: b.assigned_start_period
      ? `Period ${b.assigned_start_period}${b.assigned_end_period ? `-${b.assigned_end_period}` : ''}`
      : b.windows?.[0]
      ? `P${b.windows[0].from_period}-P${b.windows[0].to_period}`
      : 'TBD',
    status: b.status || 'pending',
    requestedBy: b.requester || b.requester_user_id || 'User',
    role: b.role,
    category: b.effective_category || b.requested_category || 'club_event',
    attendance: b.attendance || 0,
    duration: b.duration_periods || 1,
    submittedOn: b.submitted_at || new Date().toISOString(),
    decisionReason: b.decision_reason,
  };
}

export const bookingService = {
  getBookings: async (filters = {}) => {
    try {
      const data = await apiClient.get('/bookings', {
        status: filters.status,
      });
      const list = Array.isArray(data) ? data : data?.bookings || [];
      return { data: list.map(normalizeBooking), demo: false };
    } catch (err) {
      console.error('Real /bookings API error:', err.message);
      throw err;
    }
  },

  getBooking: async (id) => {
    try {
      const data = await apiClient.get(`/bookings/${id}`);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.error(`Real /bookings/${id} API error:`, err.message);
      throw err;
    }
  },

  submitBooking: async (booking) => {
    try {
      const payload = {
        title: booking.title || booking.name || 'Event Booking',
        attendance: parseInt(booking.attendance || booking.attendees || booking.expectedAttendance || 50, 10),
        duration_periods: parseInt(booking.duration || booking.duration_periods || 2, 10),
        requested_category: booking.category || booking.requested_category || 'club_event',
        windows: booking.windows || [
          {
            day: booking.day || 'MON',
            from_period: Number(booking.startPeriod || 6),
            to_period: Number((booking.startPeriod || 6) + (booking.duration || 2) - 1),
          },
        ],
        room_types: booking.room_types || (booking.roomType ? [booking.roomType] : ['classroom']),
        requested_room: booking.room || booking.requested_room || null,
        raw_text: booking.raw_text || booking.description || booking.purpose || null,
        needs: booking.facilities || booking.needs || [],
      };

      const data = await apiClient.post('/bookings', payload);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.error('Real POST /bookings API error:', err.message);
      throw err;
    }
  },

  approveBooking: async (id, decisionParams = {}) => {
    try {
      let placement = { ...decisionParams };
      // If placement fields are missing, fetch the booking to populate them
      if (!placement.room_id || !placement.day || !placement.start_period || !placement.end_period) {
        try {
          const existing = await apiClient.get(`/bookings/${id}`);
          if (existing) {
            placement.room_id = placement.room_id || existing.assigned_room_id || existing.requested_room || 'L-101';
            placement.day = placement.day || existing.assigned_day || existing.windows?.[0]?.day || 'MON';
            placement.start_period = placement.start_period ?? existing.assigned_start_period ?? existing.windows?.[0]?.from_period ?? 6;
            placement.end_period = placement.end_period ?? existing.assigned_end_period ?? existing.windows?.[0]?.to_period ?? ((placement.start_period || 6) + (existing.duration_periods || 2) - 1);
          }
        } catch (fetchErr) {
          console.warn(`Could not pre-fetch booking ${id} details:`, fetchErr.message);
        }
      }

      const payload = {
        decision: 'approved',
        day: placement.day,
        start_period: Number(placement.start_period),
        end_period: Number(placement.end_period),
        room_id: placement.room_id,
        reason: placement.reason || 'Booking approved by authorized authority',
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.error(`Real /bookings/${id}/decision API error:`, err.message);
      throw err;
    }
  },

  rejectBooking: async (id, reason, alternative = null) => {
    try {
      const alt = typeof alternative === 'string' ? { room_id: alternative } : (alternative || {});
      const payload = {
        decision: (alt.room_id || alt.day) ? 'alternative_offered' : 'rejected',
        reason: reason || 'Booking request rejected due to scheduling conflict',
        room_id: alt.room_id || null,
        day: alt.day || null,
        start_period: alt.start_period ? Number(alt.start_period) : null,
        end_period: alt.end_period ? Number(alt.end_period) : null,
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.error(`Real /bookings/${id}/decision rejection error:`, err.message);
      throw err;
    }
  },

  cancelBooking: async (id) => {
    return apiClient.post(`/bookings/${id}/cancel`);
  },

  evaluateFestBookings: async () => {
    return apiClient.post('/bookings/evaluate');
  },

  parseNLRequest: async (text) => {
    try {
      // Connect to real backend AI intent parsing
      const res = await apiClient.post('/assistant/chat', { message: text });
      const proposal = res?.action_proposal || {};
      const entities = res?.entities || {};

      return {
        data: {
          title: entities.title || proposal.title || 'Extracted Event',
          room: entities.room || proposal.requested_room || 'AUD',
          date: entities.day || proposal.day || 'MON',
          time: proposal.from_period ? `P${proposal.from_period}` : 'P6-P8',
          attendance: entities.attendance || proposal.attendance || 50,
          category: proposal.requested_category || 'club_event',
          parsedSuccessfully: true,
          action_proposal: proposal,
          reply: res?.reply,
        },
        demo: false,
      };
    } catch (err) {
      console.error('Real AI assistant parse error:', err.message);
      throw err;
    }
  },
};

export default bookingService;
