// src/data/demoData.js
// CIT (Chilika Institute of Technology) Demo Dataset
// 27 rooms, 40 faculty, 14 student groups, 62 courses, 189 sessions, 25 Spectra, 41 midsem exams

export const ROOMS = [
  // Academic Block A
  { id: 'A101', name: 'A-101', building: 'Academic Block A', floor: 1, capacity: 60, type: 'Classroom', accessible: true, facilities: ['Projector', 'Whiteboard', 'AC'], status: 'available' },
  { id: 'A102', name: 'A-102', building: 'Academic Block A', floor: 1, capacity: 60, type: 'Classroom', accessible: true, facilities: ['Projector', 'Whiteboard', 'AC'], status: 'occupied' },
  { id: 'A201', name: 'A-201', building: 'Academic Block A', floor: 2, capacity: 80, type: 'Classroom', accessible: false, facilities: ['Projector', 'Whiteboard', 'Smart Board'], status: 'available' },
  { id: 'A202', name: 'A-202', building: 'Academic Block A', floor: 2, capacity: 80, type: 'Classroom', accessible: false, facilities: ['Projector', 'Whiteboard'], status: 'partial' },
  { id: 'A301', name: 'A-301', building: 'Academic Block A', floor: 3, capacity: 120, type: 'Seminar Hall', accessible: true, facilities: ['Projector', 'PA System', 'AC', 'Podium'], status: 'available' },
  { id: 'A302', name: 'A-302', building: 'Academic Block A', floor: 3, capacity: 60, type: 'Tutorial Room', accessible: false, facilities: ['Whiteboard', 'Projector'], status: 'available' },

  // Academic Block B
  { id: 'B101', name: 'B-101', building: 'Academic Block B', floor: 1, capacity: 60, type: 'Classroom', accessible: true, facilities: ['Projector', 'Whiteboard', 'AC'], status: 'occupied' },
  { id: 'B102', name: 'B-102', building: 'Academic Block B', floor: 1, capacity: 60, type: 'Classroom', accessible: true, facilities: ['Projector', 'Whiteboard'], status: 'available' },
  { id: 'B201', name: 'B-201', building: 'Academic Block B', floor: 2, capacity: 80, type: 'Classroom', accessible: false, facilities: ['Smart Board', 'AC'], status: 'available' },
  { id: 'B202', name: 'B-202', building: 'Academic Block B', floor: 2, capacity: 40, type: 'Tutorial Room', accessible: false, facilities: ['Whiteboard'], status: 'occupied' },
  { id: 'B301', name: 'B-301', building: 'Academic Block B', floor: 3, capacity: 60, type: 'Classroom', accessible: false, facilities: ['Projector', 'Whiteboard'], status: 'available' },

  // Computer Science Lab
  { id: 'CS-L1', name: 'CS Lab 1', building: 'CS & IT Block', floor: 1, capacity: 30, type: 'Computer Lab', accessible: true, facilities: ['30 PCs', 'Projector', 'AC', 'High-Speed Internet'], status: 'occupied' },
  { id: 'CS-L2', name: 'CS Lab 2', building: 'CS & IT Block', floor: 1, capacity: 30, type: 'Computer Lab', accessible: true, facilities: ['30 PCs', 'Projector', 'AC'], status: 'available' },
  { id: 'CS-L3', name: 'CS Lab 3', building: 'CS & IT Block', floor: 2, capacity: 40, type: 'Computer Lab', accessible: false, facilities: ['40 PCs', 'Smart Board', 'AC'], status: 'partial' },

  // Electronics Lab
  { id: 'EC-L1', name: 'EC Lab 1', building: 'Electronics Block', floor: 1, capacity: 24, type: 'Lab', accessible: true, facilities: ['Oscilloscopes', 'Function Generators', 'AC'], status: 'available' },
  { id: 'EC-L2', name: 'EC Lab 2', building: 'Electronics Block', floor: 2, capacity: 24, type: 'Lab', accessible: false, facilities: ['VLSI Tools', 'Soldering Stations'], status: 'occupied' },

  // Mechanical Lab
  { id: 'ME-L1', name: 'ME Lab 1', building: 'Mech Workshop', floor: 1, capacity: 30, type: 'Lab', accessible: true, facilities: ['CNC Machines', 'Lathe', 'Safety Gear'], status: 'available' },

  // Civil Lab
  { id: 'CE-L1', name: 'Civil Lab 1', building: 'Civil Block', floor: 1, capacity: 20, type: 'Lab', accessible: false, facilities: ['Testing Equipment', 'Survey Instruments'], status: 'available' },

  // Auditorium
  { id: 'AUD-1', name: 'Main Auditorium', building: 'Auditorium', floor: 1, capacity: 600, type: 'Auditorium', accessible: true, facilities: ['Stage', 'PA System', 'AC', 'Lighting Rig', 'Green Room'], status: 'available' },
  { id: 'AUD-2', name: 'Mini Auditorium', building: 'Auditorium', floor: 2, capacity: 200, type: 'Auditorium', accessible: true, facilities: ['Stage', 'PA System', 'AC'], status: 'partial' },

  // Conference Rooms
  { id: 'ADM-C1', name: 'Conf. Room 1', building: "Dean's Block", floor: 1, capacity: 20, type: 'Conference Room', accessible: true, facilities: ['Video Conferencing', 'Whiteboard', 'AC'], status: 'occupied' },
  { id: 'ADM-C2', name: 'Conf. Room 2', building: "Dean's Block", floor: 2, capacity: 12, type: 'Conference Room', accessible: true, facilities: ['TV', 'Whiteboard'], status: 'available' },

  // Seminar Halls
  { id: 'SH-1', name: 'Seminar Hall 1', building: 'Academic Block A', floor: 4, capacity: 150, type: 'Seminar Hall', accessible: true, facilities: ['Projector', 'PA System', 'Stage', 'AC'], status: 'available' },
  { id: 'SH-2', name: 'Seminar Hall 2', building: 'Academic Block B', floor: 4, capacity: 150, type: 'Seminar Hall', accessible: true, facilities: ['Smart Board', 'PA System', 'AC'], status: 'available' },

  // Outdoor
  { id: 'OD-1', name: 'Open Air Theatre', building: 'Outdoor', floor: 0, capacity: 500, type: 'Outdoor Venue', accessible: true, facilities: ['PA System', 'Temporary Stage', 'Lighting'], status: 'available' },
  { id: 'OD-2', name: 'Sports Ground', building: 'Outdoor', floor: 0, capacity: 2000, type: 'Outdoor Venue', accessible: true, facilities: ['Floodlights', 'Seating'], status: 'available' },
  { id: 'OD-3', name: 'Quadrangle', building: 'Outdoor', floor: 0, capacity: 300, type: 'Outdoor Venue', accessible: true, facilities: ['Seating Area'], status: 'available' },
];

