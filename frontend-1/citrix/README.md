# CITRIX — Intelligent Campus Scheduling & Venue Management
### Chilika Institute of Technology (CIT) — Frontend Platform

> **Live Production-Ready Frontend Build**: Built with React 19, Vite, Tailwind CSS, Three.js, React Three Fiber, Framer Motion, and Recharts. Strict frontend-only architecture prepared with an API integration layer ready for CP-SAT solver and backend services.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Node.js 18+ and npm installed.

### 2. Installation & Running Locally
```bash
# Navigate to the citrix project folder
cd /Users/sanskrutiborade/Desktop/winners/citrix

# Start the local development server
npm run dev

# Or build and preview the optimized production build
npm run build
npm run preview
```
Visit `http://localhost:5173` in your browser.

---

## 👥 Instant Demo Roles & Personas

The login screen provides one-click instant authentication cards for the **4 required user roles**:

1. **Admin (Dean's Office)** — *Dr. Pramod Mishra (Dean of Academic Affairs)*
   - Master institutional control, Command Center, Timetable Generator workspace, Midsem exam solver, Spectra event approvals, Disruption & repair diffs, Analytics, and `schedule.json` data export.
2. **Department Coordinator** — *Dr. Priya Sharma (CSE Coordinator)*
   - Department hub, CSE teaching timetable, Lab reservation approvals, department venue bookings.
3. **Faculty** — *Dr. Rajesh Kumar (Professor, CSE)*
   - Personal teaching timetable, 3D campus locator for assigned classrooms, leave/unavailability notice submission, AI rescheduling assistant.
4. **Club Representative** — *Aryan Mehta (Robotics Club Rep)*
   - Natural-language English/Hinglish venue composer, Spectra event application tracker, alternative venue inspector.

*Note: Self-approval prevention is strictly enforced in the UI: nobody can approve their own request.*

---

## 🏛️ Interactive 3D Campus Experience (Priority 1)

Accessible at `/campus`:
- **Believable Engineering College Environment**: Features Academic Block A & B, CS & IT Block, Electronics Block, Mechanical Workshop, Civil Block, Main Auditorium, and Dean's Block.
- **Three.js & React Three Fiber**: Isometric elevated perspective with smooth camera orbit, zoom, pan, and cinematic fly-to transitions when selecting a building.
- **Top-Down Floor Blueprint Explorer (`/campus/:buildingId/floor/:floor`)**:
  - Architectural vector blueprint displaying classrooms as clear geometric spaces.
  - Corridors, walls, stairs, and room doors.
  - Real-time availability color coding: **Emerald** (Available), **Red** (Occupied), **Amber** (Partial), **Slate** (Utility/Admin).
- **2D Architectural Fallback**: Devices without WebGL automatically or manually toggle to a clean 2D architectural campus grid view.
- **Illustrative Layout Label**: Clearly marked *"Illustrative campus layout"* preserving official room IDs without data distortion.

---

## 📱 Complete Screen Inventory (All 28 Required Screens Implemented)

| # | Screen Description | Route | User Role Scope | Status |
|---|---|---|---|---|
| 1 | **Login & Role Selector** | `/login` | All Roles | Complete |
| 2 | **Admin Command Center** (Flagship) | `/admin` | Admin | Complete |
| 3 | **Department Coordinator Dashboard** | `/coordinator` | Coordinator | Complete |
| 4 | **Faculty Dashboard** | `/faculty` | Faculty | Complete |
| 5 | **Club Representative Dashboard** | `/club` | Club Rep | Complete |
| 6 | **Interactive 3D Campus Scene** | `/campus` | All Roles | Complete |
| 7 | **Building Explorer** | `/campus/:buildingId` | All Roles | Complete |
| 8 | **Top-Down Floor Plan Blueprint** | `/campus/:buildingId/floor/:floor` | All Roles | Complete |
| 9 | **Classroom & Lab Details Timeline** | `/campus/:buildingId/floor/:floor/room/:roomId` | All Roles | Complete |
| 10 | **Room Search & Suitability Filter** | `/rooms` | All Roles | Complete |
| 11 | **Smart AI Booking (English/Hinglish)** | `/bookings/new/nl` | Faculty, Club | Complete |
| 12 | **Manual Venue Reservation Form** | `/bookings/new` | All Roles | Complete |
| 13 | **Booking Details & Audit View** | `/bookings/:id` | All Roles | Complete |
| 14 | **Booking History & Status Registry** | `/bookings` | All Roles | Complete |
| 15 | **Weekly Academic Master Timetable** | `/timetable/weekly` | All Roles | Complete |
| 16 | **Daily Chronological Timetable** | `/timetable/daily` | All Roles | Complete |
| 17 | **Timetable Generation Workspace** | `/admin/timetable/generate` | Admin | Complete |
| 18 | **Midsem Examination Scheduling** | `/admin/midsem` | Admin | Complete |
| 19 | **Spectra Event Management & Priorities** | `/admin/spectra` | Admin | Complete |
| 20 | **Faculty Unavailability Form** | `/faculty/unavailability` | Faculty | Complete |
| 21 | **Disruption & Emergency Management** | `/admin/disruptions` | Admin | Complete |
| 22 | **Before-and-After Schedule Diff** | `/admin/timetable/compare` | Admin | Complete |
| 23 | **Approvals & Authorization Queue** | `/approvals` | Admin, Coordinator | Complete |
| 24 | **AI Campus Chat Assistant** | `/assistant` | All Roles | Complete |
| 25 | **Institutional Analytics & Charts** | `/admin/analytics` | Admin | Complete |
| 26 | **Activity & Alerts Notifications** | `/notifications` | All Roles | Complete |
| 27 | **System Audit Trail Log** | `/admin/audit` | Admin | Complete |
| 28 | **Dataset Import & schedule.json Export**| `/admin/data` | Admin | Complete |

---

## 🔌 Backend Integration Guide & API Contract

The frontend uses a service adapter pattern located in `src/services/`. By default, `mockAdapter.js` simulates backend logic and returns demo-labeled fixtures.

### Switching to Live Backend APIs:
In each service file (`src/services/roomService.js`, `timetableService.js`, `bookingService.js`, `examService.js`, `spectraService.js`, `assistantService.js`), change:
```javascript
const USE_MOCK = false; // Set to false to hit the live backend API
```

### Required Backend Endpoints Contract:
| Endpoint | Method | Payload / Parameters | Expected Response |
|---|---|---|---|
| `/api/rooms` | `GET` | `?building=&type=&status=&capacity=` | Array of 27 venue objects |
| `/api/rooms/:id/availability` | `GET` | `?date=YYYY-MM-DD` | Occupied & free timeslots |
| `/api/timetable/generate` | `POST` | `{ constraints, academicWeek }` | Solved sessions array + solver telemetry |
| `/api/exams/generate` | `POST` | `{}` | 41 exams with effective 50% capacity assignments |
| `/api/spectra` | `GET` | `?status=&category=` | 25 Spectra applications |
| `/api/spectra/:id/approve` | `POST` | `{ reason }` | Approved record |
| `/api/spectra/:id/reject` | `POST` | `{ reason, alternativeRoom }` | Rejected record with suggested venue |
| `/api/bookings` | `POST` | `{ title, room, date, startTime, endTime, attendees, purpose }` | Created booking ID |
| `/api/bookings/parse-nl` | `POST` | `{ text }` | Parsed parameters (`date`, `capacity`, `accessible`) |
| `/api/assistant/query` | `POST` | `{ text, context }` | Explainable AI response text + suggested room IDs |
| `/api/disruptions/repair` | `POST` | `{ disruptionId }` | Minimal-perturbation relocated sessions diff |

---

## 🎨 Design System Tokens
- **Theme**: Dark Navy (`#0B1120`, `#070D18`), Charcoal Slate (`#1E293B`, `#0F172A`).
- **Accents**: CIT Blue (`#3B82F6`), Teal (`#14B8A6`), Indigo (`#6366F1`).
- **Status Indicators**: Emerald (`#10B981` Available / Approved), Red (`#EF4444` Occupied / Rejected / Conflict), Amber (`#F59E0B` Partial / Pending).
- **Typography**: Inter for UI prose, JetBrains Mono for timeslots, room codes, and solver logs.
