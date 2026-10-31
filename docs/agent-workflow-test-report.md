# CITRIX — Agent Workflow Test Report

**Test Suite:** `tests/test_agent_scenarios.py`  
**Execution Environment:** Python 3.14 / FastAPI TestClient  
**Total Scenarios Tested:** 3 Multi-Step Workflows  
**Result:** 3 Passed (100% Pass Rate)

---

## 1. Scenario A — Room Booking Workflow

### Workflow Objective:
A student club representative searches for venue availability, requests a booking, receives a structured proposal requiring confirmation, confirms the action, and inspects the created record.

```mermaid
sequenceDiagram
    autonumber
    actor Club as Coding Club Rep
    participant AI as CITRIX Assistant (/chat)
    participant Tool as Tool Registry
    participant Backend as Backend Booking Engine
    participant DB as Relational Database

    Club->>AI: "Is CS-LAB-1 free on Thursday from period 6 to 9?"
    AI->>Tool: execute("lookup_room_availability", room_id="CS-LAB-1", day="THU")
    Tool-->>AI: { free_periods: [6,7,8,9], occupied_periods: {} }
    AI-->>Club: "Availability for CS-LAB-1 on THU: Free periods P6-P9..."

    Club->>AI: "Please book CS-LAB-1 on Thursday from period 6 to 9 for 45 students..."
    AI->>Tool: execute("propose_booking_request", ...)
    Tool-->>AI: { requires_confirmation: true, proposal: { ... } }
    AI-->>Club: "I have prepared your booking proposal... Please confirm to officially submit."

    Club->>Backend: POST /confirm-action { action_type: "create_booking", confirmed: true }
    Backend->>DB: INSERT INTO booking_requests (status: "pending")
    Backend-->>Club: { status: "created", booking_id: "BR-26" }

    Club->>AI: "What is the status of booking BR-26?"
    AI->>Tool: execute("lookup_booking_status", booking_id="BR-26")
    Tool-->>AI: { status: "pending", title: "..." }
    AI-->>Club: "Booking Request BR-26 is currently PENDING..."
```

**Verification Results:**
- Availability check latency: **2.15 ms**.
- State-change gate enforced: Direct chat did **not** insert records until `/confirm-action` was invoked.
- Role category cap applied: Request automatically capped to `club_event`.

---

## 2. Scenario B — Timetable & Scheduling Explanation Workflow

### Workflow Objective:
A user asks why course `CS201` is scheduled in its specific slot, requiring the assistant to retrieve the session, evaluate applicable constraints, and explain the assignment without hallucination.

**Trace Log:**
- User query: *"Explain why CS201 is scheduled in this slot and what constraints apply?"*
- Tool executed: `lookup_timetable` + session constraint evaluator.
- Citations retrieved: `DOC-SCHED-01` (CIT Academic Scheduling Policy).
- Generated explanation:
  - References Session ID `CS201-ALL-L1` (kind: lecture).
  - Asserts compliance with Faculty daily teaching limit ($4\text{ hours}$ / Hard Constraint H11).
  - Confirms room type and capacity compatibility.
  - Explains absence of student group clashes and lunch-hour adherence.

---

## 3. Scenario C — Scheduling Disruption Workflow

### Workflow Objective:
A faculty member reports an emergency leave for faculty member `F07`, the assistant identifies affected sessions, prepares a disruption proposal, submits confirmation, and an administrator approves it.

**Trace Log:**
1. Faculty prompt: *"Faculty F07 is on emergency sick leave next Monday. What sessions are affected and propose rescheduling?"*
2. Assistant identifies 2 scheduled sessions belonging to `F07` on Monday.
3. Generates proposal with `requires_confirmation: True`.
4. User confirms via `POST /confirm-action`.
5. Backend creates Disruption record `#1` with status `pending_approval`.
6. Dean approves via `POST /api/v1/reschedule/1/approve` (honoring No Self-Approval).
7. Verified validator check on updated timetable.
