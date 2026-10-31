# CITRIX — Phase 5B: API Mismatches & Incompatibilities Report

This document details all technical contract discrepancies discovered between `frontend-1/citrix/src/services/` and the FastAPI backend (`app/api/v1/`).

---

## 1. Non-Existent / Missing Endpoints

### M-01: `GET /api/v1/schedules/active`
- **Frontend Caller:** Reference in architectural documentation and service intent.
- **FastAPI Reality:** **ROUTE DOES NOT EXIST (HTTP 404)**.
- **Root Cause:** The backend router in `app/api/v1/endpoints/schedules.py` only defines:
  - `POST /api/v1/schedules/generate`
  - `POST /api/v1/schedules/validate`
  - `GET /api/v1/schedules/versions`
  - `GET /api/v1/schedules/{schedule_id}`
  - `POST /api/v1/schedules/{schedule_id}/publish`
- **Authoritative Backend Alternative:**
  - To fetch active timetable sessions: `GET /api/v1/timetable` (automatically resolves the active schedule version and returns its placed sessions).
  - To inspect active schedule metadata: `GET /api/v1/schedules/versions` (returns a list of versions where `is_active: true` flags the active schedule).
- **Impact:** Any component requesting `/api/v1/schedules/active` directly receives HTTP 404 Not Found.

---

## 2. Query Parameter Name Mismatches

### M-02: `GET /api/v1/rooms` (Filter Parameter Drift)
- **Frontend Caller:** `src/services/roomService.js` (line 8):
  ```javascript
  const data = await apiClient.get('/rooms', {
    building: filters.building,
    room_type: filters.type,      // <-- Parameter name mismatch
    min_capacity: filters.capacity, // <-- Parameter name mismatch
    accessible: filters.accessible,
  });
  ```
- **Backend Signature:** `app/api/v1/endpoints/rooms.py` (lines 20–25):
  ```python
  def get_rooms(
      type: Optional[str] = None,
      building: Optional[str] = None,
      accessible: Optional[bool] = None,
      capacity_min: Optional[int] = None,
      allowed_use: Optional[str] = None,
  ...
  ```
- **Discrepancy:**
  - Frontend passes `room_type` -> Backend expects `type`.
  - Frontend passes `min_capacity` -> Backend expects `capacity_min`.
- **Observed Behavior:**
  - Request with `{ min_capacity: 50, room_type: 'classroom' }` returns **all 27 rooms** (unfiltered).
  - Request with `{ capacity_min: 50, type: 'classroom' }` returns **10 rooms** (correctly filtered).
- **Impact:** Client-side filters for room type and minimum capacity are silently ignored by the server.

---

### M-03: `GET /api/v1/bookings` (Status Filter Alias)
- **Frontend Caller:** `src/services/bookingService.js` (line 38):
  ```javascript
  const data = await apiClient.get('/bookings', {
    status_filter: filters.status, // <-- Parameter name mismatch
  });
  ```
- **Backend Signature:** `app/api/v1/endpoints/bookings.py` (line 68):
  ```python
  def list_bookings(
      status_filter: Optional[str] = Query(None, alias="status"),
  ...
  ```
- **Discrepancy:**
  - The Python variable is `status_filter`, but FastAPI specifies `alias="status"`. FastAPI strictly parses HTTP query string parameter `?status=...`.
  - Frontend sends `?status_filter=pending`.
- **Observed Behavior:**
  - `GET /api/v1/bookings?status_filter=pending` returns **26 bookings** (all requests).
  - `GET /api/v1/bookings?status=pending` returns **25 bookings** (strictly pending requests).
- **Impact:** Status filtering is ignored by the backend, returning all bookings regardless of status.

---

### M-04: `POST /api/v1/exams/generate` (Query vs Body Serialization)
- **Frontend Caller:** `src/services/examService.js` (line 36):
  ```javascript
  const data = await apiClient.post('/exams/generate', {
    time_limit_seconds: params.time_limit_seconds || 15.0,
    auto_publish: false, // <-- Sent as JSON body
  });
  ```