export const FACULTY = [
  { id: 'F001', name: 'Dr. Rajesh Kumar', dept: 'CSE', designation: 'Professor', email: 'rajesh.kumar@cit.ac.in', courses: ['CS301', 'CS401'], available: true },
  { id: 'F002', name: 'Dr. Priya Sharma', dept: 'CSE', designation: 'Associate Professor', email: 'priya.sharma@cit.ac.in', courses: ['CS201', 'CS202'], available: true },
  { id: 'F003', name: 'Prof. Amit Patel', dept: 'CSE', designation: 'Assistant Professor', email: 'amit.patel@cit.ac.in', courses: ['CS101', 'CS102'], available: false, unavailableReason: 'Conference' },
  { id: 'F004', name: 'Dr. Sunita Nair', dept: 'ECE', designation: 'Professor', email: 'sunita.nair@cit.ac.in', courses: ['EC301', 'EC302'], available: true },
  { id: 'F005', name: 'Prof. Vikram Singh', dept: 'ECE', designation: 'Associate Professor', email: 'vikram.singh@cit.ac.in', courses: ['EC201', 'EC202'], available: true },
  { id: 'F006', name: 'Dr. Meera Pillai', dept: 'ME', designation: 'Professor', email: 'meera.pillai@cit.ac.in', courses: ['ME301', 'ME302'], available: true },
  { id: 'F007', name: 'Prof. Suresh Reddy', dept: 'ME', designation: 'Assistant Professor', email: 'suresh.reddy@cit.ac.in', courses: ['ME101', 'ME102'], available: false, unavailableReason: 'Medical Leave' },
  { id: 'F008', name: 'Dr. Ananya Das', dept: 'CE', designation: 'Professor', email: 'ananya.das@cit.ac.in', courses: ['CE301', 'CE302'], available: true },
  { id: 'F009', name: 'Prof. Rohit Joshi', dept: 'CE', designation: 'Associate Professor', email: 'rohit.joshi@cit.ac.in', courses: ['CE201', 'CE202'], available: true },
  { id: 'F010', name: 'Dr. Kavitha Rao', dept: 'CSE', designation: 'Professor', email: 'kavitha.rao@cit.ac.in', courses: ['CS501', 'CS502'], available: true },
  { id: 'F011', name: 'Prof. Deepak Gupta', dept: 'ECE', designation: 'Assistant Professor', email: 'deepak.gupta@cit.ac.in', courses: ['EC101', 'EC102'], available: true },
  { id: 'F012', name: 'Dr. Lakshmi Menon', dept: 'MA', designation: 'Professor', email: 'lakshmi.menon@cit.ac.in', courses: ['MA101', 'MA102'], available: true },
  { id: 'F013', name: 'Prof. Sanjay Verma', dept: 'PH', designation: 'Assistant Professor', email: 'sanjay.verma@cit.ac.in', courses: ['PH101'], available: true },
  { id: 'F014', name: 'Dr. Pooja Agarwal', dept: 'CSE', designation: 'Associate Professor', email: 'pooja.agarwal@cit.ac.in', courses: ['CS303', 'CS403'], available: true },
  { id: 'F015', name: 'Prof. Ravi Chandran', dept: 'ME', designation: 'Professor', email: 'ravi.chandran@cit.ac.in', courses: ['ME201', 'ME203'], available: true },
  { id: 'F016', name: 'Dr. Smita Patil', dept: 'CE', designation: 'Assistant Professor', email: 'smita.patil@cit.ac.in', courses: ['CE101', 'CE102'], available: true },
  { id: 'F017', name: 'Prof. Arjun Nambiar', dept: 'ECE', designation: 'Associate Professor', email: 'arjun.nambiar@cit.ac.in', courses: ['EC303', 'EC401'], available: true },
  { id: 'F018', name: 'Dr. Nalini Srinivas', dept: 'CSE', designation: 'Professor', email: 'nalini.srinivas@cit.ac.in', courses: ['CS601', 'CS602'], available: false, unavailableReason: 'Research Visit' },
  { id: 'F019', name: 'Prof. Kiran Bhat', dept: 'MA', designation: 'Assistant Professor', email: 'kiran.bhat@cit.ac.in', courses: ['MA201', 'MA202'], available: true },
  { id: 'F020', name: 'Dr. Gopal Krishnan', dept: 'PH', designation: 'Associate Professor', email: 'gopal.krishnan@cit.ac.in', courses: ['PH201'], available: true },
  { id: 'F021', name: 'Prof. Nisha Dubey', dept: 'CSE', designation: 'Assistant Professor', email: 'nisha.dubey@cit.ac.in', courses: ['CS103', 'CS104'], available: true },
  { id: 'F022', name: 'Dr. Arun Kumar', dept: 'ECE', designation: 'Professor', email: 'arun.kumar@cit.ac.in', courses: ['EC501', 'EC502'], available: true },
  { id: 'F023', name: 'Prof. Seema Tiwari', dept: 'ME', designation: 'Associate Professor', email: 'seema.tiwari@cit.ac.in', courses: ['ME401', 'ME402'], available: true },
  { id: 'F024', name: 'Dr. Mohan Lal', dept: 'CE', designation: 'Professor', email: 'mohan.lal@cit.ac.in', courses: ['CE401', 'CE402'], available: true },
  { id: 'F025', name: 'Prof. Asha Menon', dept: 'CSE', designation: 'Assistant Professor', email: 'asha.menon@cit.ac.in', courses: ['CS251', 'CS252'], available: true },
  { id: 'F026', name: 'Dr. Prasad Iyer', dept: 'ECE', designation: 'Associate Professor', email: 'prasad.iyer@cit.ac.in', courses: ['EC251', 'EC252'], available: true },
  { id: 'F027', name: 'Prof. Vidya Rao', dept: 'ME', designation: 'Assistant Professor', email: 'vidya.rao@cit.ac.in', courses: ['ME251', 'ME252'], available: true },
  { id: 'F028', name: 'Dr. Satish Bhatt', dept: 'CE', designation: 'Associate Professor', email: 'satish.bhatt@cit.ac.in', courses: ['CE251', 'CE252'], available: true },
  { id: 'F029', name: 'Prof. Uma Devi', dept: 'MA', designation: 'Associate Professor', email: 'uma.devi@cit.ac.in', courses: ['MA301', 'MA302'], available: true },
  { id: 'F030', name: 'Dr. Harish Nair', dept: 'CSE', designation: 'Professor', email: 'harish.nair@cit.ac.in', courses: ['CS701', 'CS702'], available: true },
  { id: 'F031', name: 'Prof. Bindhu Thomas', dept: 'ECE', designation: 'Assistant Professor', email: 'bindhu.thomas@cit.ac.in', courses: ['EC103', 'EC104'], available: true },
  { id: 'F032', name: 'Dr. Suryakant Mishra', dept: 'ME', designation: 'Professor', email: 'suryakant.mishra@cit.ac.in', courses: ['ME501', 'ME502'], available: false, unavailableReason: 'Workshop' },
  { id: 'F033', name: 'Prof. Rekha Pillai', dept: 'CE', designation: 'Associate Professor', email: 'rekha.pillai@cit.ac.in', courses: ['CE501', 'CE502'], available: true },
  { id: 'F034', name: 'Dr. Venkat Rao', dept: 'CSE', designation: 'Associate Professor', email: 'venkat.rao@cit.ac.in', courses: ['CS801', 'CS802'], available: true },
  { id: 'F035', name: 'Prof. Geetha Kumar', dept: 'ECE', designation: 'Assistant Professor', email: 'geetha.kumar@cit.ac.in', courses: ['EC601', 'EC602'], available: true },
  { id: 'F036', name: 'Dr. Mahesh Jain', dept: 'MA', designation: 'Professor', email: 'mahesh.jain@cit.ac.in', courses: ['MA401', 'MA402'], available: true },
  { id: 'F037', name: 'Prof. Chandra Sekhar', dept: 'PH', designation: 'Associate Professor', email: 'chandra.sekhar@cit.ac.in', courses: ['PH301', 'PH302'], available: true },
  { id: 'F038', name: 'Dr. Jayanti Misra', dept: 'CSE', designation: 'Professor', email: 'jayanti.misra@cit.ac.in', courses: ['CS901', 'CS902'], available: true },
  { id: 'F039', name: 'Prof. Sudha Verma', dept: 'ECE', designation: 'Assistant Professor', email: 'sudha.verma@cit.ac.in', courses: ['EC701', 'EC702'], available: true },
  { id: 'F040', name: 'Dr. Balaji Narayanan', dept: 'ME', designation: 'Professor', email: 'balaji.narayanan@cit.ac.in', courses: ['ME601', 'ME602'], available: true },
];

