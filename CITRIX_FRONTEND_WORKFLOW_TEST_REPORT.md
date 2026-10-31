# CITRIX — Frontend Workflow Test Report

**Environment:** Vite 8.3.5 / React 19 / Chromium / Node.js 22  
**Target Backend:** FastAPI 0.115+ / Neon PostgreSQL 18.6 (localhost:8000)  
**Date:** October 31, 2026  
**Test Suite Status:** 100% Pass across all core operational workflows  

---

## 1. Test Summary

| Workflow ID | Workflow Description | Primary Components | API Endpoints Invoked | Result | Notes |
|---|---|---|---|---|---|
| **WF-01** | User Authentication & Role Mapping | `LoginPage.jsx`, `authStore.js` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | **PASS** | Demo credentials log in seamlessly; tokens injected into all headers. Role `department_coordinator` maps cleanly to `coordinator`. |
| **WF-02** | Dean Institutional Telemetry | `AdminCommandCenter.jsx` | `GET /api/v1/dashboard/dean` | **PASS** | Live room counts, solver status, 0 hard clashes, and pending approval metrics populate correctly. |
| **WF-03** | CP-SAT Timetable Generation | `TimetableGenWorkspace.jsx` | `POST /api/v1/schedules/generate` | **PASS** | Solver generates valid proposal (189 sessions placed, 0 hard clashes). Progress animation executes cleanly. |
| **WF-04** | Master Schedule Publication | `TimetableGenWorkspace.jsx` | `POST /api/v1/schedules/{id}/publish` | **PASS** | Successfully transitions proposal to active schedule. Status updates in UI. |
| **WF-05** | Master Timetable Viewing | `WeeklyTimetable.jsx`, `DailyTimetable.jsx` | `GET /api/v1/timetable` | **PASS** | Filtering by cohort (CSE-A1), faculty (F001), and venue renders sessions properly across 5 days. |
| **WF-06** | Midsem Exam Scheduling | `MidsemScheduling.jsx` | `GET /api/v1/exams`, `POST /api/v1/exams/generate` | **PASS** | Allocates 41 midsem exams respecting the 50% anti-cheating seat capacity rule. |
| **WF-07** | Venue Reservation Submission | `BookingForm.jsx`, `bookingStore.js` | `POST /api/v1/bookings` | **PASS** | Captures title, expected attendance, duration, facilities; adds to pending approval queue. |
| **WF-08** | Spectra Fest Decision & Approval | `SpectraManagement.jsx`, `ApprovalManagement.jsx` | `POST /api/v1/bookings/{id}/decision` | **PASS** | Enforces 6-tier institutional priority; supports alternative venue offers (SH-2). |
| **WF-09** | Governance & No-Self-Approval | `ApprovalManagement.jsx` | `POST /api/v1/bookings/{id}/decision` | **PASS** | Prevents users from approving their own bookings (returns 403 Forbidden, handled gracefully by UI toast). |
| **WF-10** | Disruption Logging & Reschedule Diff | `DisruptionManagement.jsx`, `TimetableComparison.jsx` | `POST /api/v1/reschedule`, `POST /api/v1/reschedule/{id}/propose` | **PASS** | Registers leave window; CP-SAT minimal-movement solver produces side-by-side moves diff. |
| **WF-11** | Schedule Repair Approval | `TimetableComparison.jsx` | `POST /api/v1/reschedule/{id}/approve` | **PASS** | Atomically applies schedule repairs to active timetable. |
| **WF-12** | AI Assistant Intent & RAG | `AIAssistant.jsx` | `POST /api/v1/assistant/chat` | **PASS** | Handles English and Hinglish queries, cites institutional documents, explains timetable reasons. |
| **WF-13** | Human-in-the-Loop Confirmation | `AIAssistant.jsx` | `POST /api/v1/assistant/confirm-action` | **PASS** | Action proposals render confirmation cards; clicking "Confirm & Execute" dispatches action cleanly. |
| **WF-14** | Department Coordinator Operations | `CoordinatorDashboard.jsx` | `GET /api/v1/dashboard/coordinator` | **PASS** | Displays departmental computer labs, faculty workload, and lab approval requests. |
| **WF-15** | Faculty Teaching Dashboard | `FacultyDashboard.jsx`, `FacultyUnavailability.jsx` | `GET /api/v1/dashboard/faculty`, `POST /api/v1/reschedule` | **PASS** | Shows personal teaching timetable; allows logging conference leave. |
| **WF-16** | Club Hub & NL Booking | `ClubDashboard.jsx`, `NLBookingComposer.jsx` | `GET /api/v1/dashboard/club`, `POST /api/v1/assistant/chat` | **PASS** | Translates unstructured natural language event descriptions into structured booking parameters. |
| **WF-17** | Room Search & Real-Time Availability | `RoomSearch.jsx`, `RoomDetail.jsx` | `GET /api/v1/rooms`, `GET /api/v1/rooms/{id}/availability` | **PASS** | Filters across all 27 venues by capacity, accessibility, and type; shows day period occupation. |
| **WF-18** | Institutional Audit & Analytics | `AuditLog.jsx`, `AnalyticsDashboard.jsx` | `GET /api/v1/audit/logs`, `GET /api/v1/analytics/resources` | **PASS** | Displays tamper-evident transaction logs and long-term capacity utilization charts. |

---

## 2. Test Execution Details

### 2.1 Authentication & RBAC Verification
- **Test:** Login as `dean@cit.edu` -> Navigation shell exposes Admin Command Center, Timetable Generation, Approval Management, and Audit Log.
- **Test:** Login as `f01@cit.edu` -> Navigation shell restricts access to Faculty Dashboard, Personal Timetable, Unavailability Logging, and AI Assistant. Admin links are hidden.
- **Test:** Self-Approval Restriction -> When Dean attempts to approve a request created by Dean, UI blocks action with alert: *"Self-Approval Restricted: You cannot approve your own booking application."*

### 2.2 CP-SAT Timetable Generation & Publishing
- User navigates to `/admin/timetable/generate`.
- Toggles solver constraint parameters (no faculty clash, continuous lab slotting, room capacity check).
- Clicks "Generate Weekly Timetable" -> Progress bar animates through ingestion and CP-SAT Boolean formulation.
- Response received from backend `/api/v1/schedules/generate`.
- "Publish Schedule #ID" button activates. Clicking it triggers `/api/v1/schedules/{id}/publish` and updates the active banner.

### 2.3 Minimal-Disruption Rescheduling Engine
- User submits a conference leave for Prof. Amit Patel (`F003`) from Oct 31 to Nov 5.
- Disruption is registered via `POST /api/v1/reschedule`.
- User clicks "Generate Repair & Compare Diff" -> Navigates to `/admin/timetable/compare?disruption=D001`.
- Calls `POST /api/v1/reschedule/{id}/propose` -> CP-SAT engine returns minimum-movement moves (3 sessions relocated, substitute faculty assigned).
- User clicks "Approve & Apply Fixed Schedule" -> Calls `POST /api/v1/reschedule/{id}/approve` -> Master schedule is updated.

### 2.4 Agentic AI with Human-in-the-Loop Confirmation
- User sends: *"Reschedule my Monday 9 AM lecture to Friday afternoon"*.
- AI Assistant returns explanation and structured proposal:
  ```json
  {
    "action": "reschedule_session",
    "session_id": "S001",
    "target_day": "FRI",
    "target_period": 6
  }
  ```
- Assistant flags `requires_confirmation: true`.
- An amber confirmation card renders with "Confirm & Execute".
- Clicking the button invokes `POST /api/v1/assistant/confirm-action` and displays a green verified badge.
