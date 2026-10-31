# CIT Campus Operations Platform — Backend API Contract

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Standard Response Conventions:**

### Success Format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Request completed successfully"
}
```

### Error Format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": []
  }
}
```

---

## 1. Authentication & Identity

### `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "username_or_email": "dean@cit.edu",
  "password": "password123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "usr-admin-01",
      "username": "dean",
      "email": "dean@cit.edu",
      "name": "Prof. R. K. Jena (Dean)",
      "role": "admin",
      "department": "ADMIN",
      "faculty_id": null,
      "student_group_id": null,
      "club_name": null,
      "permissions": ["*"]
    }
  },
  "message": "Authentication successful"
}
```

### `GET /api/v1/auth/me`
- **Access:** Authenticated (Any role)
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Current user object with active roles, scopes, and resolved permissions.

### `POST /api/v1/auth/reset-demo`
- **Access:** Admin only (`system:reset_demo`)
- **Response (200 OK):** Resets the database back to clean baseline state from `cit_public.json`.

---

## 2. Dashboards (Role-Specific Experiences)

### `GET /api/v1/dashboard/dean`
- **Access:** Admin only (`dashboard:dean`)
- **Query Params:** `day` (optional, default `MON`), `period` (optional)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_rooms": 27,
      "occupied_rooms": 14,
      "available_rooms": 13,
      "today_scheduled_sessions": 48,
      "current_conflicts": 0,
      "pending_approvals": 4,
      "upcoming_events": 6,
      "faculty_availability_rate": 0.88,
      "department_utilization": {
        "CSE": 0.78,
        "ECE": 0.72,
        "ME": 0.65,
        "EE": 0.70,
        "CE": 0.60
      }
    },
    "alerts": [
      {
        "type": "warning",
        "message": "Spectra fest overlap requires 1 session override approval."
      }
    ],
    "pending_requests": [ ... ],
    "room_period_heatmap": [ ... ]
  },
  "message": "Dean dashboard data retrieved successfully"
}
```

### `GET /api/v1/dashboard/faculty`
- **Access:** Faculty only (`dashboard:faculty`)
- **Response (200 OK):** Faculty's scheduled hours, personal daily timetable, pending change requests, room assignments, soft preference satisfaction.

### `GET /api/v1/dashboard/coordinator`
- **Access:** Department Coordinator (`dashboard:coordinator`)
- **Response (200 OK):** Department's courses, session timetable, department lab booking requests awaiting approval, lab utilization metrics.

### `GET /api/v1/dashboard/club`
- **Access:** Club representative (`dashboard:club`)
- **Response (200 OK):** Club venue requests, booking status, reasons for decisions, assigned rooms, schedule timeline.

### `GET /api/v1/dashboard/student`
- **Access:** Student (`dashboard:student`)
- **Response (200 OK):** Student's group timetable, today's classes, room numbers, exam schedule, campus events.

---

## 3. Rooms & Venues

### `GET /api/v1/rooms`
- **Access:** Authenticated (All roles)
- **Query Params:** `type`, `building`, `accessible`, `capacity_min`, `allowed_use`
- **Response (200 OK):** List of 27 campus rooms with details.

### `GET /api/v1/rooms/{room_id}`
- **Access:** Authenticated
- **Response (200 OK):** Room detail, capacity, features, accessibility, maintenance windows.

### `GET /api/v1/rooms/{room_id}/availability`
- **Access:** Authenticated
- **Query Params:** `day` (MON-FRI), `week` (default regular, or `week7` for Spectra fest)
- **Response (200 OK):** Period-by-period occupancy array with session or booking info.

---

## 4. Timetable & Schedules

### `GET /api/v1/timetable`
- **Access:** Authenticated (Filtered by RBAC data isolation)
  - Admin: Full campus schedule
  - Coordinator: Filtered to department groups and sessions
  - Faculty: Filtered to faculty's teaching sessions
  - Student: Filtered to student's group
