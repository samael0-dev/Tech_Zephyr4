// src/services/roomService.js
import { apiClient } from './apiClient';
import { mockGetRooms, mockGetRoom, mockGetRoomAvailability } from './mockAdapter';

export const roomService = {
  getRooms: async (filters = {}) => {
    try {
      const data = await apiClient.get('/rooms', {
        building: filters.building,
        room_type: filters.type,
        min_capacity: filters.capacity,
        accessible: filters.accessible,
      });

      const rooms = (Array.isArray(data) ? data : data?.rooms || []).map((r) => ({
        ...r,
        name: r.name || r.id,
        building: r.building || 'Academic Block',
        floor: r.floor || parseInt(r.id?.match(/\d+/)?.[0]?.[0] || '1', 10),
        status: r.status || 'available',
        capacity: r.capacity || 60,
        accessible: r.accessible ?? r.is_accessible ?? true,
        facilities: r.features || r.facilities || [],
        type: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ')) : 'Classroom',
      }));

      return { data: rooms, demo: false };
    } catch (err) {
      console.warn('Real /rooms API unavailable, using fallback:', err.message);
      return mockGetRooms(filters);
    }
  },

  getRoom: async (id) => {
    try {
      const r = await apiClient.get(`/rooms/${id}`);
      const room = {
        ...r,
        floor: r.floor || parseInt(r.id?.match(/\d+/)?.[0]?.[0] || '1', 10),
        status: r.status || 'available',
        facilities: r.features || r.facilities || [],
        type: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ')) : 'Classroom',
      };
      return { data: room, demo: false };
    } catch (err) {
      console.warn(`Real /rooms/${id} API unavailable, using fallback:`, err.message);
      return mockGetRoom(id);
    }
  },

  getRoomAvailability: async (roomId, dateOrDay) => {
    try {
      // Backend expects 'day' (e.g. MON, TUE, WED, THU, FRI)
      const dayMap = {
        0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
        monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI',
        mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI'
      };
      const dayStr = String(dateOrDay || '').toLowerCase();
      const resolvedDay = dayMap[dayStr] || (dateOrDay instanceof Date ? dayMap[dateOrDay.getDay()] : 'MON');

      const data = await apiClient.get(`/rooms/${roomId}/availability`, { day: resolvedDay });
      return {
        data: {
          roomId: data.room_id || roomId,
          day: data.day || resolvedDay,
          slots: data.slots || [],
          occupiedSlots: (data.slots || [])
            .filter((s) => s.is_occupied)
            .map((s) => ({
              period: s.period,
              start: `P${s.period}`,
              end: `P${s.period}`,
              by: s.title || s.occupied_by_type || 'Occupied',
              faculty: s.faculty,
              group: s.group,
            })),
          availableSlots: (data.slots || [])
            .filter((s) => !s.is_occupied)
            .map((s) => `Period ${s.period}`),
        },
        demo: false,
      };
    } catch (err) {
      console.warn(`Real /rooms/${roomId}/availability API unavailable, using fallback:`, err.message);
      return mockGetRoomAvailability(roomId, dateOrDay);
    }
  },
};

export default roomService;
