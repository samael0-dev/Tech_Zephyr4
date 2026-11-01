/**
 * CITRIX Official Demo Dataset
 * Chilika Institute of Technology (CIT)
 * 
 * Dataset counts per specification:
 * - 27 Rooms
 * - 40 Faculty
 * - 14 Student Groups
 * - 62 Courses
 * - 189 Teaching Sessions (162 1-hr lectures/tutorials + 27 3-hr lab sessions = 243 hours/week)
 * - 25 Spectra Booking Requests (1 later cancelled)
 * - 41 Midsem Exams (with 50% capacity rule)
 */

export const BUILDINGS = [
  {
    id: 'academic_a',
    name: 'Academic Block A',
    code: 'AC-A',
    floors: 2,
    totalRooms: 12,
    type: 'Academic Building',
    primaryUse: 'Classrooms, Lecture Halls, Tutorial Rooms',
    departments: ['Computer Science and Engineering', 'Mathematics'],
    coords: { x: -35, z: -20, y: 0 },
    shape: 'quad_courtyard',
    color: '#3B82F6',
    walkingTimeFromAdmin: '3 min',
    accessibility: 'Full step-free access, ramps, elevator installed'
  },
  {
    id: 'academic_b',
    name: 'Academic Block B',
    code: 'AC-B',
    floors: 2,
    totalRooms: 5,
    type: 'Academic Building',
    primaryUse: 'Classrooms, Seminar Halls',
    departments: ['Electronics & Communication', 'Electrical Engineering'],
    coords: { x: -45, z: 25, y: 0 },
    shape: 'curved_wing',
    color: '#F59E0B',
    walkingTimeFromAdmin: '4 min',
    accessibility: 'Step-free ground floor, elevator to 2nd floor'
  },
  {
    id: 'science_complex',
    name: 'Science Complex',
    code: 'SCI',
    floors: 2,
    totalRooms: 4,
    type: 'Laboratory Complex',
    primaryUse: 'Specialized Hardware & Research Labs',
    departments: ['Physics', 'Chemistry', 'CSE Research'],
    coords: { x: 35, z: -30, y: 0 },
    shape: 'oval_petal',
    color: '#10B981',
    walkingTimeFromAdmin: '5 min',
    accessibility: 'Heavy equipment ramps, freight & passenger elevator'
  },
  {
    id: 'library',
    name: 'Central Library',
    code: 'LIB',
    floors: 2,
    totalRooms: 2,
    type: 'Academic Resource',
    primaryUse: 'Digital Archives, Reading Halls, Conference Rooms',
    departments: ['All Departments'],
    coords: { x: -10, z: 42, y: 0 },
    shape: 'oval_petal',
    color: '#06B6D4',
    walkingTimeFromAdmin: '2 min',
    accessibility: 'Ground floor direct ramp, braille signage'
  },
  {
    id: 'auditorium',
    name: 'Central Auditorium',
    code: 'AUD',
    floors: 1,
    totalRooms: 2,
    type: 'Assembly Venue',
    primaryUse: 'Convocations, Keynotes, Institute Events',
    departments: ['Institute Level'],
    coords: { x: 30, z: 35, y: 0 },
    shape: 'dome_auditorium',
    color: '#EF4444',
    walkingTimeFromAdmin: '6 min',
    accessibility: 'Wheelchair dedicated rows, hearing loop assistive tech'
  },
  {
    id: 'lecture_center',
    name: 'Lecture Centre',
    code: 'LC',
    floors: 2,
    totalRooms: 2,
    type: 'Lecture Theatres',
    primaryUse: 'Large Common Core Courses',
    departments: ['First Year Engineering', 'Common Core'],
    coords: { x: 15, z: -40, y: 0 },
    shape: 'oval_petal',
    color: '#8B5CF6',
    walkingTimeFromAdmin: '3 min',
    accessibility: 'Tiered step-free access on mid-level'
  },
  {
    id: 'central_plaza',
    name: 'Central Plaza & Amphitheatre',
    code: 'PLAZA',
    floors: 1,
    totalRooms: 1,
    type: 'Outdoor Arena',
    primaryUse: 'Cultural Festivals, Spectra 2024, Exhibitions',
    departments: ['Student Affairs / Cultural'],
    coords: { x: 0, z: 0, y: 0 },
    shape: 'circular_amphitheatre',
    color: '#EC4899',
    walkingTimeFromAdmin: '1 min',
    accessibility: 'Wide paved amphitheatre ramps'
  },
  {
    id: 'oat',
    name: 'Open Air Theatre (OAT)',
    code: 'OAT',
    floors: 1,
    totalRooms: 1,
    type: 'Outdoor Arena',
    primaryUse: 'Concerts, Club Practices, Dramatic Societies',
    departments: ['Student Clubs'],
    coords: { x: 55, z: 20, y: 0 },
    shape: 'stepped_bowl',
    color: '#14B8A6',
    walkingTimeFromAdmin: '7 min',
    accessibility: 'Perimeter accessible viewing deck'
  }
];