- **Backend Signature:** `app/api/v1/endpoints/exams.py` (lines 83–88):
  ```python
  @router.post("/generate", response_model=ApiResponse[Dict[str, Any]])
  def generate_exams_schedule(
      request: Request,
      time_limit_seconds: float = 15.0,
      auto_publish: bool = True,       // <-- FastAPI Query Parameter!
  ...
  ```
- **Discrepancy:**
  - In FastAPI, parameters of primitive types without `Body()` or a Pydantic model default to **Query Parameters**.
  - `auto_publish` has a server default of `True`.
  - The frontend sends `{ auto_publish: false }` in the HTTP JSON body.
- **Observed Behavior:**
  - FastAPI ignores the unrecognized JSON body and uses the query defaults (`auto_publish=True`).
  - As a result, calling `generate` from the frontend automatically commits and publishes the exam schedule immediately, bypassing the user's manual review step.
- **Impact:** Premature publication of midsem exam proposals.

---

### M-05: `POST /api/v1/reschedule/{id}/propose` (Time Limit Query Param Omission)
- **Frontend Caller:** `src/services/rescheduleService.js` (line 36):
  ```javascript
  const data = await apiClient.post(`/reschedule/${requestId}/propose`, null, {
    params: { time_limit_seconds: timeLimitSeconds },
  });
  ```
- **Backend Signature:** `app/api/v1/endpoints/reschedule.py` (line 79):
  ```python
  @router.post("/{request_id}/propose")
  def generate_reschedule_proposal_endpoint(
      request_id: int,
      time_limit_seconds: float = 30.0, // <-- Query Parameter
  ...
  ```
- **Discrepancy:**
  - `apiClient.js` custom fetch wrapper only serializes query parameters on `apiClient.get`. Its `post` implementation ignores the `options.params` object.
- **Observed Behavior:**
  - The request is dispatched as `POST /api/v1/reschedule/{id}/propose` without query string.
  - The backend falls back to its default `time_limit_seconds=30.0`.
- **Impact:** Minor. The solver still runs and succeeds, but user-configured solver timeouts are not propagated.

---

## 3. Request Payload & Validation Discrepancies

### M-06: `POST /api/v1/bookings/{id}/decision` (Missing Placement Fields on Approval)
- **Frontend Caller:** `src/features/approvals/ApprovalManagement.jsx` (line 45) & `src/features/admin/AdminCommandCenter.jsx` (line 77):
  ```javascript
  await approveBooking(id); // Calling with 1 parameter
  ```
- **Backend Implementation:** `app/services/booking_service.py` (lines 86–87):
  ```python
  if decision_req.decision in ["approved", "alternative_offered"]:
      if not decision_req.room_id or not decision_req.day or not decision_req.start_period or not decision_req.end_period:
          return False, "Day, start_period, end_period, and room_id are required for approval or alternative"
  ```
- **Discrepancy:**
  - When approving a booking, the backend requires the placement parameters: `day`, `start_period`, `end_period`, and `room_id`.
  - Frontend quick-approve buttons only passed `decision: "approved"` and `reason: "..."`.
- **Observed Behavior:**
  - Backend returns **HTTP 422 Unprocessable Entity**: *"Day, start_period, end_period, and room_id are required for approval or alternative"*.
  - Because `bookingService.approveBooking` has a `catch` block that falls back to `mockApproveBooking`, the UI displays a green success toast even though the database rejected the change.
- **Impact:** Quick-approvals fail on the server and silently fall back to mock client state.

---

### M-07: `POST /api/v1/assistant/confirm-action` (Action Type Schema Restriction)
- **Frontend Caller:** `src/features/assistant/AIAssistant.jsx`:
  ```javascript
  assistantService.confirmAction(m.intent, m.actionProposal, true);
  ```
- **Backend Signature:** `app/api/v1/endpoints/assistant.py` (lines 106 & 143):
  ```python
  if req.action_type == "create_booking":
      ...
  elif req.action_type == "apply_disruption":
      ...
  else:
      raise HTTPException(status_code=400, detail=f"Unsupported action type: {req.action_type}")
  ```
- **Discrepancy:**
  - Frontend passes the assistant `intent` (e.g., `"venue_booking"`, `"reschedule_lecture"`, or `"policy_question"`).
  - Backend strictly expects exact strings: `"create_booking"` or `"apply_disruption"`.
