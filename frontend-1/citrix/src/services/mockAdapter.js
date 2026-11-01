// src/services/mockAdapter.js
// Mock adapter that simulates backend API responses
// All responses are clearly labelled as demo data
// Replace with real API calls when backend is ready

import {
  ROOMS, FACULTY, STUDENT_GROUPS, COURSES, SESSIONS,
  SPECTRA_EVENTS, MIDSEM_EXAMS, BOOKINGS, DISRUPTIONS,
  NOTIFICATIONS, AUDIT_LOGS, ANALYTICS,
} from '../data/demoData';

// Simulated delay (ms)
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

let _bookings = [...BOOKINGS];
let _notifications = [...NOTIFICATIONS];
let _spectra = [...SPECTRA_EVENTS];
let _disruptions = [...DISRUPTIONS];
let _sessions = [...SESSIONS];

// ─── Rooms ────────────────────────────────────────────────────────────────
export const mockGetRooms = async (filters = {}) => {
  await delay(300);
  let rooms = [...ROOMS];
  if (filters.building) rooms = rooms.filter(r => r.building === filters.building);
  if (filters.type) rooms = rooms.filter(r => r.type === filters.type);
  if (filters.status) rooms = rooms.filter(r => r.status === filters.status);
  if (filters.capacity) rooms = rooms.filter(r => r.capacity >= filters.capacity);
  if (filters.accessible) rooms = rooms.filter(r => r.accessible);
  return { data: rooms, demo: true };
};

export const mockGetRoom = async (id) => {
  await delay(200);
  const room = ROOMS.find(r => r.id === id);
  return { data: room, demo: true };
};

export const mockGetRoomAvailability = async (roomId, date) => {
  await delay(400);
  const sessions = _sessions.filter(s => s.room === roomId);
  return {
    data: {
      roomId,
      date,
      occupiedSlots: sessions.map(s => ({ start: s.startTime, end: s.endTime, by: s.course })),
      availableSlots: ['08:00-09:00', '12:00-14:00', '17:00-18:00'],
    },
    demo: true,
  };
};

// ─── Faculty ──────────────────────────────────────────────────────────────
export const mockGetFaculty = async (filters = {}) => {
  await delay(300);
  let faculty = [...FACULTY];
  if (filters.dept) faculty = faculty.filter(f => f.dept === filters.dept);
  if (filters.available !== undefined) faculty = faculty.filter(f => f.available === filters.available);
  return { data: faculty, demo: true };
};

// ─── Sessions / Timetable ─────────────────────────────────────────────────
export const mockGetSessions = async (filters = {}) => {
  await delay(300);
  let sessions = [..._sessions];
  if (filters.group) sessions = sessions.filter(s => s.group === filters.group);
  if (filters.faculty) sessions = sessions.filter(s => s.faculty === filters.faculty);
  if (filters.room) sessions = sessions.filter(s => s.room === filters.room);
  if (filters.day) sessions = sessions.filter(s => s.day === filters.day);
  return { data: sessions, demo: true };
};

export const mockGenerateTimetable = async (config) => {
  await delay(3000); // Simulate solving time
  return {
    data: {
      status: 'success',
      sessions: _sessions,
      scheduled: 189,
      unscheduled: 0,
      conflicts: 0,
      softViolations: 3,
      generatedAt: new Date().toISOString(),
      solverNote: '[DEMO] This is a pre-generated schedule. Actual CP-SAT solver output will appear here.',
    },
    demo: true,
  };
};

export const mockGetScheduleVersions = async () => {
  await delay(200);
  return {
    data: [
      {
        id: 'SCHED-V1-OPTIMAL',
        status: 'active',
        created_at: new Date().toISOString(),
        hard_violations_count: 0,
        soft_penalty_score: 3,
        sessions_count: 189,
        is_active: true,
      },
    ],
    demo: true,
  };
};

