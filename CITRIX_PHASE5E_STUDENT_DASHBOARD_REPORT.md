# CITRIX Phase 5E — Student Dashboard & Cohort Experience Report

**System:** CITRIX CampusOS Intelligence  
**Author:** Team Delta X  
**Date:** November 1, 2026  
**Status:** IMPLEMENTED & VERIFIED  
**Findings Addressed:** UI-01 (Student Navigation Missing), UI-02 (Student Dashboard Missing), UX-01 (Student Persona Missing)  

---

## 1. Executive Summary

Phase 5D acceptance audit identified that while CITRIX backend fully supports a dedicated 5th role (`RoleEnum.STUDENT`), the frontend lacked:
1. A student landing dashboard (`UI-02`).
2. Role-specific navigation for students, causing fallback to club menus (`UI-01`).
3. A student persona in the quick demo selector (`UX-01`).

In Phase 5E, Team Delta X implemented the end-to-end Student experience in `frontend-1/citrix`:
- **Created** `StudentDashboard.jsx` integrating real backend data from `GET /api/v1/dashboard/student`.
- **Configured** dedicated student navigation in `AppShell.jsx` exposing only student-appropriate destinations.
- **Added** Student persona `demo-student` (`student.y1a@cit.edu` / `password123`) to `demoData.js`, `authStore.js`, `LoginPage.jsx`, and `AppShell.jsx`.

---

## 2. Component Architecture & Endpoints

### 2.1 Component Location & Structure
- **Component:** `frontend-1/citrix/src/features/student/StudentDashboard.jsx`
- **Route:** `/student` (Guarded by `<RoleGuard allowedRoles={['student']} />`)

### 2.2 Consumed Backend Endpoints
1. **Primary Dashboard Data:**
   - **Endpoint:** `GET /api/v1/dashboard/student`
   - **Authorization:** `Bearer <student_token>` (Permission: `DASHBOARD_STUDENT`)
   - **Payload Received:**
     - `student_name`: string (e.g. "Rahul Sharma (Y1 Section A)")
     - `student_group`: string (e.g. "Y1-A")
     - `department`: string (e.g. "COMMON")
     - `total_registered_courses`: int
     - `weekly_sessions_count`: int
     - `exams_count`: int
     - `exams`: list of scheduled midsem exams (`exam_id`, `courses`, `day`, `session`, `rooms`)
     - `campus_events`: list of sanctioned fest/Spectra events (`title`, `day`, `room`, `start_period`)
2. **Cohort Sessions:**
   - **Service:** `timetableService.getSessions({ group: student_group })`
   - **Endpoint:** `GET /api/v1/timetable?group_id=<student_group>`
   - **Payload Received:** Weekly sessions scheduled specifically for the student's cohort.

---

## 3. UI Features & Visual Hierarchy

The student dashboard adheres 100% to the CITRIX dark-mode design system (`#070B14` canvas, slate glassmorphic cards, emerald accent colors representing the student portal):

### 3.1 Header & Cohort Identification
- Displays student name, enrolled cohort badge (`Cohort: Y1-A`), department, and academic year.
- Quick navigation buttons to `3D Campus Map` and `Full Timetable`.

### 3.2 High-Level Metric Cards
- **Enrolled Cohort:** Displays cohort identifier (e.g., `Y1-A`) with curriculum badge.
- **Registered Courses:** Number of active curricular subjects for this semester.
- **Weekly Classes:** Total count of weekly lectures, tutorials, and laboratory sessions.
- **Midsem Exams:** Count of upcoming midsem examination slots.

### 3.3 Today's Classes & Dynamic Day Filtering
- Detects the current client day of week (`Monday` through `Sunday`).
- Filters cohort sessions scheduled for today:
  - Displays Period badge (e.g., `P1`, `P2`), course code/name, lecture/lab type.
  - Start/end time slot (e.g., `08:30 - 09:30`).
  - Allocated classroom/hall with 1-click **Locate** button linking to the 3D Campus Explorer.
  - Assigned faculty instructor.
- **Zero-Mock Empty State:** If no classes are scheduled (e.g. weekends or free days), displays a clean `EmptyState` explaining that no sessions are active, with a direct link to the weekly timetable.

### 3.4 Midsem Examination Roster
- Visual breakdown of midsem examinations scheduled by the CP-SAT engine.
- Course code, examination day, session/slot, and allocated hall/room.
- If no exams are scheduled, displays a dedicated empty state banner.

### 3.5 Campus & Spectra Events
- Lists approved fest and symposium activities scheduled during Spectra week.
- Displays event name, assigned room/auditorium, and scheduled period.

### 3.6 Error & Loading States
- **Loading State:** Centered animated `Spinner` with loading status message.
- **Error State:** Prominent alert container displaying the exact error message with an interactive `Retry Connection` button that re-triggers data synchronization.
- **Mock Fallback Removal:** No simulated mock data is injected. Only genuine backend data is rendered.

---

## 4. Student Navigation Specification (`AppShell.jsx`)

Under finding `UI-01`, students previously inherited the club representative menu. In Phase 5E, a dedicated navigation block was implemented:

### Allowed Student Navigation Items:
1. **My Dashboard:** `/student` (Icon: `LayoutDashboard`)
2. **3D Campus Map:** `/campus` (Icon: `Boxes`, highlighted)
3. **My Timetable:** `/timetable/weekly` (Icon: `CalendarDays`)
4. **Examinations:** `/timetable/daily` (Icon: `CalendarRange`)
5. **AI Campus Assistant:** `/assistant` (Icon: `Sparkles`, highlighted)
6. **Room Directory:** `/rooms` (Icon: `Building`)
7. **Notifications:** `/notifications` (Icon: `Bell`)

### Explicitly Excluded Administrative & Club Menus:
- ❌ Timetable Generation Workspace (`/admin/timetable/generate`)
- ❌ Midsem Solver Console (`/admin/midsem`)
- ❌ Spectra Allocation Manager (`/admin/spectra`)
- ❌ Disruption & Repair Engine (`/admin/disruptions`)
- ❌ Schedule Diff & Compare (`/admin/timetable/compare`)
- ❌ Approvals Queue (`/approvals`)
- ❌ Natural Language Venue Booking (`/bookings/new/nl`)
- ❌ Manual Booking Forms (`/bookings/new`)
- ❌ Audit Log Trail (`/admin/audit`)
- ❌ Dataset Import/Export (`/admin/data`)

---

## 5. Student Persona & Quick-Login Integration

Under finding `UX-01`, the 5th role persona was added across the client authentication layer:

- **Persona ID:** `demo-student`
- **Name:** Rahul Sharma
- **Email:** `student.y1a@cit.edu`
- **Password:** `password123`
- **Role:** `student`
- **Designation:** `B.Tech Student, CSE (Cohort Y1-A)`
- **Department:** `CSE`
- **Cohort:** `Y1-A`
- **Color Accent:** `bg-emerald-600` (Emerald Green)
- **Login Card Tag:** "Cohort Timetable & Exams"
- **AppShell Role Switcher:** Included as `Student (Cohort Y1-A)` with instant persona switching.
- **LoginPage Route Mapping:** Automatically routes to `/student` upon authentication.
