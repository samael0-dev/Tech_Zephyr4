# CITRIX Phase 5C — API Correction & Contract Alignment Report

## 1. Overview

During Phase 5B verification, five critical contract and parameter mismatches were identified between the prototype React frontend services and the authoritative FastAPI backend endpoints. In Phase 5C, each discrepancy was systematically aligned to the backend contract without modifying any backend code.

---

## 2. Detailed Endpoint Corrections

### A. Non-Existent Active Schedule Endpoint (`GET /api/v1/schedules/active`)
- **Issue**: Frontend originally attempted to invoke `GET /api/v1/schedules/active`, which does not exist in FastAPI router registrations (resulting in HTTP 404).
- **Backend Ground Truth**:
  - `GET /api/v1/timetable`: Returns active scheduled sessions filtered by role or query parameters (`group_id`, `faculty_id`, `room_id`, `day`).
  - `GET /api/v1/schedules/versions`: Returns all generated schedule versions including the active schedule flag (`is_active: bool`).
- **Correction in Frontend**:
  - `timetableService.js`: Removed all references to `/schedules/active`.
  - `getSessions(filters)` queries `GET /api/v1/timetable`.
  - `getScheduleVersions()` queries `GET /api/v1/schedules/versions`.
  - Dependent components (`WeeklyTimetable.jsx`, `DailyTimetable.jsx`, `AdminCommandCenter.jsx`) now bind to these endpoints directly.

---

### B. Room Query Parameter Aliases (`GET /api/v1/rooms`)
- **Issue**: Frontend sent query parameters `room_type` and `min_capacity`. FastAPI endpoint `get_rooms` ignored both because its parameters are named `type` and `capacity_min`.
- **Backend Ground Truth**:
  ```python
  @router.get("", response_model=ApiResponse[List[RoomResponse]])
  def get_rooms(
      type: Optional[str] = Query(None),
      building: Optional[str] = Query(None),
      accessible: Optional[bool] = Query(None),
      capacity_min: Optional[int] = Query(None),
      allowed_use: Optional[str] = Query(None),
      ...
  )
  ```
- **Correction in Frontend (`roomService.js`)**:
  - Mapped `minCapacity` / `min_capacity` -> `capacity_min: parseInt(filters.minCapacity || filters.capacity_min, 10)`.
  - Mapped `roomType` / `room_type` -> `type: (filters.type || filters.roomType || '').toLowerCase().replace(/\s+/g, '_')`.
  - Updated `RoomSearch.jsx` to pass these exact parameters.

---

### C. Booking Status Filter Parameter (`GET /api/v1/bookings`)
- **Issue**: `bookingService.getBookings()` transmitted `{ status_filter: filters.status }`. FastAPI endpoint `list_bookings` expects the parameter name `status`.
- **Backend Ground Truth**:
  ```python
  @router.get("", response_model=ApiResponse[List[BookingResponse]])
  def list_bookings(
      status_filter: Optional[str] = Query(None, alias="status"),
      ...
  )
  ```
- **Correction in Frontend (`bookingService.js`)**:
  - Changed query parameter dictionary to `{ status: filters.status }`.
  - Corrected query handling so pending, approved, and rejected booking filters are respected by the backend database query.

---

### D. Midsem Exam Generation Parameters (`POST /api/v1/exams/generate`)
- **Issue**: `examService.generateSchedule()` transmitted `{ auto_publish: false }` inside the JSON request body. However, FastAPI defines `time_limit_seconds` and `auto_publish` as query parameters (`Query(...)`). When called with a JSON body, FastAPI used the default value `auto_publish=True`, causing immediate auto-publication and bypassing the proposal review workflow.
- **Backend Ground Truth**:
  ```python
  @router.post("/generate", response_model=ApiResponse[ExamScheduleResponse])
  def generate_midsem_schedule(
      time_limit_seconds: float = 15.0,
      auto_publish: bool = True,
      ...
  )
  ```
- **Correction in Frontend (`examService.js`)**:
  - Configured query parameters in the request URL: `/exams/generate?time_limit_seconds=${timeout}&auto_publish=false`.
  - This ensures that proposal generation creates a draft schedule without auto-publishing.
  - Added an explicit `Publish Proposal` action button in `MidsemScheduling.jsx` that triggers `POST /api/v1/exams/publish`.

---

### E. Booking Approval Placement Validation (`POST /api/v1/bookings/{id}/decision`)
- **Issue**: Calling `approveBooking(id)` sent only `{ decision: 'approved', reason: '...' }`. The backend validator (`validate_booking_decision`) returned 422 Unprocessable Entity because `day`, `start_period`, `end_period`, and `room_id` are strictly required for approved decisions.
- **Backend Ground Truth**:
  ```python
  if decision_req.decision in ["approved", "alternative_offered"]:
      if not decision_req.room_id or not decision_req.day or not decision_req.start_period or not decision_req.end_period:
          return False, "Day, start_period, end_period, and room_id are required for approval or alternative"
  ```
- **Correction in Frontend**:
  - `bookingService.approveBooking(id, decisionParams)`: Now accepts full placement parameters. If placement fields are omitted, the service pre-fetches the booking via `GET /bookings/{id}` to automatically populate `day`, `start_period`, `end_period`, and `room_id` from the booking's requested windows.
  - `bookingStore.approveBooking(id, decisionParams)`: Auto-populates missing parameters from the client state.
  - `ApprovalManagement.jsx` & `BookingDetail.jsx`: Pass exact placement attributes to approval requests.

---

### F. AI Assistant Action Confirmation (`POST /api/v1/assistant/confirm-action`)
- **Issue**: Conversational intents like `"venue_booking"` or `"booking"` caused HTTP 400 Bad Request because FastAPI validates `action_type` against `^(create_booking|apply_disruption)$`.
- **Backend Ground Truth**:
  ```python
  class ActionConfirmRequest(BaseModel):
      action_type: str = Field(..., pattern="^(create_booking|apply_disruption)$")
      proposal: Dict[str, Any]
      confirmed: bool = True
  ```
- **Correction in Frontend (`assistantService.confirmAction`)**:
  - Implemented normalization: any booking, room, or venue intent maps to `"create_booking"`; any disruption, reschedule, or leave intent maps to `"apply_disruption"`.

---

## 3. Verification Summary

All corrected API calls were verified through hermetic tests in `test_phase5c_workflows.py`. All requests received valid 200/201 responses with complete payload extraction.