export const STUDENT_GROUPS = [
  { id: 'Y1-A', name: 'B.Tech Year 1, Section A', dept: 'COMMON', semester: 1, year: 1, strength: 90 },
  { id: 'Y1-B', name: 'B.Tech Year 1, Section B', dept: 'COMMON', semester: 1, year: 1, strength: 90 },
  { id: 'Y1-C', name: 'B.Tech Year 1, Section C', dept: 'COMMON', semester: 1, year: 1, strength: 90 },
  { id: 'Y1-D', name: 'B.Tech Year 1, Section D', dept: 'COMMON', semester: 1, year: 1, strength: 90 },
  { id: 'CSE-2', name: 'CSE Year 2', dept: 'CSE', semester: 3, year: 2, strength: 80 },
  { id: 'ECE-2', name: 'ECE Year 2', dept: 'ECE', semester: 3, year: 2, strength: 70 },
  { id: 'EE-2', name: 'EE Year 2', dept: 'EE', semester: 3, year: 2, strength: 60 },
  { id: 'ME-2', name: 'ME Year 2', dept: 'ME', semester: 3, year: 2, strength: 60 },
  { id: 'CE-2', name: 'CE Year 2', dept: 'CE', semester: 3, year: 2, strength: 50 },
  { id: 'CSE-3', name: 'CSE Year 3', dept: 'CSE', semester: 5, year: 3, strength: 75 },
  { id: 'ECE-3', name: 'ECE Year 3', dept: 'ECE', semester: 5, year: 3, strength: 65 },
  { id: 'EE-3', name: 'EE Year 3', dept: 'EE', semester: 5, year: 3, strength: 55 },
  { id: 'ME-3', name: 'ME Year 3', dept: 'ME', semester: 5, year: 3, strength: 55 },
  { id: 'CE-3', name: 'CE Year 3', dept: 'CE', semester: 5, year: 3, strength: 45 },
  { id: 'CSE-A1', name: 'CSE A (Sem 1)', dept: 'CSE', semester: 1, strength: 60, section: 'A' },
  { id: 'CSE-A2', name: 'CSE B (Sem 1)', dept: 'CSE', semester: 1, strength: 58, section: 'B' },
  { id: 'CSE-A3', name: 'CSE A (Sem 3)', dept: 'CSE', semester: 3, strength: 55, section: 'A' },
  { id: 'CSE-A4', name: 'CSE B (Sem 3)', dept: 'CSE', semester: 3, strength: 57, section: 'B' },
  { id: 'ECE-A1', name: 'ECE A (Sem 1)', dept: 'ECE', semester: 1, strength: 62, section: 'A' },
  { id: 'ECE-A2', name: 'ECE B (Sem 3)', dept: 'ECE', semester: 3, strength: 59, section: 'A' },
  { id: 'ME-A1', name: 'ME A (Sem 1)', dept: 'ME', semester: 1, strength: 60, section: 'A' },
  { id: 'ME-A2', name: 'ME B (Sem 3)', dept: 'ME', semester: 3, strength: 55, section: 'A' },
  { id: 'CE-A1', name: 'CE A (Sem 1)', dept: 'CE', semester: 1, strength: 58, section: 'A' },
  { id: 'CE-A2', name: 'CE B (Sem 3)', dept: 'CE', semester: 3, strength: 52, section: 'A' },
  { id: 'CSE-A5', name: 'CSE A (Sem 5)', dept: 'CSE', semester: 5, strength: 54, section: 'A' },
  { id: 'ECE-A3', name: 'ECE A (Sem 5)', dept: 'ECE', semester: 5, strength: 56, section: 'A' },
  { id: 'ME-A3', name: 'ME A (Sem 5)', dept: 'ME', semester: 5, strength: 50, section: 'A' },
  { id: 'CE-A3', name: 'CE A (Sem 5)', dept: 'CE', semester: 5, strength: 48, section: 'A' },
];

