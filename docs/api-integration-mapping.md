# CITRIX — API Integration Mapping

This document provides the definitive integration contract mapping user conversational intents to backend services, registered tools, database models, and API endpoints.

---

## 1. Intent-to-Tool & Backend Mapping Matrix

| User Intent | Trigger Phrases (English / Hinglish) | Tool Executed | Underlying Backend Service / Endpoint | State-Changing? | Required Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`room_search`** | *"Find an available seminar hall tomorrow"*, *"Kal SH-1 khali hai kya?"* | `lookup_room_availability` | `GET /api/v1/rooms/{id}/availability` | No | All roles |
| **`timetable_lookup`** | *"Show timetable for CSE second year"*, *"Where is my class on Tuesday?"* | `lookup_timetable` | `GET /api/v1/timetable` (with role-based data isolation) | No | All roles |
| **`booking_status`** | *"Why was booking BR-09 rejected?"*, *"Check status of my booking"* | `lookup_booking_status` | `GET /api/v1/bookings/{id}` | No | Requester / Admin |
| **`booking_create`** | *"Book CS-LAB-1 for coding hackathon Thursday 6-9 PM"* | `propose_booking_request` | `POST /api/v1/assistant/confirm-action` -> `POST /api/v1/bookings` | **Yes (Requires Confirmation)** | All roles (Capped by role) |
| **`exam_lookup`** | *"When is the MA101 exam?"*, *"Midsem exam schedule for Y1-A"* | `lookup_exam_schedule` | `GET /api/v1/exams` (filtered by student group) | No | All roles |
| **`conflict_explanation`** | *"Why was CS201 placed in LH-1?"*, *"Explain timetable conflicts"* | `explain_scheduling_conflicts` | `POST /api/v1/schedules/validate` (wraps official `validator.py`) | No | All roles |
| **`dean_summary`** | *"Summarise today's campus operations"*, *"Give Dean briefing"* | `get_dean_operational_intelligence` | `GET /api/v1/assistant/dean-insights` / `GET /api/v1/dashboard/dean` | No | **Admin only** |
| **`reschedule_request`** | *"Faculty F07 is on sick leave next Monday. Reschedule classes"* | `propose_rescheduling_request` | `POST /api/v1/assistant/confirm-action` -> `POST /api/v1/reschedule` | **Yes (Requires Confirmation)** | Faculty / Coord / Admin |
| **`policy_question`** | *"What are the lunch break rules?"*, *"Can faculty teach 6 hours?"* | RAG Search (`retrieve_relevant_knowledge`) | `POST /api/v1/rag/search` (Hybrid Vector Store) | No | All roles (Role filtered) |

---

## 2. Request & Response Schemas

### A. Conversational Chat (`POST /api/v1/assistant/chat`)

#### Request:
```json
{
  "message": "Is SH-1 available on Thursday from period 10 to 12?",
  "session_id": "sess-user-01"
}
```

#### Response (Envelope: `ApiResponse[AgentChatResponse]`):
```json
{
  "success": true,
  "data": {
    "reply": "Availability for venue SH-1 on THU:\n- Capacity: 150 students\n- Free Periods: P10, P11, P12\n- Occupied Periods: 4 periods occupied",
    "intent": "room_search",
    "entities": {
      "day": "THU",
      "room_id": "SH-1",
      "from_period": 10,
      "to_period": 12
    },
    "citations": [
      {
        "source_id": "DOC-ROOMS-03",
        "title": "CIT Venues, Capacities & Permitted Uses Catalog",
        "category": "resource_catalog",
        "page": 1,
        "relevance_score": 3.42,
        "snippet": "Seminar Hall 1 (SH-1): Academic Block A, Capacity 150..."
      }
    ],
    "tool_result": {
      "found": true,
      "room_id": "SH-1",
      "capacity": 150,
      "free_periods": [10, 11, 12, 13]
    },
    "tool_calls": [
      {
        "tool_name": "lookup_room_availability",
        "arguments": { "room_id": "SH-1", "day": "THU" },
        "status": "SUCCESS",
        "latency_ms": 2.15
      }
    ],
    "requires_confirmation": false,
    "action_proposal": null,
    "latency_ms": 14.82
  },
  "message": "Assistant response generated successfully"
}
```

---

### B. Action Confirmation (`POST /api/v1/assistant/confirm-action`)

#### Request:
```json
{
  "action_type": "create_booking",
  "proposal": {
    "title": "Annual Play: Andha Yug",
    "attendance": 130,
    "requested_room": "SH-1",
    "day": "THU",
    "from_period": 10,
    "to_period": 12,
    "requested_category": "club_event"
  },
  "confirmed": true
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "status": "created",
    "booking_id": "BR-26",
    "title": "Annual Play: Andha Yug"
  },
  "message": "Booking BR-26 created successfully after user confirmation."
}
```
