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
      set({ error: e.message, loading: false });
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

  approveBooking: async (id) => {
    const { data } = await bookingService.approveBooking(id);
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
