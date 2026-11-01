// src/services/roomService.js
import { apiClient } from './apiClient';
import {
  mockGetRooms,
  mockGetRoom,
  mockGetRoomAvailability,
} from './mockAdapter';

export const roomService = {
  getRooms: async (filters = {}) => {
    try {
      const rawType = filters.type || filters.room_type;
      const typeParam = rawType && rawType !== 'All' ? rawType.toLowerCase().replace(/\s+/g, '_') : undefined;
      const buildingParam = filters.building && filters.building !== 'All' ? filters.building : undefined;
      const capacityParam = filters.capacity_min || filters.min_capacity || filters.capacity || filters.minCapacity || undefined;

      const data = await apiClient.get('/rooms', {
        building: buildingParam,
        type: typeParam,
        capacity_min: capacityParam ? parseInt(capacityParam, 10) : undefined,
        accessible: filters.accessible === true ? true : undefined,
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
      console.warn('Real /rooms API unavailable, using demo rooms:', err.message);
      return mockGetRooms(filters);
    }
  },

  getRoom: async (id) => {
    try {
      const r = await apiClient.get(`/rooms/${id}`);
      const room = {
        ...r,
        name: r.name || r.id,
        floor: r.floor || parseInt(r.id?.match(/\d+/)?.[0]?.[0] || '1', 10),
        status: r.status || 'available',
        capacity: r.capacity || 60,
        facilities: r.features || r.facilities || [],
        type: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ')) : 'Classroom',
      };
      return { data: room, demo: false };
    } catch (err) {
      console.warn('Real /rooms/:id API unavailable, using demo room:', err.message);
      return mockGetRoom(id);
    }
  },

  getRoomAvailability: async (roomId, dateOrDay) => {
    const dayMap = {
      0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
      monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI',
    };

    let resolvedDay = 'MON';
    if (typeof dateOrDay === 'string') {
      const lower = dateOrDay.toLowerCase();
      if (dayMap[lower]) resolvedDay = dayMap[lower];
      else {
        const d = new Date(dateOrDay);
        if (!isNaN(d.getDay())) resolvedDay = dayMap[d.getDay()] || 'MON';
      }
    }

    try {
      const data = await apiClient.get(`/rooms/${roomId}/availability`, { day: resolvedDay });
      return {
        data: {
          roomId: data.room_id || roomId,
          date: dateOrDay,
          occupiedSlots: data.occupied_slots || [],
          availableSlots: data.available_periods || ['08:30-09:30', '13:30-14:30', '16:30-17:30'],
          utilization: data.occupancy_rate || 0.45,
        },
        demo: false,
      };
    } catch (err) {
      console.warn('Real availability API unavailable, using demo:', err.message);
      return mockGetRoomAvailability(roomId, dateOrDay);
    }
  },
};

export default roomService;