export const ROOMS = [
  // Academic Block A - Floor 1
  { id: 'A-101', name: 'Classroom A-101', buildingId: 'academic_a', floor: 1, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC', 'PA System'] },
  { id: 'A-102', name: 'Classroom A-102', buildingId: 'academic_a', floor: 1, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC'] },
  { id: 'A-103', name: 'Tutorial Room A-103', buildingId: 'academic_a', floor: 1, capacity: 40, examCapacity: 20, type: 'tutorial', accessible: true, features: ['Whiteboard', 'AC'] },
  { id: 'A-104', name: 'Large Lecture Hall A-104', buildingId: 'academic_a', floor: 1, capacity: 80, examCapacity: 40, type: 'lecture_hall', accessible: true, features: ['Dual Projectors', 'Mic', 'AC', 'Power Sockets', 'Whiteboard'] },
  { id: 'A-105', name: 'Classroom A-105', buildingId: 'academic_a', floor: 1, capacity: 40, examCapacity: 20, type: 'classroom', accessible: false, features: ['Projector', 'Whiteboard'] },
  { id: 'A-106', name: 'Classroom A-106', buildingId: 'academic_a', floor: 1, capacity: 40, examCapacity: 20, type: 'classroom', accessible: false, features: ['Projector', 'Whiteboard'] },
  { id: 'A-107', name: 'Classroom A-107', buildingId: 'academic_a', floor: 1, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC', 'Recording Cam'] },
  { id: 'A-108', name: 'Classroom A-108', buildingId: 'academic_a', floor: 1, capacity: 40, examCapacity: 20, type: 'classroom', accessible: true, features: ['Whiteboard', 'AC'] },

  // Academic Block A - Floor 2
  { id: 'A-201', name: 'Lecture Hall A-201', buildingId: 'academic_a', floor: 2, capacity: 80, examCapacity: 40, type: 'lecture_hall', accessible: true, features: ['Projector', 'AC', 'Mic', 'Whiteboard'] },
  { id: 'A-202', name: 'Classroom A-202', buildingId: 'academic_a', floor: 2, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC'] },
  { id: 'A-203', name: 'Classroom A-203', buildingId: 'academic_a', floor: 2, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'AC', 'Whiteboard'] },
  { id: 'A-204', name: 'Seminar Room A-204', buildingId: 'academic_a', floor: 2, capacity: 40, examCapacity: 20, type: 'seminar_room', accessible: true, features: ['Video Conf', 'Smart Screen', 'AC'] },

  // Academic Block B - Floor 1 & 2
  { id: 'B-101', name: 'Classroom B-101', buildingId: 'academic_b', floor: 1, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC'] },
  { id: 'B-102', name: 'Classroom B-102', buildingId: 'academic_b', floor: 1, capacity: 60, examCapacity: 30, type: 'classroom', accessible: true, features: ['Projector', 'Whiteboard', 'AC'] },
  { id: 'B-201', name: 'Seminar Hall B-201', buildingId: 'academic_b', floor: 2, capacity: 80, examCapacity: 40, type: 'seminar_hall', accessible: true, features: ['Projector', 'Power Sockets', 'Whiteboard', 'Mic', 'AC'] },
  { id: 'B-202', name: 'Classroom B-202', buildingId: 'academic_b', floor: 2, capacity: 40, examCapacity: 20, type: 'classroom', accessible: true, features: ['Whiteboard', 'AC'] },
  { id: 'B-203', name: 'Lecture Theatre B-203', buildingId: 'academic_b', floor: 2, capacity: 60, examCapacity: 30, type: 'lecture_hall', accessible: true, features: ['Dual Projectors', 'AC', 'Whiteboard'] },

  // Science Complex (Labs)
  { id: 'SC-L1', name: 'Computer Lab 1 (Lab-1)', buildingId: 'science_complex', floor: 1, capacity: 40, examCapacity: 20, type: 'laboratory', accessible: true, features: ['40 Linux Workstations', 'Gigabit LAN', 'Projector', 'UPS Backup'] },
  { id: 'SC-L2', name: 'Electronics Lab 2 (Lab-2)', buildingId: 'science_complex', floor: 1, capacity: 40, examCapacity: 20, type: 'laboratory', accessible: true, features: ['DSO Oscilloscopes', 'Function Generators', 'Solder Stations', 'AC'] },
  { id: 'SC-101', name: 'Advanced AI Lab', buildingId: 'science_complex', floor: 2, capacity: 45, examCapacity: 22, type: 'laboratory', accessible: true, features: ['GPU Rigs', 'Smartboard', 'AC', 'Gigabit LAN'] },
  { id: 'SC-102', name: 'Robotics Workshop Lab', buildingId: 'science_complex', floor: 2, capacity: 50, examCapacity: 25, type: 'laboratory', accessible: true, features: ['Robotics Test Track', '3D Printers', 'Power Outlets', 'Tool Bench'] },

  // Central Library
  { id: 'LIB-CR1', name: 'Library Conference Room 1', buildingId: 'library', floor: 1, capacity: 35, examCapacity: 17, type: 'conference_room', accessible: true, features: ['Video Conferencing', 'Display Monitor', 'Wi-Fi 6', 'AC'] },
  { id: 'LIB-CR2', name: 'Library Seminar Room 2', buildingId: 'library', floor: 2, capacity: 30, examCapacity: 15, type: 'seminar_room', accessible: true, features: ['Smart Display', 'Whiteboard', 'Quiet Acoustic'] },

  // Auditorium
  { id: 'AUD-Main', name: 'Central Grand Auditorium', buildingId: 'auditorium', floor: 1, capacity: 350, examCapacity: 175, type: 'auditorium', accessible: true, features: ['Line Array Sound', 'Stage Rigging', 'Motorized Screen', 'Full AC', 'Green Rooms'] },
  { id: 'AUD-Mini', name: 'Mini Auditorium', buildingId: 'auditorium', floor: 1, capacity: 120, examCapacity: 60, type: 'auditorium', accessible: true, features: ['Stage', 'Surround Sound', 'HD Projection', 'AC'] },

  // Lecture Centre
  { id: 'LC-101', name: 'Core Lecture Hall LC-101', buildingId: 'lecture_center', floor: 1, capacity: 100, examCapacity: 50, type: 'lecture_hall', accessible: true, features: ['Tiered Seating', 'Acoustic Panels', 'Mic System', 'AC'] },

  // Outdoor Venues
  { id: 'OAT-Main', name: 'Open Air Amphitheatre', buildingId: 'oat', floor: 1, capacity: 500, examCapacity: 250, type: 'outdoor', accessible: true, features: ['Open Stage', 'Ambient Floodlights', 'Acoustic Shell'] },
  { id: 'Plaza-Green', name: 'Central Campus Plaza', buildingId: 'central_plaza', floor: 1, capacity: 250, examCapacity: 0, type: 'outdoor', accessible: true, features: ['Paved Concentric Amphitheatre', 'Shade Trees', 'Power Hubs'] }
];

