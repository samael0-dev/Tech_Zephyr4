// src/services/bookingService.js
import { apiClient } from './apiClient';

function dateToDayOfWeek(dateStr) {
  if (!dateStr) return 'MON';
  let formatted = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(formatted)) {
    const [d, m, y] = formatted.split('-');
    formatted = `${y}-${m}-${d}`;
  }
  const d = new Date(formatted + 'T00:00:00');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayIdx = isNaN(d.getDay()) ? 1 : d.getDay();
  const mapped = days[dayIdx];
  return mapped === 'SUN' || mapped === 'SAT' ? 'MON' : mapped;
}

function timeRangeToPeriods(startTime, endTime) {
  const parseHour = (t) => {
    if (!t) return 14;
    const parts = String(t).split(':');
    return parseInt(parts[0], 10) || 14;
  };

  const hourToPeriod = (h) => {
    if (h < 9) return 1;
    if (h === 9) return 2;
    if (h === 10) return 3;
    if (h === 11) return 4;
    if (h === 12) return 5;
    if (h === 13) return 6;
    if (h === 14) return 6;
    if (h === 15) return 7;
    if (h === 16) return 8;
    return 9;
  };

  const startH = parseHour(startTime);
  const endH = parseHour(endTime);
  const fromPeriod = hourToPeriod(startH);
  const rawDuration = Math.max(1, endH - startH);
  const duration = Math.min(8, rawDuration);
  const toPeriod = Math.min(13, fromPeriod + duration - 1);

  return { fromPeriod, toPeriod, duration };
}

function normalizeBooking(b) {
  const fromP = b.assigned_start_period || b.windows?.[0]?.from_period || 6;
  const toP = b.assigned_end_period || b.windows?.[0]?.to_period || 7;
  const dayCode = b.assigned_day || b.windows?.[0]?.day || 'MON';
  const explicitDate = b.windows?.[0]?.date || b.date;

  return {
    ...b,
    id: b.id,
    title: b.title || 'Untitled Booking',
    room: b.assigned_room_id || b.requested_room || 'TBD',
    requested_room: b.requested_room,
    day: dayCode,
    date: explicitDate || dayCode,
    startTime: b.startTime || `${fromP + 7}:00`,
    endTime: b.endTime || `${toP + 8}:00`,
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
    attendees: b.attendance || 0,
    duration: b.duration_periods || 1,
    submittedOn: b.submitted_at || new Date().toISOString(),
    decisionReason: b.decision_reason,
    rejectedReason: b.decision_reason,
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
      const day = booking.day || (booking.date ? dateToDayOfWeek(booking.date) : 'MON');
      let fromPeriod = booking.startPeriod || booking.from_period;
      let toPeriod = booking.toPeriod || booking.to_period;
      let duration = booking.duration || booking.duration_periods;

      if ((!fromPeriod || !duration) && booking.startTime) {
        const periodInfo = timeRangeToPeriods(booking.startTime, booking.endTime);
        if (!fromPeriod) fromPeriod = periodInfo.fromPeriod;
        if (!duration) duration = periodInfo.duration;
        if (!toPeriod) toPeriod = periodInfo.toPeriod;
      }

      fromPeriod = Number(fromPeriod || 6);
      duration = Number(duration || 2);
      toPeriod = Number(toPeriod || (fromPeriod + duration - 1));

      const windows =
        booking.windows && booking.windows.length > 0
          ? booking.windows
          : [
              {
                day,
                date: booking.date || null,
                from_period: fromPeriod,
                to_period: toPeriod,
              },
            ];

      const payload = {
        title: booking.title || booking.name || 'Event Booking',
        attendance: Math.max(
          1,
          parseInt(booking.attendance || booking.attendees || booking.expectedAttendance || 50, 10)
        ),
        duration_periods: duration,
        requested_category: booking.requested_category || booking.category || 'club_event',
        windows,
        room_types: booking.room_types || (booking.roomType ? [booking.roomType] : ['classroom']),
        requested_room: booking.room || booking.requested_room || null,
        raw_text: booking.raw_text || booking.description || booking.purpose || null,
        needs: booking.facilities || booking.needs || [],
        auto_execute: Boolean(booking.auto_execute),
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
      const hasFullAlternative = Boolean(alt.room_id && alt.day && alt.start_period && alt.end_period);
      const reasonText = (reason || 'Booking request rejected due to scheduling conflict') + 
        (!hasFullAlternative && alt.room_id ? ` (Suggested alternative: ${alt.room_id})` : '');
      const payload = {
        decision: hasFullAlternative ? 'alternative_offered' : 'rejected',
        reason: reasonText,
        room_id: hasFullAlternative ? alt.room_id : null,
        day: hasFullAlternative ? alt.day : null,
        start_period: hasFullAlternative ? Number(alt.start_period) : null,
        end_period: hasFullAlternative ? Number(alt.end_period) : null,
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

  parseNLRequest: async (text, context = null) => {
    try {
      const res = await apiClient.post('/bookings/parse-nl', { text, context });
      if (res && res.data) {
        return {
          data: res.data,
          demo: false,
        };
      }
      return { data: res, demo: false };
    } catch (err) {
      console.warn('Real /bookings/parse-nl API failed, trying assistant/chat fallback:', err.message);
      try {
        const res = await apiClient.post('/assistant/chat', { message: text });
        const proposal = res?.action_proposal || {};
        const entities = res?.entities || {};

        const parsed = {
          title: entities.title || proposal.title || 'Extracted Event',
          room: entities.room || proposal.requested_room || 'AUD',
          date: '2026-11-09',
          startTime: proposal.from_period ? `${proposal.from_period + 7}:00` : '10:00',
          endTime: proposal.to_period ? `${proposal.to_period + 8}:00` : '12:00',
          time: proposal.from_period ? `P${proposal.from_period}` : 'P3-P4',
          attendance: entities.attendance || proposal.attendance || 40,
          capacity: entities.attendance || proposal.attendance || 40,
          category: proposal.requested_category || 'club_event',
          type: 'Classroom',
          accessible: false,
          purpose: text,
        };

        return {
          data: {
            parsed,
            suggestedRooms: proposal.requested_room
              ? [{ id: proposal.requested_room, name: proposal.requested_room }]
              : [],
            confidence: 0.85,
          },
          demo: false,
        };
      } catch (fallbackErr) {
        console.error('All NL parsing endpoints failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }
  },
};

export default bookingService;
