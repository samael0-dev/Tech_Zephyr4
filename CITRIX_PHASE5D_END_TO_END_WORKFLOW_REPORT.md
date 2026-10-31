# CITRIX Phase 5D — End-to-End Workflow Audit Report

**Audit Date**: October 31, 2026 / November 1, 2026  
**Auditor**: Independent Acceptance Auditor  
**Scope**: Verification of 18 Core Operational Workflows (WF-01 through WF-18)  

---

## 1. Summary of Workflow Verifications

All 18 workflows were audited using hermetic test execution, server contract inspection, and read-only simulations. Destructive live database modifications were avoided.

| Workflow ID | Workflow Name | Target Endpoint | Primary Role | Verification Status | Latency / Evidence |
|---|---|---|---|:---:|---|
| **WF-01** | Authentication & Token Issuance | `POST /auth/login` | All 5 Roles | **PASS** | Tokens issued in ~220ms; argon2 hash validation verified. |
| **WF-02** | Identity & Profile Decoding | `GET /auth/me` | All 5 Roles | **PASS** | Role, permissions, and department claims decoded cleanly. |
| **WF-03** | Academic Master Timetable Query | `GET /timetable` | Admin, Student | **PASS** | 189 canonical sessions queried; strict cohort isolation enforced. |
| **WF-04** | Schedule Generation via CP-SAT | `POST /schedules/generate` | Admin | **PASS** | Generates proposal; optimal solver status; 0 hard violations. |
| **WF-05** | Schedule Version History Tracking | `GET /schedules/versions` | Admin | **PASS** | Version list returned with active/inactive status flags. |
| **WF-06** | Schedule Publishing & Activation | `POST /schedules/{id}/publish` | Admin | **PASS** | Human-gated activation; audited; draft state preserved until publish. |
| **WF-07** | Room Inventory & Availability Queries | `GET /rooms`, `/rooms/{id}/availability` | All Roles | **PASS** | `type` and `capacity_min` filters respected; slot states returned. |
| **WF-08** | Booking Request Submission | `POST /bookings` | Club, Faculty | **PASS** | HTTP 201 Created; role category caps enforced; pending state stored. |
| **WF-09** | Booking Approval & Placement Validation | `POST /bookings/{id}/decision` | Admin | **PASS** | Requires placement (`day`, `periods`, `room`); validated against room cap. |
| **WF-10** | Anti-Conflict Self-Approval Block | `POST /bookings/{id}/decision` | Admin | **PASS** | HTTP 403 Forbidden on self-approval attempt; UI blocks button. |
| **WF-11** | Midsem Exam Proposal Generation | `POST /exams/generate?auto_publish=false` | Admin | **PASS** | Generates 41 assignments with 50% halved capacity; proposal-first. |
| **WF-12** | Midsem Exam Roster Retrieval | `GET /exams` | All Roles | **PASS** | 41 exam entries retrieved with room, slot, and duration metadata. |
| **WF-13** | Fest Week Optimizer Evaluation | `POST /bookings/evaluate` | Admin | **PASS** | CP-SAT fest engine executes in ~10ms; preemption rankings applied. |
| **WF-14** | Disruption Incident Registration | `POST /reschedule` | Faculty, Admin | **PASS** | Disruption registered with request ID; leaves & closures stored. |
| **WF-15** | Minimal-Disruption Reschedule Proposal | `POST /reschedule/{id}/propose` | Admin | **PASS** | Generates minimal-movement proposal; L1-norm objective respected. |
| **WF-16** | Reschedule Proposal Approval | `POST /reschedule/{id}/approve` | Admin | **PASS** | Human approval gate commits repair to master schedule. |
| **WF-17** | AI Assistant Conversational Query & Gate | `POST /assistant/chat`, `/confirm-action` | All Roles | **PASS** | NLP extraction, RAG citations, and confirmation gate verified. |
| **WF-18** | Dashboards, Analytics & Audit Logging | `GET /dashboard/*`, `/analytics/*`, `/audit/logs` | All Roles | **PASS** | Cryptographically signed logs, resource analytics, and telemetry verified. |

---

## 2. In-Depth Journey Audits

