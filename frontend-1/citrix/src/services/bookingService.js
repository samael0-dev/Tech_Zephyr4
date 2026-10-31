// src/services/bookingService.js
import { apiClient } from './apiClient';
import {
  mockGetBookings,
  mockSubmitBooking,
  mockApproveBooking,
  mockRejectBooking,
  mockParseNLRequest,
} from './mockAdapter';

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
        status_filter: filters.status,
      });
      const list = Array.isArray(data) ? data : data?.bookings || [];
      return { data: list.map(normalizeBooking), demo: false };
    } catch (err) {
      console.warn('Real /bookings API unavailable, using fallback:', err.message);
      return mockGetBookings(filters);
    }
  },

  getBooking: async (id) => {
    try {
      const data = await apiClient.get(`/bookings/${id}`);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.warn(`Real /bookings/${id} API unavailable:`, err.message);
      return { data: null, demo: true };
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
            from_period: booking.startPeriod || 6,
            to_period: (booking.startPeriod || 6) + (booking.duration || 2) - 1,
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
      console.warn('Real POST /bookings API unavailable, using fallback:', err.message);
      return mockSubmitBooking(booking);
    }
  },

  approveBooking: async (id, decisionParams = {}) => {
    try {
      const payload = {
        decision: 'approved',
        day: decisionParams.day,
        start_period: decisionParams.start_period,
        end_period: decisionParams.end_period,
        room_id: decisionParams.room_id,
        reason: decisionParams.reason || 'Booking approved by authorized authority',
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.warn(`Real /bookings/${id}/decision API unavailable:`, err.message);
      // Retain mock fallback only if backend call fails
      return mockApproveBooking(id);
    }
  },

  rejectBooking: async (id, reason, alternative = null) => {
    try {
      const payload = {
        decision: alternative ? 'alternative_offered' : 'rejected',
        reason: reason || 'Booking request rejected due to scheduling conflict',
        room_id: alternative?.room_id,
        day: alternative?.day,
        start_period: alternative?.start_period,
        end_period: alternative?.end_period,
      };
      const data = await apiClient.post(`/bookings/${id}/decision`, payload);
      return { data: normalizeBooking(data), demo: false };
    } catch (err) {
      console.warn(`Real /bookings/${id}/decision rejection failed:`, err.message);
      return mockRejectBooking(id, reason, alternative);
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
      console.warn('Real AI assistant parse failed, using local parser:', err.message);
      return mockParseNLRequest(text);
    }
  },
};

export default bookingService;