- **Observed Behavior:**
  - If `intent` is `"venue_booking"`, the backend returns **HTTP 400 Bad Request**: *"Unsupported action type: venue_booking"*.
- **Impact:** Action confirmations fail unless the frontend explicitly normalizes the action type string to `"create_booking"` or `"apply_disruption"`.

---

## 4. Comprehensive Endpoint Contract Matrix

| Endpoint | Expected Method | Backend Exists | Query Param Parity | Body Schema Parity | Auth Header Required | Current Status |
|---|---|---|---|---|---|---|
| `/auth/login` | POST | Yes | N/A | Matched (`username_or_email`) | No | **COMPATIBLE** |
| `/auth/me` | GET | Yes | None | N/A | Bearer JWT | **COMPATIBLE** |
| `/dashboard/dean` | GET | Yes | None | N/A | Bearer JWT (Admin) | **COMPATIBLE** |
| `/dashboard/coordinator` | GET | Yes | None | N/A | Bearer JWT (Coord) | **COMPATIBLE** |
| `/dashboard/faculty` | GET | Yes | None | N/A | Bearer JWT (Faculty) | **COMPATIBLE** |
| `/dashboard/club` | GET | Yes | None | N/A | Bearer JWT (Club) | **COMPATIBLE** |
| `/dashboard/student` | GET | Yes | None | N/A | Bearer JWT (Student) | **COMPATIBLE** |
| `/timetable` | GET | Yes | Matched (`group_id`, etc.) | N/A | Bearer JWT | **COMPATIBLE** |
| `/schedules/active` | GET | **NO (404)** | N/A | N/A | N/A | **MISSING** |
| `/schedules/generate` | POST | Yes | None | Matched | Bearer JWT (Admin) | **COMPATIBLE** |
| `/schedules/versions` | GET | Yes | None | N/A | Bearer JWT | **COMPATIBLE** |
| `/schedules/{id}/publish` | POST | Yes | Matched | None | Bearer JWT (Admin) | **COMPATIBLE** |
| `/exams` | GET | Yes | None | N/A | Bearer JWT | **COMPATIBLE** |
| `/exams/generate` | POST | Yes | **Mismatched (Query vs Body)** | Body ignored | Bearer JWT (Admin) | **PARAM MISMATCH** |
| `/exams/publish` | POST | Yes | None | Matched | Bearer JWT (Admin) | **COMPATIBLE** |
| `/bookings` | GET | Yes | **Mismatched (`status_filter` vs `status`)** | N/A | Bearer JWT | **PARAM MISMATCH** |
| `/bookings` | POST | Yes | None | Matched (`room_types` required) | Bearer JWT | **COMPATIBLE** |
| `/bookings/{id}/decision` | POST | Yes | None | **Mismatched (Missing placement fields)** | Bearer JWT | **PAYLOAD MISMATCH** |
| `/bookings/evaluate` | POST | Yes | None | None | Bearer JWT (Admin) | **COMPATIBLE** |
| `/reschedule` | POST | Yes | None | Matched | Bearer JWT | **COMPATIBLE** |
| `/reschedule/{id}/propose` | POST | Yes | Ignored param | None | Bearer JWT | **COMPATIBLE** |
| `/reschedule/{id}/approve` | POST | Yes | None | None | Bearer JWT (Admin) | **COMPATIBLE** |
| `/assistant/chat` | POST | Yes | None | Matched | Bearer JWT | **COMPATIBLE** |
| `/assistant/confirm-action` | POST | Yes | None | **Mismatched (action_type string)** | Bearer JWT | **SCHEMA MISMATCH** |
| `/rooms` | GET | Yes | **Mismatched (`min_capacity`, `room_type`)** | N/A | Bearer JWT | **PARAM MISMATCH** |
| `/rooms/{id}/availability` | GET | Yes | Matched (`day`) | N/A | Bearer JWT | **COMPATIBLE** |
| `/analytics/resources` | GET | Yes | None | N/A | Bearer JWT (Admin) | **COMPATIBLE** |
| `/audit/logs` | GET | Yes | Matched | N/A | Bearer JWT (Admin) | **COMPATIBLE** |