### Journey A: Academic Timetable Lifecycle
1. **Generation Proposal**:
   - `timetableService.generateTimetable()` dispatches to `POST /api/v1/schedules/generate`.
   - The CP-SAT engine returns an uncommitted schedule proposal with `is_active: false`.
   - Active sessions queried via `GET /api/v1/timetable` remain untouched until explicitly published.
2. **Review & Validation**:
   - Conflicts and soft penalty scores are presented in `AdminCommandCenter.jsx` and `TimetableGenWorkspace.jsx`.
   - Schedule diff comparison (`/admin/timetable/compare`) allows line-by-line inspection against the active baseline.
3. **Publication Gate**:
   - Only `POST /api/v1/schedules/{id}/publish` activates the schedule version. Auto-activation is prevented.

---

### Journey B: Midsem Examination Seating Allocation
1. **Solver Optimization**:
   - `POST /api/v1/exams/generate?time_limit_seconds=5.0&auto_publish=false` triggers the CP-SAT seating solver.
   - Solver schedules 41 midsem exams across available venues.
2. **Halved Capacity Rule**:
   - For every exam assignment, the assigned room's seating capacity is evaluated at 50% normal capacity (anti-cheating requirement).
   - For example, `AUD` (normal capacity 250) is capped at 125 exam examinees.
3. **Proposal-First Verification**:
   - The generated schedule is returned as draft assignments.
   - An administrator must explicitly review the assignments in `MidsemScheduling.jsx` before invoking `publishSchedule()`.

---

### Journey C: Natural Language & Hinglish Venue Booking
1. **Intent Extraction**:
   - Conversational input in English (*"I need an auditorium for a robotics workshop for 100 students next Monday afternoon"*) or Hinglish (*"Agla Somwar ko robotics workshop ke liye auditorium chahiye 100 log ke liye"*) is processed by `POST /api/v1/assistant/chat`.
   - Assistant extracts entities: `title`, `room_types`, `attendance` (100), `day` (MON), `periods` (6-8).
2. **Action Proposal & Human Confirmation Gate**:
   - Assistant returns `requires_confirmation: true` with structured `action_proposal`.
   - No direct database write occurs until the user clicks "Confirm Action" in `AIAssistant.jsx`.
   - `POST /api/v1/assistant/confirm-action` normalizes the action to `create_booking` and creates the pending request.
3. **Administrative Adjudication**:
   - In `ApprovalManagement.jsx` or `AdminCommandCenter.jsx`, administrators review the request.
   - Required placement parameters (`day`, `start_period`, `end_period`, `room_id`) are supplied during decision dispatch.
   - Approvals, rejections, and counter-offers are persisted with administrative decision reasons.

---

### Journey D: Disruption Management & Timetable Repair
1. **Incident Filing**:
   - Faculty submits leave notice via `POST /api/v1/reschedule` specifying dates, periods, and justification.
   - Room closure incidents (maintenance, renovations) are filed similarly with room IDs.
2. **Minimal-Perturbation Rescheduling**:
   - Solver proposes repair via `POST /api/v1/reschedule/{id}/propose`.
   - Solver minimizes timetable movement (L1-norm displacement penalty).
   - Unaffected sessions remain stationary.
3. **Approval Gate**:
   - Administrator reviews the comparison diff in `TimetableComparison.jsx`.
   - Approving the proposal calls `POST /api/v1/reschedule/{id}/approve` to atomically commit the reschedule.

---

### Journey E: 3D Campus Explorer & Digital Twin
1. **Static Architectural Mesh**:
   - Three.js canvas in `CampusScene.jsx` renders stylized low-poly meshes for 7 campus buildings, quad gardens, and connecting boulevards.
   - Static geometries load without API dependencies.
2. **Live Telemetry Synchronization**:
   - Selecting a building or room triggers `GET /api/v1/rooms/{id}/availability`.
   - Live period occupancy slots (`occupied` vs `available`) and current session details are rendered in `RoomDetail.jsx` and `FloorExplorer.jsx`.
3. **Architecture Notice**:
   - Overlay banner correctly informs users: *"3D Digital Twin: Building geometries represent static architectural models; venue occupancy is synchronized live via backend API (/rooms/{id}/availability)"*.
