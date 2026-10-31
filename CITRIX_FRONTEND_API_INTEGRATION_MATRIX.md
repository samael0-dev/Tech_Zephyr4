# CITRIX — Frontend API Integration Matrix

This document provides the exhaustive contract mapping between the React user interface (`frontend-1/citrix`) and the FastAPI backend (`app/api/v1`).

---

## 1. Authentication & Session

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `LoginPage.jsx` | Click persona card or form submit | `POST` | `/api/v1/auth/login` | `{ email, password }` | `{ access_token, token_type, user }` | 200 OK | `authStore.loginWithCredentials` | Local demo authentication |
| `AppShell.jsx` | App mount / token verification | `GET` | `/api/v1/auth/me` | Bearer token in header | `{ id, email, name, role, ... }` | 200 OK | `authStore.checkAuth` | Use stored user object |

---

## 2. Institutional Dashboards

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `AdminCommandCenter.jsx` | Component mount / refresh | `GET` | `/api/v1/dashboard/dean` | None | `{ metrics: {...}, pending_requests: [...], alerts: [...] }` | 200 OK | `dashboardService.getDeanDashboard` | Render demo KPI constants |
| `CoordinatorDashboard.jsx` | Component mount | `GET` | `/api/v1/dashboard/coordinator` | None | `{ department, department_labs: [...], pending_lab_requests: [...] }` | 200 OK | `dashboardService.getCoordinatorDashboard` | Filter local DEMO rooms |
| `FacultyDashboard.jsx` | Component mount | `GET` | `/api/v1/dashboard/faculty` | None | `{ faculty_id, total_weekly_hours, sessions: [...], unavailability: [...] }` | 200 OK | `dashboardService.getFacultyDashboard` | Filter local sessions for F001 |
| `ClubDashboard.jsx` | Component mount | `GET` | `/api/v1/dashboard/club` | None | `{ club_name, total_requests, approved, alternatives, pending, requests: [...] }` | 200 OK | `dashboardService.getClubDashboard` | Filter demo spectra events |
| `StudentDashboard.jsx` | Component mount | `GET` | `/api/v1/dashboard/student` | None | `{ student_name, student_group, exams: [...], campus_events: [...] }` | 200 OK | `dashboardService.getStudentDashboard` | Filter group CSE-A1 sessions |

---

## 3. Academic Timetabling & CP-SAT Solver

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `WeeklyTimetable.jsx` | Mount / cohort select | `GET` | `/api/v1/timetable` | `group_id`, `faculty_id`, `room_id`, `day` | `List[ScheduledSession]` | 200 OK | `timetableService.getSessions` | Render `SESSIONS` demo array |
| `DailyTimetable.jsx` | Day / group change | `GET` | `/api/v1/timetable` | `day`, `group_id` | `List[ScheduledSession]` | 200 OK | `timetableService.getSessions` | Render `SESSIONS` demo array |
| `TimetableGenWorkspace.jsx` | Click "Generate Weekly Timetable" | `POST` | `/api/v1/schedules/generate` | `{ dataset_id: "cit-public-v1", solver_timeout_seconds: 30 }` | `{ id, sessions_count, hard_violations_count, soft_penalty_score, status }` | 200 OK | `timetableService.generateTimetable` | Simulated solver progress |
| `TimetableGenWorkspace.jsx` | Click "Publish Schedule #ID" | `POST` | `/api/v1/schedules/{id}/publish` | None | `{ id, is_active: true, published_at: ... }` | 200 OK | `timetableService.publishTimetable` | Local toast notification |
| `TimetableComparison.jsx` | View versions list | `GET` | `/api/v1/schedules/versions` | None | `List[ScheduleVersion]` | 200 OK | `timetableService.getScheduleVersions` | Mock version history |

---

## 4. Midsem Examination Scheduling

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `MidsemScheduling.jsx` | Component mount | `GET` | `/api/v1/exams` | None | `{ exams: [...], count: 41 }` | 200 OK | `examService.getExams` | Render `MIDSEM_EXAMS` demo array |
| `MidsemScheduling.jsx` | Click "Run Exam Seating Solver" | `POST` | `/api/v1/exams/generate` | `{ time_limit_seconds: 15.0, auto_publish: false }` | `{ is_feasible: true, total_exams_scheduled: 41, assignments: [...], validation: {...} }` | 200 OK | `examService.generateSchedule` | Mock 41 exam allocations |
| `MidsemScheduling.jsx` | Click "Publish Exam Seating" | `POST` | `/api/v1/exams/publish` | `{ assignments: [...] }` | `{ status: "published", published_count: 41 }` | 200 OK | `examService.publishSchedule` | Local success toast |

---