- **Query Params:** `group_id`, `faculty_id`, `room_id`, `day`

### `POST /api/v1/schedules/generate`
- **Access:** Admin only (`timetable:generate`)
- **Request Body:**
```json
{
  "dataset_id": "cit-public-v1",
  "solver_timeout_seconds": 30
}
```
- **Response (200 OK):** New schedule version ID, solver metrics, hard violation count, soft score.

### `GET /api/v1/schedules/{schedule_id}`
- **Access:** Authenticated
- **Response (200 OK):** Schedule version metadata, sessions list, status, export payload.

### `POST /api/v1/schedules/validate`
- **Access:** Authenticated (`timetable:validate`)
- **Request Body:** Optional custom schedule JSON or uses current active schedule.
- **Response (200 OK):** Official `validator.py` results (hard violations, soft penalty breakdown S1-S6, booking score, priority inversions).

---

## 5. Bookings & Approvals

### `POST /api/v1/bookings`
- **Access:** Authenticated (`booking:create`)
  - Role category cap strictly enforced by server:
    - Admin: `institute_event`
    - Faculty: `guest_lecture`
    - Department Coordinator: `department_event`
    - Club: `club_event`
- **Request Body:**
```json
{
  "title": "Robotics Exhibition",
  "attendance": 120,
  "duration_periods": 3,
  "requested_category": "club_event",
  "windows": [{"day": "THU", "from_period": 10, "to_period": 12}],
  "room_types": ["seminar_hall", "auditorium"],
  "needs": ["projector", "pa_system"],
  "requested_room": "SH-1",
  "mandatory_for_groups": [],
  "raw_text": "Robotics club needs SH-1 Thursday 6 to 9 pm"
}
```
- **Response (201 Created):** Created booking request with ID (e.g. `BR-26`).

### `GET /api/v1/bookings`
- **Access:** Authenticated (Data isolated)
  - Admin: All bookings
  - Coordinator: Department bookings + lab requests
  - Club/Faculty: Own requests
- **Query Params:** `status`, `role`, `category`

### `GET /api/v1/bookings/{booking_id}`
- **Access:** Authenticated (Authorized for this booking)

### `POST /api/v1/bookings/{booking_id}/decision`
- **Access:** Admin or authorized Coordinator (`booking:approve_all` or `booking:approve_dept_lab`)
- **Security Guard:** **NO SELF-APPROVAL** — `requester_user_id != approver_user_id`. Coordinator can only approve department lab bookings.
- **Request Body:**
```json
{
  "decision": "approved",
  "day": "THU",
  "start_period": 10,
  "end_period": 12,
  "room_id": "SH-1",
  "reason": "Auditorium free and adequate capacity"
}
```
- **Response (200 OK):** Decision result, status update, audit log logged.

---

## 6. Midsem Exams

### `GET /api/v1/exams`
- **Access:** Authenticated (Admin sees all; Student/Faculty see their courses)
- **Response (200 OK):** Exam schedule list with date, session (AM/PM), allocated rooms (half-capacity respected).

### `POST /api/v1/exams/generate`
- **Access:** Admin only (`exam:generate`)

---

## 7. Disruptions & Rescheduling

### `POST /api/v1/reschedule`
- **Access:** Admin or Coordinator/Faculty (`reschedule:request`)
- **Request Body:**
```json
{
  "disruption_type": "faculty_unavailable",
  "faculty_id": "F07",
  "days": ["MON"],
  "periods": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  "reason": "Emergency medical leave"
}
```
- **Response (200 OK):** Reschedule proposal, moved sessions count, constraint checks, approval status.

### `GET /api/v1/reschedule/{request_id}`
- **Access:** Authenticated

---

## 8. CITRIX AI Assistant & RAG Module

