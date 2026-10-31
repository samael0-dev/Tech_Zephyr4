// src/store/notificationStore.js
import { create } from 'zustand';
import { mockGetNotifications, mockMarkRead } from '../services/mockAdapter';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (role) => {
    const { data } = await mockGetNotifications(role);
    set({ notifications: data, unreadCount: data.filter(n => !n.read).length });
  },

  markRead: async (id) => {
    await mockMarkRead(id);
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