## 5. Venue Bookings & Spectra Fest Management

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `BookingHistory.jsx` | Component mount | `GET` | `/api/v1/bookings` | `status_filter` | `List[BookingRequest]` | 200 OK | `bookingService.getBookings` | Render `BOOKINGS` demo array |
| `BookingForm.jsx` | Form submit | `POST` | `/api/v1/bookings` | `{ title, attendance, duration_periods, requested_category, windows, requested_room, ... }` | `{ id, title, status: "pending", ... }` | 201 Created | `bookingService.submitBooking` | Add to local store array |
| `ApprovalManagement.jsx` | Click "Approve" | `POST` | `/api/v1/bookings/{id}/decision` | `{ decision: "approved", reason: "..." }` | `{ id, status: "approved", ... }` | 200 OK | `bookingService.approveBooking` | Update local status |
| `ApprovalManagement.jsx` | Click "Reject / Alternative" | `POST` | `/api/v1/bookings/{id}/decision` | `{ decision: "alternative_offered", reason: "...", room_id: "SH-2" }` | `{ id, status: "alternative_offered", assigned_room_id: "SH-2", ... }` | 200 OK | `bookingService.rejectBooking` | Update local status |
| `SpectraManagement.jsx` | Click "Evaluate Fest Bookings" | `POST` | `/api/v1/bookings/evaluate` | None | `{ evaluated_count: 7, approved_count: 4, rejected_count: 3 }` | 200 OK | `spectraService.evaluateEvents` | Mock 6-tier prioritization |

---

## 6. Disruption Management & Rescheduling Engine

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `DisruptionManagement.jsx` | Report Disruption Modal submit | `POST` | `/api/v1/reschedule` | `{ disruption_type, faculty_id, room_id, days, periods, reason }` | `{ request_id, status: "pending", impact_summary: {...} }` | 200 OK | `rescheduleService.submitDisruption` | Add to local disruptions list |
| `FacultyUnavailability.jsx` | Submit leave notice | `POST` | `/api/v1/reschedule` | `{ disruption_type: "faculty_unavailable", faculty_id, days, periods, reason }` | `{ request_id, status: "pending", ... }` | 200 OK | `rescheduleService.submitDisruption` | Add to local history |
| `TimetableComparison.jsx` | Mount with disruption ID | `POST` | `/api/v1/reschedule/{id}/propose` | Query param: `time_limit_seconds=30.0` | `{ disruption_id, solver_status, moves_count, proposed_moves: [...], validation: {...} }` | 200 OK | `rescheduleService.generateProposal` | Render demo moves diff |
| `TimetableComparison.jsx` | Click "Approve & Apply Fixed Schedule" | `POST` | `/api/v1/reschedule/{id}/approve` | None | `{ status: "applied", schedule_version_id, updated_sessions_count }` | 200 OK | `rescheduleService.approveProposal` | Set approved flag & toast |

---

## 7. AI Assistant & Human-in-the-Loop Confirmation

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `AIAssistant.jsx` | Send message (English / Hinglish) | `POST` | `/api/v1/assistant/chat` | `{ message, session_id }` | `{ reply, intent, entities, citations, requires_confirmation, action_proposal }` | 200 OK | `assistantService.chat` | Local heuristic response generator |
| `AIAssistant.jsx` | Click "Confirm & Execute" | `POST` | `/api/v1/assistant/confirm-action` | `{ action_type, proposal, confirmed: true }` | `{ status: "success", message: "Action executed", result: {...} }` | 200 OK | `assistantService.confirmAction` | Local execution simulation |
| `AdminCommandCenter.jsx` | Header AI recommendations | `GET` | `/api/v1/assistant/dean-insights` | None | `{ insights: [...], critical_warnings: [...] }` | 200 OK | `assistantService.getDeanInsights` | Render preset recommendations |

---

## 8. Room Availability & 3D Campus Explorer

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `RoomSearch.jsx` | Mount / filter inputs | `GET` | `/api/v1/rooms` | `building`, `room_type`, `min_capacity`, `accessible` | `List[Room]` | 200 OK | `roomService.getRooms` | Filter `ROOMS` demo array |
| `RoomDetail.jsx` | Select day tab | `GET` | `/api/v1/rooms/{id}/availability` | Query param: `day=MON` | `{ room_id, day, slots: [{ period, is_occupied, title, ... }] }` | 200 OK | `roomService.getRoomAvailability` | Mock period grid |
| `CampusScene.jsx` | 3D Canvas interactive click | `GET` | `/api/v1/rooms/{id}` | Path param: `id` | Single `Room` object | 200 OK | `roomService.getRoom` | Find room in demo list |

---

## 9. Analytics & Audit Logs

| UI Component | Action Trigger | HTTP Method | Endpoint | Request Payload / Params | Expected Response Data | HTTP Status | Frontend Store / Service | Fallback Behavior |
|---|---|---|---|---|---|---|---|---|
| `AnalyticsDashboard.jsx` | Mount | `GET` | `/api/v1/analytics/resources` | None | `{ total_rooms, department_utilization, hourly_load }` | 200 OK | `analyticsService.getResources` | Render `ANALYTICS` charts |
| `AuditLog.jsx` | Filter / search | `GET` | `/api/v1/audit/logs` | `action`, `limit=50`, `offset=0` | `{ logs: [...], total_count }` | 200 OK | `auditService.getLogs` | Render `AUDIT_LOGS` demo records |
