// src/store/bookingStore.js
import { create } from 'zustand';
import { bookingService } from '../services/bookingService';

export const useBookingStore = create((set, get) => ({
  bookings: [],
  loading: false,
  error: null,

  fetchBookings: async (filters) => {
    set({ loading: true, error: null });
    try {
      const { data } = await bookingService.getBookings(filters);
      set({ bookings: data, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false, bookings: [] });
    }
  },

  submitBooking: async (booking) => {
    set({ loading: true, error: null });
    try {
      const { data } = await bookingService.submitBooking(booking);
      set(state => ({ bookings: [data, ...state.bookings], loading: false }));
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  approveBooking: async (id, decisionParams = {}) => {
    const booking = get().bookings.find(b => b.id === id);
    const params = { ...decisionParams };
    if (!params.room_id && booking) {
      params.room_id = (booking.room && booking.room !== 'TBD') ? booking.room : booking.requested_room;
    }
    if (!params.day && booking) {
      params.day = (booking.day && booking.day !== 'TBD') ? booking.day : booking.windows?.[0]?.day;
    }
    if (params.start_period === undefined && booking) {
      params.start_period = booking.assigned_start_period || booking.windows?.[0]?.from_period;
    }
    if (params.end_period === undefined && booking) {
      params.end_period = booking.assigned_end_period || booking.windows?.[0]?.to_period;
    }
    const { data } = await bookingService.approveBooking(id, params);
    set(state => ({
      bookings: state.bookings.map(b => b.id === id ? { ...b, status: 'approved' } : b),
    }));
    return data;
  },

  rejectBooking: async (id, reason, alternative) => {
    const { data } = await bookingService.rejectBooking(id, reason, alternative);
    set(state => ({
      bookings: state.bookings.map(b =>
        b.id === id ? { ...b, status: 'rejected', rejectedReason: reason, suggestedAlternative: alternative } : b
      ),
    }));
    return data;
  },
}));