### `POST /api/v1/assistant/chat`
- **Access:** Authenticated (`assistant:chat`)
- **Request Body:**
```json
{
  "message": "Find an available seminar hall on Monday after 6 PM for 80 students.",
  "session_id": "optional-session-id"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reply": "Availability for venue SH-1 on MON:\n- Capacity: 150 students\n- Free Periods: P10, P11, P12, P13\n- Occupied Periods: 3 periods occupied",
    "intent": "room_search",
    "entities": {
      "day": "MON",
      "room_id": "SH-1",
      "attendance": 80
    },
    "citations": [
      {
        "source_id": "DOC-ROOMS-03",
        "title": "CIT Venues, Capacities & Permitted Uses Catalog",
        "category": "resource_catalog",
        "page": 1,
        "relevance_score": 3.85,
        "snippet": "Seminar Hall 1 (SH-1): Academic Block A, Capacity 150..."
      }
    ],
    "tool_result": {
      "found": true,
      "room_id": "SH-1",
      "capacity": 150,
      "free_periods": [10, 11, 12, 13]
    },
    "requires_confirmation": false,
    "action_proposal": null
  },
  "message": "Assistant response generated successfully"
}
```

### `POST /api/v1/assistant/confirm-action`
- **Access:** Authenticated
- **Description:** Human-in-the-Loop execution endpoint. Modifies database only after user clicks confirm.
- **Request Body:**
```json
{
  "action_type": "create_booking",
  "proposal": {
    "title": "Robotics Exhibition",
    "attendance": 80,
    "requested_room": "SH-1",
    "day": "THU",
    "from_period": 10,
    "to_period": 12,
    "requested_category": "club_event"
  },
  "confirmed": true
}
```
- **Response (200 OK):** Status, created `booking_id`, and immutable audit log confirmation.

### `GET /api/v1/assistant/dean-insights`
- **Access:** Admin only (`role: admin`)
- **Response (200 OK):** Real-time Dean intelligence briefing, room utilization, bottleneck venues, pending approvals, and active alerts.

---

## 9. RAG Knowledge Base

### `POST /api/v1/rag/search`
- **Access:** Authenticated
- **Request Body:**
```json
{
  "query": "Spectra tech fest priority rules",
  "category": "booking_rule",
  "top_k": 3
}
```
- **Response (200 OK):** Assembled grounding context and structured citations list.

### `POST /api/v1/rag/documents`
- **Access:** Admin or Department Coordinator
- **Request Body:** Ingests raw text or markdown institutional policies into hybrid vector store.

### `POST /api/v1/rag/documents/upload-pdf`
- **Access:** Admin or Department Coordinator (`multipart/form-data`)
- **Description:** Uploads, cleans, extracts with `pypdf`, chunks, and indexes a PDF document.

### `GET /api/v1/rag/documents`
- **Access:** Authenticated
- **Response (200 OK):** List of all indexed institutional documents.

### `POST /api/v1/rag/reset`
- **Access:** Admin only
- **Description:** Re-seeds built-in institutional documents and resets vector index.

---

## 9. Institutional Analytics

### `GET /api/v1/analytics/resources`
- **Access:** Admin (`analytics:view_all`) or Coordinator (`analytics:view_dept`)
- **Response (200 OK):** Room utilization percentage, lab load distribution, peak period analysis.

### `GET /api/v1/analytics/conflicts`
- **Access:** Admin
- **Response (200 OK):** Potential bottlenecks, rejected bookings summary, soft penalty metrics.

### `GET /api/v1/analytics/events`
- **Access:** Authenticated
- **Response (200 OK):** Scheduled events by category, time distribution.

---

## 10. Audit Logging

### `GET /api/v1/audit/logs`
- **Access:** Admin only (`audit:view`)
- **Query Params:** `action`, `user_id`, `entity_type`, `limit`, `offset`
- **Response (200 OK):** List of immutable audit entries recording actor, action, timestamp, entity ID, previous/new state, IP address.