export const mockExportTimetable = async (format = 'json') => {
  await delay(300);
  const jsonBlob = new Blob([JSON.stringify({ sessions: _sessions, exported_at: new Date().toISOString() }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(jsonBlob);
  return {
    data: {
      url,
      format,
      payload: { sessions: _sessions },
      demo: true,
    },
  };
};

// ─── Bookings ─────────────────────────────────────────────────────────────
export const mockGetBookings = async (filters = {}) => {
  await delay(300);
  let bookings = [..._bookings];
  if (filters.status) bookings = bookings.filter(b => b.status === filters.status);
  if (filters.requestedBy) bookings = bookings.filter(b => b.requestedBy === filters.requestedBy);
  return { data: bookings, demo: true };
};

export const mockSubmitBooking = async (booking) => {
  await delay(600);
  const newBooking = {
    ...booking,
    id: `BK${String(_bookings.length + 1).padStart(3, '0')}`,
    status: 'pending',
    submittedOn: new Date().toISOString(),
  };
  _bookings = [newBooking, ..._bookings];
  _notifications = [
    {
      id: `N${Date.now()}`,
      title: 'Booking Submitted',
      message: `Your booking for ${booking.room} has been submitted for approval.`,
      type: 'info',
      read: false,
      timestamp: new Date().toISOString(),
      role: booking.requestedBy,
    },
    ..._notifications,
  ];
  return { data: newBooking, demo: true };
};

export const mockApproveBooking = async (id) => {
  await delay(500);
  _bookings = _bookings.map(b => b.id === id ? { ...b, status: 'approved', approvedBy: 'admin' } : b);
  return { data: { id, status: 'approved' }, demo: true };
};

export const mockRejectBooking = async (id, reason, alternative) => {
  await delay(500);
  _bookings = _bookings.map(b =>
    b.id === id ? { ...b, status: 'rejected', rejectedReason: reason, suggestedAlternative: alternative } : b
  );
  return { data: { id, status: 'rejected' }, demo: true };
};

// ─── Spectra ──────────────────────────────────────────────────────────────
export const mockGetSpectra = async (filters = {}) => {
  await delay(300);
  let events = [..._spectra];
  if (filters.status) events = events.filter(e => e.status === filters.status);
  if (filters.category) events = events.filter(e => e.category === filters.category);
  return { data: events, demo: true };
};

export const mockApproveSpectra = async (id, reason) => {
  await delay(500);
  _spectra = _spectra.map(e => e.id === id ? { ...e, status: 'approved', reason } : e);
  return { data: { id, status: 'approved' }, demo: true };
};

export const mockRejectSpectra = async (id, reason, alternativeRoom) => {
  await delay(500);
  _spectra = _spectra.map(e =>
    e.id === id ? { ...e, status: 'rejected', reason, alternativeRoom } : e
  );
  return { data: { id, status: 'rejected' }, demo: true };
};

// ─── Midsem ───────────────────────────────────────────────────────────────
export const mockGetMidsemExams = async (filters = {}) => {
  await delay(300);
  let exams = [...MIDSEM_EXAMS];
  if (filters.status) exams = exams.filter(e => e.status === filters.status);
  if (filters.group) exams = exams.filter(e => e.group === filters.group);
  return { data: exams, demo: true };
};

export const mockGenerateMidsemSchedule = async () => {
  await delay(2500);
  return {
    data: {
      status: 'success',
      exams: MIDSEM_EXAMS,
      scheduled: 30,
      unscheduled: 9,
      conflicts: 2,
      note: '[DEMO] Pre-generated midsem schedule. Actual exam allocation will be produced by the backend.',
    },
    demo: true,
  };
};

// ─── Disruptions ──────────────────────────────────────────────────────────
export const mockGetDisruptions = async () => {
  await delay(300);
  return { data: _disruptions, demo: true };
};

export const mockSubmitDisruption = async (disruption) => {
  await delay(600);
  const newDisruption = {
    ...disruption,
    id: `D${String(_disruptions.length + 1).padStart(3, '0')}`,
    status: 'pending_repair',
    proposalStatus: null,
  };
  _disruptions = [newDisruption, ..._disruptions];
  return { data: newDisruption, demo: true };
};

export const mockGenerateRepairProposal = async (disruptionId) => {
  await delay(2000);
  return {
    data: {
      disruptionId,
      proposal: [
        { sessionId: 'S001', originalDay: 'Monday', originalTime: '09:00', newDay: 'Friday', newTime: '14:00', newRoom: 'A201', reason: 'F003 available Friday' },
        { sessionId: 'S002', originalDay: 'Wednesday', originalTime: '09:00', newDay: 'Friday', newTime: '15:00', newRoom: 'A201', reason: 'Same room, consecutive slot' },
        { sessionId: 'S003', originalDay: 'Friday', originalTime: '09:00', newDay: 'Thursday', newTime: '16:00', newRoom: 'B101', reason: 'Only available slot' },
      ],
      note: '[DEMO] Repair proposal simulated. Actual CP-SAT repair output will appear here when backend is connected.',
    },
    demo: true,
  };
};

// ─── Notifications ────────────────────────────────────────────────────────
export const mockGetNotifications = async (role) => {
  await delay(200);
  const notes = _notifications.filter(n => !role || n.role === role || n.role === 'all');
  return { data: notes, demo: true };
};

export const mockMarkRead = async (id) => {
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
  return { data: { id, read: true }, demo: true };
};

// ─── AI Assistant ─────────────────────────────────────────────────────────
export const mockAIQuery = async (query) => {
  await delay(1500);
  const lower = query.toLowerCase();

  if (lower.includes('available') && (lower.includes('room') || lower.includes('lab'))) {
    return {
      data: {
        response: `[DEMO] Based on your query, here are available rooms:\n\n• **A-201** (80 seats) — Available Mon 10:00–12:00\n• **B-301** (60 seats) — Free all day Thursday\n• **CS Lab 2** (30 PCs) — Available Fri 14:00–17:00\n\nWould you like to book one of these?`,
        suggestions: ['Book A-201 for Monday 10-12', 'Show B-301 timetable', 'Find accessible rooms'],
        rooms: ['A201', 'B301', 'CS-L2'],
      },
      demo: true,
    };
  }

  if (lower.includes('reschedule') || lower.includes('postpone')) {
    return {
      data: {
        response: `[DEMO] I can help reschedule your session. Here are available slots that avoid conflicts:\n\n• **Wednesday 14:00** — Room A-202 free, no faculty clash\n• **Thursday 16:00** — B-301 available, students free\n\nShall I submit a rescheduling request?`,
        suggestions: ['Reschedule to Wed 14:00', 'Show all free slots', 'Check student group availability'],
      },
      demo: true,
    };
  }

  return {
    data: {
      response: `[DEMO] I understand you're asking about: "${query}"\n\nAs a demo, I can help with:\n• Finding available rooms\n• Checking schedules\n• Rescheduling sessions\n• Booking venues\n\nThe AI assistant will connect to the real backend when available.`,
      suggestions: ['Find available rooms', 'Check my schedule', 'Request room booking'],
    },
    demo: true,
  };
};

// ─── NL Booking Parser ────────────────────────────────────────────────────
export const mockParseNLRequest = async (text) => {
  await delay(1200);

  // Simple pattern detection for demo
  const hasNumbers = text.match(/\d+/);
  const capacity = hasNumbers ? parseInt(hasNumbers[0]) : 60;

  return {
    data: {
      parsed: {
        title: 'Room Booking Request',
        date: '2026-11-08',
        startTime: '10:00',
        endTime: '13:00',
        capacity,
        type: text.toLowerCase().includes('lab') || text.toLowerCase().includes('computer') ? 'Computer Lab' : 'Classroom',
        accessible: text.toLowerCase().includes('accessible') || text.toLowerCase().includes('wheelchair'),
        purpose: text.includes('workshop') ? 'Workshop' : text.includes('seminar') ? 'Seminar' : 'Event',
        rawText: text,
      },
      confidence: 0.82,
      note: '[DEMO] NL parsing simulated. Real NLP/LLM parsing will be performed by the backend service.',
      suggestedRooms: ROOMS.filter(r => r.capacity >= capacity && r.status !== 'occupied').slice(0, 3),
    },
    demo: true,
  };
};

// ─── Analytics ────────────────────────────────────────────────────────────
export const mockGetAnalytics = async () => {
  await delay(400);
  return { data: ANALYTICS, demo: true };
};

export const mockGetAuditLogs = async () => {
  await delay(300);
  return { data: AUDIT_LOGS, demo: true };
};
