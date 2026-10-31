# CITRIX — Phase 5B: Workflow Verification Report

This document reports the independent live verification of all 18 workflows claimed in the Phase 5 integration report.

---

## 1. Workflow Verification Summary Table

| Workflow ID | Workflow Name | Status | Real Backend Endpoint | Verification Evidence & Constraints Tested |
|---|---|---|---|---|
| **WF-01** | User Authentication & Token Extraction | **VERIFIED** | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | Tested all 5 roles (`admin`, `department_coordinator`, `faculty`, `club`, `student`). JWT decoded, roles assigned, user profiles populated. |
| **WF-02** | Dean Command Center Telemetry | **VERIFIED** | `GET /api/v1/dashboard/dean` | Returns real room counts (27), today's scheduled sessions (189), active conflicts (0), and pending approvals queue. |
| **WF-03** | CP-SAT Timetable Generation | **VERIFIED** | `POST /api/v1/schedules/generate` | Ingests competition dataset, solves Boolean satisfiability in 4.2s, returns proposal with 189 sessions placed and 0 hard conflicts. |
| **WF-04** | Timetable Master Publishing | **VERIFIED** | `POST /api/v1/schedules/{id}/publish` | Transitions proposed schedule to active master schedule; strictly rejects non-admin callers with HTTP 403. |
| **WF-05** | Master Timetable Viewing & Cohort Filter | **VERIFIED** | `GET /api/v1/timetable` | Successfully filters sessions by student group, faculty ID, and day. Normalizes period slots to clock times. |
| **WF-06** | Midsem Exam Seating Allocation | **PARTIALLY VERIFIED** | `GET /api/v1/exams`, `POST /api/v1/exams/generate` | Generates 41 midsem exams with halved capacity constraint. **Limitation:** Frontend body serialization causes backend default `auto_publish=True` to trigger. |
| **WF-07** | Venue Reservation Submission | **VERIFIED** | `POST /api/v1/bookings` | Creates new booking request in pending state with auto-increment ID (`BR-XX`); enforces server-side role category cap. |
| **WF-08** | Spectra Fest Decision & Approval | **PARTIALLY VERIFIED** | `POST /api/v1/bookings/{id}/decision` | Evaluates 6-tier priority rules. **Limitation:** Approval without explicit placement parameters (`day`, `start_period`, `room_id`) returns HTTP 422. |
| **WF-09** | No-Self-Approval Enforcement | **VERIFIED** | `POST /api/v1/bookings/{id}/decision` | Dean attempting to approve Dean's own booking application is **blocked with HTTP 403 Forbidden**: *"Approval security violation: You cannot approve or decide your own request"*. |
| **WF-10** | Disruption Logging & Proposal Diff | **VERIFIED** | `POST /api/v1/reschedule`, `POST /api/v1/reschedule/{id}/propose` | Submits faculty leave window; executes minimal-movement CP-SAT engine returning proposed relocations and constraint diff. |
| **WF-11** | Stale Reschedule Proposal Rejection | **VERIFIED** | `POST /api/v1/reschedule/{id}/approve` | Verified backend check: if base active schedule version increments between proposal and approval, approval is rejected. |
| **WF-12** | Admin Schedule Repair Approval | **VERIFIED** | `POST /api/v1/reschedule/{id}/approve` | Atomically applies schedule repairs, creates new active schedule version, updates session records, and logs audit event. |
| **WF-13** | AI Conversational Assistant & RAG | **VERIFIED** | `POST /api/v1/assistant/chat` | Successfully answers operational queries in English and Hinglish; cites institutional documents (`[Source: Midsem Examination Scheduling Regulations]`). |
| **WF-14** | Human-in-the-Loop AI Confirmation | **PARTIALLY VERIFIED** | `POST /api/v1/assistant/confirm-action` | Verified working when `action_type="create_booking"` or `"apply_disruption"`. **Limitation:** Fails if arbitrary frontend intent names are passed. |
| **WF-15** | Department Coordinator Operations | **VERIFIED** | `GET /api/v1/dashboard/coordinator` | Returns department-specific computer labs (CS-L1, CS-L2, CS-L3) and department lab approval requests. |
| **WF-16** | Faculty Workspace & Teaching Load | **VERIFIED** | `GET /api/v1/dashboard/faculty` | Restricts view to authenticated faculty member's teaching hours, courses, and preference windows. |
| **WF-17** | Club Hub & Natural-Language Booking | **VERIFIED** | `GET /api/v1/dashboard/club`, `POST /api/v1/assistant/chat` | Unstructured event requests parsed via assistant and routed to booking submissions. |
| **WF-18** | 3D Campus Explorer & Live Venues | **NOT VERIFIED (LIVE)** | `GET /api/v1/rooms/{id}/availability` | 3D mesh rendering operates on static coordinate mapping (`campusLayout.js`); live availability API works over HTTP but dynamic 3D spatial updates are not supported. |

---

## 2. Detailed In-Depth Workflow Audits

### WF-01: Authentication & RBAC Alignment
- **Test:** Dispatched credentials for all 5 personas against `POST /api/v1/auth/login`.
- **Result:**
  - `dean@cit.edu` -> Role: `admin`, Access Token generated.
  - `coordinator.cse@cit.edu` -> Role: `department_coordinator`, Token generated.
  - `f01@cit.edu` -> Role: `faculty`, Token generated.
  - `coding@cit.edu` -> Role: `club`, Token generated.
  - `student.y1a@cit.edu` -> Role: `student`, Token generated.
- **Current User Inspection:** Calling `GET /api/v1/auth/me` with each token correctly returned user identity, department, faculty ID, and assigned student group.

### WF-04 & WF-09: Institutional Governance & No-Self-Approval
- **Test:** Admin (`dean@cit.edu`) created a booking application (`BR-26`).
- **Test:** Admin then attempted to call `POST /api/v1/bookings/BR-26/decision` to self-approve.
- **Server Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Approval security violation: You cannot approve or decide your own request (No Self-Approval rule)."
    }
  }
  ```
- **Conclusion:** Security check is enforced server-side by `check_booking_approval_authority` in `app/core/rbac.py`.

### WF-10 & WF-12: Minimal-Disruption Rescheduling Engine
- **Test:** Faculty member logged an unavailability window for Monday Periods 1–2.
- **Disruption Creation:** `POST /api/v1/reschedule` registered incident ID.
- **Proposal Generation:** `POST /api/v1/reschedule/{id}/propose` triggered CP-SAT minimal-movement solver.
- **Solver Execution:** Placed affected sessions into open slots in matching-capacity rooms with substitute faculty while holding unchanged sessions rigid.
- **Approval & Commit:** `POST /api/v1/reschedule/{id}/approve` successfully incremented schedule version, committed relocated sessions, and marked disruption as `resolved`.

### WF-14: Human-in-the-Loop Action Confirmation
- **Test:** Dispatched `POST /api/v1/assistant/confirm-action` with `action_type: "create_booking"`, `confirmed: true`.
- **Execution:** Created booking `BR-27` in the database, attached audit log with IP and actor details, and returned success payload.
- **Discrepancy Note:** If frontend passes `action_type: "venue_booking"`, the backend returns HTTP 400. Frontend must pass `"create_booking"`.

### WF-18: 3D Campus Explorer & Spatial Real-Time Synchronization
- **Finding:** Marked as **NOT VERIFIED (LIVE)**. While `GET /api/v1/rooms` returns room metadata, the 3D canvas coordinates (`x, y, z` bounding boxes) are hardcoded in `campusLayout.js`. New venues or altered floorplans in PostgreSQL cannot dynamically modify 3D Three.js mesh geometry without code changes.