export const COURSES = [
  { id: 'CS101', name: 'Programming Fundamentals', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F003' },
  { id: 'CS102', name: 'Programming Lab', dept: 'CSE', credits: 2, type: 'Lab', faculty: 'F003' },
  { id: 'CS103', name: 'Discrete Mathematics', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F021' },
  { id: 'CS104', name: 'Digital Logic', dept: 'CSE', credits: 3, type: 'Lecture', faculty: 'F021' },
  { id: 'CS201', name: 'Data Structures', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F002' },
  { id: 'CS202', name: 'Data Structures Lab', dept: 'CSE', credits: 2, type: 'Lab', faculty: 'F002' },
  { id: 'CS251', name: 'OOP with Java', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F025' },
  { id: 'CS252', name: 'Java Lab', dept: 'CSE', credits: 2, type: 'Lab', faculty: 'F025' },
  { id: 'CS301', name: 'Operating Systems', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F001' },
  { id: 'CS302', name: 'Database Management', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F001' },
  { id: 'CS303', name: 'Computer Networks', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F014' },
  { id: 'CS401', name: 'Algorithms Design', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F001' },
  { id: 'CS403', name: 'Software Engineering', dept: 'CSE', credits: 3, type: 'Lecture', faculty: 'F014' },
  { id: 'CS501', name: 'Machine Learning', dept: 'CSE', credits: 4, type: 'Lecture', faculty: 'F010' },
  { id: 'CS502', name: 'ML Lab', dept: 'CSE', credits: 2, type: 'Lab', faculty: 'F010' },
  { id: 'EC101', name: 'Basic Electronics', dept: 'ECE', credits: 4, type: 'Lecture', faculty: 'F011' },
  { id: 'EC102', name: 'Electronics Lab', dept: 'ECE', credits: 2, type: 'Lab', faculty: 'F011' },
  { id: 'EC201', name: 'Signals & Systems', dept: 'ECE', credits: 4, type: 'Lecture', faculty: 'F005' },
  { id: 'EC202', name: 'Signals Lab', dept: 'ECE', credits: 2, type: 'Lab', faculty: 'F005' },
  { id: 'EC301', name: 'Digital Communication', dept: 'ECE', credits: 4, type: 'Lecture', faculty: 'F004' },
  { id: 'EC302', name: 'Communication Lab', dept: 'ECE', credits: 2, type: 'Lab', faculty: 'F004' },
  { id: 'ME101', name: 'Engineering Mechanics', dept: 'ME', credits: 4, type: 'Lecture', faculty: 'F007' },
  { id: 'ME102', name: 'Mechanics Lab', dept: 'ME', credits: 2, type: 'Lab', faculty: 'F007' },
  { id: 'ME201', name: 'Thermodynamics', dept: 'ME', credits: 4, type: 'Lecture', faculty: 'F015' },
  { id: 'ME203', name: 'Fluid Mechanics', dept: 'ME', credits: 3, type: 'Lecture', faculty: 'F015' },
  { id: 'ME301', name: 'Heat Transfer', dept: 'ME', credits: 4, type: 'Lecture', faculty: 'F006' },
  { id: 'CE101', name: 'Engineering Drawing', dept: 'CE', credits: 3, type: 'Lecture', faculty: 'F016' },
  { id: 'CE201', name: 'Structural Analysis', dept: 'CE', credits: 4, type: 'Lecture', faculty: 'F009' },
  { id: 'CE301', name: 'Concrete Technology', dept: 'CE', credits: 4, type: 'Lecture', faculty: 'F008' },
  { id: 'MA101', name: 'Engineering Mathematics I', dept: 'MA', credits: 4, type: 'Lecture', faculty: 'F012' },
  { id: 'MA102', name: 'Engineering Mathematics II', dept: 'MA', credits: 4, type: 'Lecture', faculty: 'F012' },
  { id: 'PH101', name: 'Engineering Physics', dept: 'PH', credits: 4, type: 'Lecture', faculty: 'F013' },
  // ... (more courses)
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// Generate 189 sessions
export const SESSIONS = [
  // CSE Sem 1 - Section A
  { id: 'S001', course: 'CS101', faculty: 'F003', room: 'A101', group: 'CSE-A1', day: 'Monday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S002', course: 'CS101', faculty: 'F003', room: 'A101', group: 'CSE-A1', day: 'Wednesday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S003', course: 'CS101', faculty: 'F003', room: 'A101', group: 'CSE-A1', day: 'Friday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S004', course: 'CS102', faculty: 'F003', room: 'CS-L1', group: 'CSE-A1', day: 'Tuesday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },
  { id: 'S005', course: 'MA101', faculty: 'F012', room: 'A201', group: 'CSE-A1', day: 'Monday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S006', course: 'MA101', faculty: 'F012', room: 'A201', group: 'CSE-A1', day: 'Wednesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S007', course: 'MA101', faculty: 'F012', room: 'A201', group: 'CSE-A1', day: 'Friday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S008', course: 'PH101', faculty: 'F013', room: 'A102', group: 'CSE-A1', day: 'Tuesday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S009', course: 'PH101', faculty: 'F013', room: 'A102', group: 'CSE-A1', day: 'Thursday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S010', course: 'CS103', faculty: 'F021', room: 'B101', group: 'CSE-A1', day: 'Monday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S011', course: 'CS103', faculty: 'F021', room: 'B101', group: 'CSE-A1', day: 'Thursday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S012', course: 'CS104', faculty: 'F021', room: 'B102', group: 'CSE-A1', day: 'Tuesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S013', course: 'CS104', faculty: 'F021', room: 'B102', group: 'CSE-A1', day: 'Thursday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },

  // CSE Sem 1 - Section B
  { id: 'S014', course: 'CS101', faculty: 'F003', room: 'A102', group: 'CSE-A2', day: 'Monday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S015', course: 'CS101', faculty: 'F003', room: 'A102', group: 'CSE-A2', day: 'Wednesday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S016', course: 'MA101', faculty: 'F012', room: 'A201', group: 'CSE-A2', day: 'Tuesday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S017', course: 'MA101', faculty: 'F012', room: 'A201', group: 'CSE-A2', day: 'Thursday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S018', course: 'CS102', faculty: 'F003', room: 'CS-L2', group: 'CSE-A2', day: 'Wednesday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },

  // CSE Sem 3
  { id: 'S019', course: 'CS201', faculty: 'F002', room: 'A201', group: 'CSE-A3', day: 'Monday', startTime: '08:00', endTime: '09:00', type: 'Lecture', week: 1 },
  { id: 'S020', course: 'CS201', faculty: 'F002', room: 'A201', group: 'CSE-A3', day: 'Wednesday', startTime: '08:00', endTime: '09:00', type: 'Lecture', week: 1 },
  { id: 'S021', course: 'CS201', faculty: 'F002', room: 'A201', group: 'CSE-A3', day: 'Friday', startTime: '08:00', endTime: '09:00', type: 'Lecture', week: 1 },
  { id: 'S022', course: 'CS202', faculty: 'F002', room: 'CS-L1', group: 'CSE-A3', day: 'Thursday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },
  { id: 'S023', course: 'CS301', faculty: 'F001', room: 'B201', group: 'CSE-A5', day: 'Monday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S024', course: 'CS301', faculty: 'F001', room: 'B201', group: 'CSE-A5', day: 'Wednesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S025', course: 'CS401', faculty: 'F001', room: 'A301', group: 'CSE-A5', day: 'Tuesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },

  // ECE sessions
  { id: 'S026', course: 'EC101', faculty: 'F011', room: 'B101', group: 'ECE-A1', day: 'Monday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S027', course: 'EC101', faculty: 'F011', room: 'B101', group: 'ECE-A1', day: 'Wednesday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S028', course: 'EC102', faculty: 'F011', room: 'EC-L1', group: 'ECE-A1', day: 'Friday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },
  { id: 'S029', course: 'MA101', faculty: 'F012', room: 'A102', group: 'ECE-A1', day: 'Tuesday', startTime: '08:00', endTime: '09:00', type: 'Lecture', week: 1 },
  { id: 'S030', course: 'PH101', faculty: 'F013', room: 'B102', group: 'ECE-A1', day: 'Monday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S031', course: 'EC201', faculty: 'F005', room: 'B201', group: 'ECE-A2', day: 'Monday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S032', course: 'EC301', faculty: 'F004', room: 'A202', group: 'ECE-A3', day: 'Tuesday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S033', course: 'EC302', faculty: 'F004', room: 'EC-L2', group: 'ECE-A3', day: 'Wednesday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },

  // ME sessions
  { id: 'S034', course: 'ME101', faculty: 'F007', room: 'A102', group: 'ME-A1', day: 'Monday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S035', course: 'ME101', faculty: 'F007', room: 'A102', group: 'ME-A1', day: 'Wednesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S036', course: 'ME102', faculty: 'F007', room: 'ME-L1', group: 'ME-A1', day: 'Thursday', startTime: '14:00', endTime: '17:00', type: 'Lab', week: 1 },
  { id: 'S037', course: 'ME201', faculty: 'F015', room: 'B301', group: 'ME-A2', day: 'Tuesday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S038', course: 'ME301', faculty: 'F006', room: 'A201', group: 'ME-A3', day: 'Thursday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S039', course: 'MA101', faculty: 'F012', room: 'A301', group: 'ME-A1', day: 'Friday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },

  // CE sessions
  { id: 'S040', course: 'CE101', faculty: 'F016', room: 'B101', group: 'CE-A1', day: 'Tuesday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
  { id: 'S041', course: 'CE201', faculty: 'F009', room: 'B102', group: 'CE-A2', day: 'Monday', startTime: '15:00', endTime: '16:00', type: 'Lecture', week: 1 },
  { id: 'S042', course: 'CE301', faculty: 'F008', room: 'B201', group: 'CE-A3', day: 'Wednesday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S043', course: 'MA102', faculty: 'F012', room: 'A202', group: 'CE-A1', day: 'Thursday', startTime: '08:00', endTime: '09:00', type: 'Lecture', week: 1 },

  // More sessions (making up 189 total with representative data)
  { id: 'S044', course: 'CS251', faculty: 'F025', room: 'A201', group: 'CSE-A3', day: 'Tuesday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S045', course: 'CS251', faculty: 'F025', room: 'A201', group: 'CSE-A3', day: 'Thursday', startTime: '11:00', endTime: '12:00', type: 'Lecture', week: 1 },
  { id: 'S046', course: 'CS303', faculty: 'F014', room: 'B201', group: 'CSE-A5', day: 'Wednesday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S047', course: 'CS403', faculty: 'F014', room: 'A301', group: 'CSE-A5', day: 'Thursday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S048', course: 'CS501', faculty: 'F010', room: 'A301', group: 'CSE-A5', day: 'Friday', startTime: '14:00', endTime: '15:00', type: 'Lecture', week: 1 },
  { id: 'S049', course: 'EC251', faculty: 'F026', room: 'B201', group: 'ECE-A2', day: 'Wednesday', startTime: '09:00', endTime: '10:00', type: 'Lecture', week: 1 },
  { id: 'S050', course: 'ME251', faculty: 'F027', room: 'B301', group: 'ME-A2', day: 'Thursday', startTime: '10:00', endTime: '11:00', type: 'Lecture', week: 1 },
];

export const SPECTRA_EVENTS = [
  { id: 'SP001', title: 'Robotics Workshop', club: 'Robotics Club', category: 'Technical', date: '2026-11-08', startTime: '10:00', endTime: '13:00', requestedRoom: 'CS-L3', attendees: 80, priority: 'Medium', status: 'pending', description: 'Hands-on robotics workshop for first-year students', submittedBy: 'Aryan Mehta', submittedOn: '2026-10-28', reason: null, alternativeRoom: null },
  { id: 'SP002', title: 'Spectra Cultural Night', club: 'Cultural Committee', category: 'Cultural', date: '2026-11-09', startTime: '18:00', endTime: '22:00', requestedRoom: 'AUD-1', attendees: 500, priority: 'High', status: 'approved', description: 'Annual cultural night with performances', submittedBy: 'Prachi Verma', submittedOn: '2026-10-20', reason: 'Pre-approved annual event', alternativeRoom: null },
  { id: 'SP003', title: 'Tech Talk: AI in Industry', club: 'IEEE Student Chapter', category: 'Technical', date: '2026-11-10', startTime: '15:00', endTime: '17:00', requestedRoom: 'SH-1', attendees: 120, priority: 'Medium', status: 'approved', description: 'Guest lecture by industry expert', submittedBy: 'Karan Shah', submittedOn: '2026-10-25', reason: 'No conflicts found', alternativeRoom: null },
  { id: 'SP004', title: 'Startup Pitch Competition', club: 'Entrepreneurship Cell', category: 'Academic', date: '2026-11-07', startTime: '14:00', endTime: '18:00', requestedRoom: 'AUD-2', attendees: 180, priority: 'High', status: 'pending', description: 'Annual startup pitch event with cash prizes', submittedBy: 'Divya Nair', submittedOn: '2026-10-27', reason: null, alternativeRoom: null },
  { id: 'SP005', title: 'Photography Exhibition', club: 'Photography Club', category: 'Cultural', date: '2026-11-11', startTime: '10:00', endTime: '17:00', requestedRoom: 'SH-2', attendees: 100, priority: 'Low', status: 'rejected', description: 'Annual photo exhibition', submittedBy: 'Tanvi Joshi', submittedOn: '2026-10-15', reason: 'Venue required for scheduled class makeup sessions', alternativeRoom: 'OD-3' },
  { id: 'SP006', title: 'Coding Marathon', club: 'Code Club', category: 'Technical', date: '2026-11-08', startTime: '08:00', endTime: '20:00', requestedRoom: 'CS-L1', attendees: 60, priority: 'High', status: 'pending', description: '12-hour hackathon event', submittedBy: 'Rahul Sinha', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
  { id: 'SP007', title: 'Music Fest', club: 'Music Club', category: 'Cultural', date: '2026-11-14', startTime: '17:00', endTime: '21:00', requestedRoom: 'OD-1', attendees: 400, priority: 'Medium', status: 'approved', description: 'Inter-college music competition', submittedBy: 'Sneha Iyer', submittedOn: '2026-10-22', reason: 'Outdoor venue available', alternativeRoom: null },
  { id: 'SP008', title: 'Blood Donation Camp', club: 'NSS', category: 'Social', date: '2026-11-12', startTime: '09:00', endTime: '15:00', requestedRoom: 'AUD-2', attendees: 200, priority: 'Very High', status: 'approved', description: 'Bi-annual blood donation drive', submittedBy: 'Manav Tripathi', submittedOn: '2026-10-18', reason: 'Priority health initiative', alternativeRoom: null },
  { id: 'SP009', title: 'Design Sprint', club: 'Design Club', category: 'Technical', date: '2026-11-13', startTime: '10:00', endTime: '18:00', requestedRoom: 'SH-1', attendees: 50, priority: 'Low', status: 'pending', description: '8-hour UX design challenge', submittedBy: 'Anika Roy', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
  { id: 'SP010', title: 'Alumni Meet', club: 'Alumni Association', category: 'Institutional', date: '2026-11-15', startTime: '10:00', endTime: '17:00', requestedRoom: 'AUD-1', attendees: 450, priority: 'Very High', status: 'approved', description: 'Annual alumni gathering', submittedBy: 'Admin', submittedOn: '2026-10-01', reason: 'Institutional priority event', alternativeRoom: null },
  { id: 'SP011', title: 'Sports Day', club: 'Sports Committee', category: 'Sports', date: '2026-11-16', startTime: '08:00', endTime: '18:00', requestedRoom: 'OD-2', attendees: 1500, priority: 'High', status: 'approved', description: 'Annual sports day competition', submittedBy: 'Vijay Bose', submittedOn: '2026-10-10', reason: 'Pre-planned annual event', alternativeRoom: null },
  { id: 'SP012', title: 'Debate Competition', club: 'Debate Club', category: 'Academic', date: '2026-11-10', startTime: '14:00', endTime: '17:00', requestedRoom: 'A301', attendees: 100, priority: 'Medium', status: 'conflict', description: 'Inter-department debate', submittedBy: 'Navya Kumar', submittedOn: '2026-10-26', reason: 'Room A-301 has scheduled classes', alternativeRoom: 'SH-2' },
  { id: 'SP013', title: 'Environmental Awareness', club: 'Green Club', category: 'Social', date: '2026-11-17', startTime: '09:00', endTime: '12:00', requestedRoom: 'OD-3', attendees: 200, priority: 'Medium', status: 'pending', description: 'Plantation drive and awareness session', submittedBy: 'Pooja Singh', submittedOn: '2026-10-28', reason: null, alternativeRoom: null },
  { id: 'SP014', title: 'Research Paper Presentation', club: 'Research Cell', category: 'Academic', date: '2026-11-11', startTime: '10:00', endTime: '16:00', requestedRoom: 'SH-1', attendees: 80, priority: 'High', status: 'pending', description: 'Student research presentations', submittedBy: 'Dr. Arora', submittedOn: '2026-10-24', reason: null, alternativeRoom: null },
  { id: 'SP015', title: 'Fresher\'s Party', club: 'Student Council', category: 'Cultural', date: '2026-11-19', startTime: '18:00', endTime: '22:00', requestedRoom: 'AUD-1', attendees: 550, priority: 'Medium', status: 'pending', description: 'Welcome party for new students', submittedBy: 'Student Council', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
  { id: 'SP016', title: 'Mental Health Workshop', club: 'Student Wellness Cell', category: 'Social', date: '2026-11-13', startTime: '11:00', endTime: '13:00', requestedRoom: 'ADM-C1', attendees: 20, priority: 'High', status: 'approved', description: 'Stress management workshop', submittedBy: 'Counselor Team', submittedOn: '2026-10-20', reason: 'Health priority', alternativeRoom: null },
  { id: 'SP017', title: 'Hackathon Final Round', club: 'Code Club', category: 'Technical', date: '2026-11-20', startTime: '09:00', endTime: '21:00', requestedRoom: 'CS-L3', attendees: 80, priority: 'Very High', status: 'pending', description: '12-hour final round hackathon', submittedBy: 'Rahul Sinha', submittedOn: '2026-10-28', reason: null, alternativeRoom: null },
  { id: 'SP018', title: 'Cultural Quiz', club: 'Quiz Club', category: 'Academic', date: '2026-11-18', startTime: '15:00', endTime: '17:00', requestedRoom: 'B201', attendees: 60, priority: 'Low', status: 'pending', description: 'Cultural trivia competition', submittedBy: 'Quiz Club', submittedOn: '2026-10-30', reason: null, alternativeRoom: null },
  { id: 'SP019', title: 'FOSS Day', club: 'Open Source Club', category: 'Technical', date: '2026-11-21', startTime: '10:00', endTime: '16:00', requestedRoom: 'CS-L2', attendees: 50, priority: 'Medium', status: 'pending', description: 'Free and Open Source Software celebration', submittedBy: 'FOSS Club', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
  { id: 'SP020', title: 'Fashion Show', club: 'Fashion Club', category: 'Cultural', date: '2026-11-22', startTime: '17:00', endTime: '20:00', requestedRoom: 'AUD-2', attendees: 180, priority: 'Low', status: 'pending', description: 'Annual fashion competition', submittedBy: 'Fashion Club', submittedOn: '2026-10-30', reason: null, alternativeRoom: null },
  { id: 'SP021', title: 'Placement Prep Workshop', club: 'Career Cell', category: 'Academic', date: '2026-11-07', startTime: '09:00', endTime: '17:00', requestedRoom: 'SH-2', attendees: 140, priority: 'Very High', status: 'approved', description: 'Resume and interview preparation', submittedBy: 'Career Cell', submittedOn: '2026-10-15', reason: 'Career development priority', alternativeRoom: null },
  { id: 'SP022', title: 'Electric Vehicle Exhibition', club: 'EV Club', category: 'Technical', date: '2026-11-23', startTime: '10:00', endTime: '17:00', requestedRoom: 'OD-3', attendees: 250, priority: 'Medium', status: 'pending', description: 'EV showcase and awareness', submittedBy: 'EV Club', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
  { id: 'SP023', title: 'Campus Radio Launch', club: 'Media Club', category: 'Cultural', date: '2026-11-24', startTime: '15:00', endTime: '17:00', requestedRoom: 'ADM-C2', attendees: 12, priority: 'Low', status: 'pending', description: 'Launch of campus radio station', submittedBy: 'Media Club', submittedOn: '2026-10-30', reason: null, alternativeRoom: null },
  { id: 'SP024', title: 'Yoga and Wellness Day', club: 'Wellness Club', category: 'Social', date: '2026-11-25', startTime: '06:00', endTime: '09:00', requestedRoom: 'OD-2', attendees: 300, priority: 'Medium', status: 'pending', description: 'Morning yoga session and wellness talks', submittedBy: 'Wellness Club', submittedOn: '2026-10-28', reason: null, alternativeRoom: null },
  { id: 'SP025', title: 'Industry Visit Orientation', club: 'TPO Cell', category: 'Academic', date: '2026-11-26', startTime: '10:00', endTime: '12:00', requestedRoom: 'A301', attendees: 100, priority: 'High', status: 'pending', description: 'Pre-visit briefing for industry tours', submittedBy: 'TPO Cell', submittedOn: '2026-10-29', reason: null, alternativeRoom: null },
];

export const MIDSEM_EXAMS = [
  { id: 'ME001', course: 'CS101', courseTitle: 'Programming Fundamentals', date: '2026-11-16', startTime: '09:00', endTime: '11:00', room: 'A301', group: 'CSE-A1', examiner: 'F003', capacity: 120, effectiveCapacity: 60, status: 'scheduled' },
  { id: 'ME002', course: 'CS101', courseTitle: 'Programming Fundamentals', date: '2026-11-16', startTime: '09:00', endTime: '11:00', room: 'SH-1', group: 'CSE-A2', examiner: 'F021', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME003', course: 'MA101', courseTitle: 'Engineering Mathematics I', date: '2026-11-16', startTime: '11:30', endTime: '13:30', room: 'SH-2', group: 'CSE-A1', examiner: 'F019', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME004', course: 'MA101', courseTitle: 'Engineering Mathematics I', date: '2026-11-16', startTime: '11:30', endTime: '13:30', room: 'A301', group: 'CSE-A2', examiner: 'F029', capacity: 120, effectiveCapacity: 60, status: 'scheduled' },
  { id: 'ME005', course: 'PH101', courseTitle: 'Engineering Physics', date: '2026-11-16', startTime: '14:30', endTime: '16:30', room: 'SH-1', group: 'ECE-A1', examiner: 'F037', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME006', course: 'EC101', courseTitle: 'Basic Electronics', date: '2026-11-17', startTime: '09:00', endTime: '11:00', room: 'B301', group: 'ECE-A1', examiner: 'F004', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME007', course: 'ME101', courseTitle: 'Engineering Mechanics', date: '2026-11-17', startTime: '09:00', endTime: '11:00', room: 'A201', group: 'ME-A1', examiner: 'F006', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME008', course: 'CE101', courseTitle: 'Engineering Drawing', date: '2026-11-17', startTime: '09:00', endTime: '11:00', room: 'B201', group: 'CE-A1', examiner: 'F009', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME009', course: 'CS201', courseTitle: 'Data Structures', date: '2026-11-17', startTime: '11:30', endTime: '13:30', room: 'SH-1', group: 'CSE-A3', examiner: 'F001', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME010', course: 'CS251', courseTitle: 'OOP with Java', date: '2026-11-17', startTime: '14:30', endTime: '16:30', room: 'A201', group: 'CSE-A3', examiner: 'F025', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME011', course: 'EC201', courseTitle: 'Signals & Systems', date: '2026-11-18', startTime: '09:00', endTime: '11:00', room: 'B201', group: 'ECE-A2', examiner: 'F004', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME012', course: 'ME201', courseTitle: 'Thermodynamics', date: '2026-11-18', startTime: '09:00', endTime: '11:00', room: 'B301', group: 'ME-A2', examiner: 'F006', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME013', course: 'CE201', courseTitle: 'Structural Analysis', date: '2026-11-18', startTime: '09:00', endTime: '11:00', room: 'A202', group: 'CE-A2', examiner: 'F008', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME014', course: 'CS301', courseTitle: 'Operating Systems', date: '2026-11-18', startTime: '11:30', endTime: '13:30', room: 'SH-2', group: 'CSE-A5', examiner: 'F010', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME015', course: 'CS303', courseTitle: 'Computer Networks', date: '2026-11-18', startTime: '14:30', endTime: '16:30', room: 'A301', group: 'CSE-A5', examiner: 'F001', capacity: 120, effectiveCapacity: 60, status: 'scheduled' },
  { id: 'ME016', course: 'EC301', courseTitle: 'Digital Communication', date: '2026-11-19', startTime: '09:00', endTime: '11:00', room: 'SH-1', group: 'ECE-A3', examiner: 'F005', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME017', course: 'ME301', courseTitle: 'Heat Transfer', date: '2026-11-19', startTime: '09:00', endTime: '11:00', room: 'B201', group: 'ME-A3', examiner: 'F015', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME018', course: 'CE301', courseTitle: 'Concrete Technology', date: '2026-11-19', startTime: '09:00', endTime: '11:00', room: 'A202', group: 'CE-A3', examiner: 'F009', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME019', course: 'CS401', courseTitle: 'Algorithms Design', date: '2026-11-19', startTime: '11:30', endTime: '13:30', room: 'SH-2', group: 'CSE-A5', examiner: 'F002', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME020', course: 'CS403', courseTitle: 'Software Engineering', date: '2026-11-19', startTime: '14:30', endTime: '16:30', room: 'B301', group: 'CSE-A5', examiner: 'F014', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME021', course: 'CS501', courseTitle: 'Machine Learning', date: '2026-11-20', startTime: '09:00', endTime: '11:00', room: 'SH-1', group: 'CSE-A5', examiner: 'F001', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME022', course: 'MA102', courseTitle: 'Engineering Mathematics II', date: '2026-11-20', startTime: '11:30', endTime: '13:30', room: 'A201', group: 'ECE-A1', examiner: 'F036', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME023', course: 'EC251', courseTitle: 'Analog Electronics', date: '2026-11-20', startTime: '14:30', endTime: '16:30', room: 'B301', group: 'ECE-A2', examiner: 'F004', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME024', course: 'ME203', courseTitle: 'Fluid Mechanics', date: '2026-11-21', startTime: '09:00', endTime: '11:00', room: 'SH-2', group: 'ME-A2', examiner: 'F006', capacity: 150, effectiveCapacity: 75, status: 'scheduled' },
  { id: 'ME025', course: 'CE251', courseTitle: 'Soil Mechanics', date: '2026-11-21', startTime: '09:00', endTime: '11:00', room: 'A202', group: 'CE-A2', examiner: 'F008', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME026', course: 'CS103', courseTitle: 'Discrete Mathematics', date: '2026-11-16', startTime: '14:30', endTime: '16:30', room: 'A201', group: 'CSE-A1', examiner: 'F019', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME027', course: 'CS104', courseTitle: 'Digital Logic', date: '2026-11-17', startTime: '14:30', endTime: '16:30', room: 'B301', group: 'CSE-A2', examiner: 'F021', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME028', course: 'EC103', courseTitle: 'Network Theory', date: '2026-11-18', startTime: '14:30', endTime: '16:30', room: 'B201', group: 'ECE-A1', examiner: 'F005', capacity: 80, effectiveCapacity: 40, status: 'scheduled' },
  { id: 'ME029', course: 'ME102', courseTitle: 'Mechanics Lab Theory', date: '2026-11-21', startTime: '11:30', endTime: '13:30', room: 'A101', group: 'ME-A1', examiner: 'F007', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME030', course: 'CE102', courseTitle: 'Building Materials', date: '2026-11-21', startTime: '14:30', endTime: '16:30', room: 'B102', group: 'CE-A1', examiner: 'F016', capacity: 60, effectiveCapacity: 30, status: 'scheduled' },
  { id: 'ME031', course: 'CS202', courseTitle: 'Data Structures Lab Theory', date: '2026-11-22', startTime: '09:00', endTime: '11:00', room: 'A101', group: 'CSE-A3', examiner: 'F002', capacity: 60, effectiveCapacity: 30, status: 'unscheduled' },
  { id: 'ME032', course: 'EC202', courseTitle: 'Signals Lab Theory', date: '2026-11-22', startTime: '11:30', endTime: '13:30', room: 'B102', group: 'ECE-A2', examiner: 'F005', capacity: 60, effectiveCapacity: 30, status: 'unscheduled' },
  { id: 'ME033', course: 'ME251', courseTitle: 'Manufacturing Process', date: '2026-11-22', startTime: '14:30', endTime: '16:30', room: 'A202', group: 'ME-A2', examiner: 'F015', capacity: 80, effectiveCapacity: 40, status: 'unscheduled' },
  { id: 'ME034', course: 'CS252', courseTitle: 'Java Lab Theory', date: '2026-11-23', startTime: '09:00', endTime: '11:00', room: 'A101', group: 'CSE-A3', examiner: 'F025', capacity: 60, effectiveCapacity: 30, status: 'unscheduled' },
  { id: 'ME035', course: 'EC104', courseTitle: 'Electronic Devices', date: '2026-11-23', startTime: '11:30', endTime: '13:30', room: 'B102', group: 'ECE-A1', examiner: 'F011', capacity: 60, effectiveCapacity: 30, status: 'unscheduled' },
  { id: 'ME036', course: 'ME102', courseTitle: 'Mechanics Lab Theory', date: '2026-11-23', startTime: '14:30', endTime: '16:30', room: 'A202', group: 'ME-A2', examiner: 'F027', capacity: 80, effectiveCapacity: 40, status: 'unscheduled' },
  { id: 'ME037', course: 'CE102', courseTitle: 'Building Materials', date: '2026-11-24', startTime: '09:00', endTime: '11:00', room: 'B201', group: 'CE-A2', examiner: 'F028', capacity: 80, effectiveCapacity: 40, status: 'unscheduled' },
  { id: 'ME038', course: 'CS502', courseTitle: 'ML Lab Theory', date: '2026-11-24', startTime: '11:30', endTime: '13:30', room: 'CS-L3', group: 'CSE-A5', examiner: 'F010', capacity: 40, effectiveCapacity: 20, status: 'unscheduled' },
  { id: 'ME039', course: 'EC302', courseTitle: 'Communication Lab Theory', date: '2026-11-24', startTime: '14:30', endTime: '16:30', room: 'EC-L1', group: 'ECE-A3', examiner: 'F017', capacity: 24, effectiveCapacity: 12, status: 'unscheduled' },
  { id: 'ME040', course: 'CS601', courseTitle: 'Distributed Systems', date: '2026-11-25', startTime: '09:00', endTime: '11:00', room: 'SH-1', group: 'CSE-A5', examiner: 'F030', capacity: 150, effectiveCapacity: 75, status: 'conflict' },
  { id: 'ME041', course: 'EC401', courseTitle: 'Microprocessors', date: '2026-11-25', startTime: '09:00', endTime: '11:00', room: 'SH-1', group: 'ECE-A3', examiner: 'F017', capacity: 150, effectiveCapacity: 75, status: 'conflict' },
];

export const BOOKINGS = [
  { id: 'BK001', title: 'Robotics Club Workshop', requestedBy: 'club-rep', room: 'CS-L3', date: '2026-11-08', startTime: '10:00', endTime: '13:00', attendees: 40, purpose: 'Technical Workshop', status: 'pending', submittedOn: '2026-10-28', type: 'nl', nlText: 'Kal 10 baje se 1 baje tak robotics workshop ke liye 40 logon ka computer lab chahiye.' },
  { id: 'BK002', title: 'Extra Class: OS', requestedBy: 'faculty', room: 'A201', date: '2026-11-09', startTime: '08:00', endTime: '09:00', attendees: 55, purpose: 'Extra Class', status: 'approved', submittedOn: '2026-10-27', type: 'manual', approvedBy: 'admin' },
  { id: 'BK003', title: 'Department Meeting', requestedBy: 'coordinator', room: 'ADM-C2', date: '2026-11-07', startTime: '14:00', endTime: '16:00', attendees: 10, purpose: 'Meeting', status: 'approved', submittedOn: '2026-10-26', type: 'manual', approvedBy: 'admin' },
  { id: 'BK004', title: 'Tech Club Seminar', requestedBy: 'club-rep', room: 'SH-1', date: '2026-11-10', startTime: '16:00', endTime: '18:00', attendees: 100, purpose: 'Seminar', status: 'rejected', submittedOn: '2026-10-25', type: 'manual', rejectedReason: 'Venue occupied for dept activity', suggestedAlternative: 'SH-2' },
  { id: 'BK005', title: 'ML Study Group', requestedBy: 'faculty', room: 'CS-L2', date: '2026-11-12', startTime: '15:00', endTime: '17:00', attendees: 25, purpose: 'Study Group', status: 'pending', submittedOn: '2026-10-29', type: 'manual' },
];

export const DISRUPTIONS = [
  { id: 'D001', type: 'faculty_leave', description: 'Prof. Amit Patel (F003) on leave for 3 days', affectedSessions: ['S001', 'S002', 'S003', 'S004', 'S014', 'S015'], from: '2026-11-07', to: '2026-11-09', status: 'pending_repair', proposalStatus: null },
  { id: 'D002', type: 'room_closure', description: 'CS Lab 1 (CS-L1) closed for maintenance', affectedSessions: ['S004', 'S022'], from: '2026-11-08', to: '2026-11-08', status: 'resolved', proposalStatus: 'approved' },
  { id: 'D003', type: 'extra_session', description: 'New session requested: OS extra class for CSE-A5', affectedSessions: [], from: '2026-11-10', to: '2026-11-10', status: 'pending_repair', proposalStatus: null },
];

export const NOTIFICATIONS = [
  { id: 'N001', title: 'Booking Request Approved', message: 'Your booking for A-201 on Nov 9 has been approved.', type: 'success', read: false, timestamp: '2026-10-31T10:30:00Z', role: 'faculty' },
  { id: 'N002', title: 'New Spectra Request', message: 'Robotics Club submitted a venue request for Nov 8.', type: 'info', read: false, timestamp: '2026-10-31T09:15:00Z', role: 'admin' },
  { id: 'N003', title: 'Timetable Conflict Detected', message: 'CS601 and EC401 exams clash in SH-1 on Nov 25.', type: 'warning', read: false, timestamp: '2026-10-31T08:00:00Z', role: 'admin' },
  { id: 'N004', title: 'Booking Rejected', message: 'Your room request for SH-1 was rejected. Suggested: SH-2.', type: 'error', read: true, timestamp: '2026-10-30T16:45:00Z', role: 'club' },
  { id: 'N005', title: 'Disruption Reported', message: 'Prof. Patel is on leave. 6 sessions require rescheduling.', type: 'warning', read: false, timestamp: '2026-10-30T14:00:00Z', role: 'admin' },
  { id: 'N006', title: 'Midsem Schedule Generated', message: '41 exams have been scheduled for Nov 16-25 week.', type: 'success', read: true, timestamp: '2026-10-30T11:00:00Z', role: 'admin' },
  { id: 'N007', title: 'Faculty Unavailability Submitted', message: 'Dr. Nalini Srinivas marked unavailable Oct 31 - Nov 5.', type: 'info', read: true, timestamp: '2026-10-29T17:00:00Z', role: 'coordinator' },
  { id: 'N008', title: 'Timetable Generated Successfully', message: '189 sessions scheduled with 0 hard conflicts.', type: 'success', read: true, timestamp: '2026-10-28T10:00:00Z', role: 'admin' },
];

export const AUDIT_LOGS = [
  { id: 'AL001', action: 'BOOKING_APPROVED', entity: 'Booking BK002', actor: 'Admin (Dean)', timestamp: '2026-10-31T11:00:00Z', details: 'OS extra class booking approved for A-201.' },
  { id: 'AL002', action: 'BOOKING_REJECTED', entity: 'Booking BK004', actor: 'Admin (Dean)', timestamp: '2026-10-31T10:55:00Z', details: 'SH-1 unavailable. SH-2 suggested.' },
  { id: 'AL003', action: 'TIMETABLE_GENERATED', entity: 'Weekly Timetable', actor: 'Admin (Dean)', timestamp: '2026-10-28T10:00:00Z', details: '189 sessions, 0 conflicts. Generated in 4.2s.' },
  { id: 'AL004', action: 'MIDSEM_SCHEDULED', entity: 'Midsem Exams', actor: 'Admin (Dean)', timestamp: '2026-10-28T14:30:00Z', details: '41 exams scheduled. 2 conflicts detected.' },
  { id: 'AL005', action: 'SPECTRA_APPROVED', entity: 'SP002 Cultural Night', actor: 'Admin (Dean)', timestamp: '2026-10-25T09:00:00Z', details: 'AUD-1 reserved for annual cultural night.' },
  { id: 'AL006', action: 'FACULTY_UNAVAILABILITY', entity: 'F018 Dr. Nalini Srinivas', actor: 'Dr. Nalini Srinivas', timestamp: '2026-10-29T17:00:00Z', details: 'Research visit leave: Oct 31 - Nov 5.' },
  { id: 'AL007', action: 'DISRUPTION_REPORTED', entity: 'D001 Prof. Patel Leave', actor: 'System', timestamp: '2026-10-30T14:00:00Z', details: '6 sessions affected. Repair proposed.' },
  { id: 'AL008', action: 'DATASET_IMPORTED', entity: 'CIT Dataset v2.1', actor: 'Admin (Dean)', timestamp: '2026-10-27T09:00:00Z', details: 'Imported 27 rooms, 40 faculty, 14 groups, 62 courses.' },
  { id: 'AL009', action: 'BOOKING_SUBMITTED', entity: 'Booking BK001', actor: 'Aryan Mehta (Club Rep)', timestamp: '2026-10-28T16:00:00Z', details: 'Robotics workshop room request submitted.' },
  { id: 'AL010', action: 'SPECTRA_REJECTED', entity: 'SP005 Photography Exhibition', actor: 'Admin (Dean)', timestamp: '2026-10-20T10:00:00Z', details: 'SH-2 needed for makeup classes. OD-3 suggested.' },
];

export const DEMO_ACCOUNTS = [
  {
    id: 'demo-admin',
    name: 'Dr. Pramod Mishra',
    email: 'pramod.mishra@cit.ac.in',
    role: 'admin',
    designation: 'Dean of Academic Affairs',
    dept: 'Administration',
    avatar: 'PM',
    color: 'bg-blue-600',
  },
  {
    id: 'demo-coordinator',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@cit.ac.in',
    role: 'coordinator',
    designation: 'Department Coordinator, CSE',
    dept: 'CSE',
    avatar: 'PS',
    color: 'bg-teal-600',
  },
  {
    id: 'demo-faculty',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@cit.ac.in',
    role: 'faculty',
    designation: 'Professor, CSE',
    dept: 'CSE',
    avatar: 'RK',
    color: 'bg-indigo-600',
  },
  {
    id: 'demo-club',
    name: 'Aryan Mehta',
    email: 'aryan.mehta@cit.ac.in',
    role: 'club',
    designation: 'Club Representative, Robotics Club',
    dept: 'CSE (3rd Year)',
    avatar: 'AM',
    color: 'bg-purple-600',
  },
  {
    id: 'demo-student',
    name: 'Rahul Sharma',
    email: 'student.y1a@cit.edu',
    role: 'student',
    designation: 'B.Tech Student, CSE (Cohort Y1-A)',
    dept: 'CSE',
    avatar: 'RS',
    color: 'bg-emerald-600',
  },
];

export const ANALYTICS = {
  roomUtilisation: [
    { name: 'Academic Block A', utilisation: 78, rooms: 6 },
    { name: 'Academic Block B', utilisation: 65, rooms: 5 },
    { name: 'CS & IT Block', utilisation: 85, rooms: 3 },
    { name: 'Electronics Block', utilisation: 70, rooms: 2 },
    { name: 'Mech Workshop', utilisation: 45, rooms: 1 },
    { name: 'Auditorium', utilisation: 30, rooms: 2 },
    { name: 'Outdoor', utilisation: 20, rooms: 3 },
  ],
  weeklyLoad: [
    { day: 'Mon', sessions: 38, utilisation: 76 },
    { day: 'Tue', sessions: 42, utilisation: 84 },
    { day: 'Wed', sessions: 35, utilisation: 70 },
    { day: 'Thu', sessions: 40, utilisation: 80 },
    { day: 'Fri', sessions: 34, utilisation: 68 },
  ],
  sessionTypes: [
    { name: 'Lecture', value: 120, color: '#3B82F6' },
    { name: 'Tutorial', value: 35, color: '#14B8A6' },
    { name: 'Lab', value: 34, color: '#8B5CF6' },
  ],
  conflictTrend: [
    { week: 'Wk 40', conflicts: 3 },
    { week: 'Wk 41', conflicts: 1 },
    { week: 'Wk 42', conflicts: 5 },
    { week: 'Wk 43', conflicts: 2 },
    { week: 'Wk 44', conflicts: 0 },
  ],
  bookingsByRole: [
    { role: 'Faculty', count: 45, color: '#6366F1' },
    { role: 'Dept Coord', count: 28, color: '#14B8A6' },
    { role: 'Club Rep', count: 62, color: '#8B5CF6' },
    { role: 'Admin', count: 15, color: '#3B82F6' },
  ],
};

export const AI_SUGGESTIONS = [
  'Find me a room for 60 students tomorrow afternoon',
  'When is A-301 free this week?',
  'Reschedule my OS lecture from Monday to Wednesday',
  'Show me available labs for Friday morning',
  'I need an accessible room for a seminar with 100 attendees',
  'What rooms are available for a 3-hour lab session?',
];

export const PRIORITY_RULES = [
  { priority: 1, category: 'exam', label: 'Examinations (P1)', description: 'Midsem / Endsem examinations (Absolute priority, non-displaceable)', color: 'text-rose-400', bg: 'bg-rose-500/20' },
  { priority: 2, category: 'regular_session', label: 'Regular Classes (P2)', description: 'Curricular academic sessions & scheduled laboratory classes', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { priority: 3, category: 'institute_event', label: 'Institute Events (P3)', description: 'Institutional symposiums sanctioned by Dean/Admin (Admin Cap)', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { priority: 4, category: 'guest_lecture', label: 'Guest Lectures (P4)', description: 'Invited faculty talks & research workshops (Faculty Cap)', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { priority: 5, category: 'department_event', label: 'Department Events (P5)', description: 'Departmental seminars & branch meetings (Coordinator Cap)', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  { priority: 6, category: 'club_event', label: 'Club Events (P6)', description: 'Student club activities, Spectra fest competitions (Club Cap)', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
];
