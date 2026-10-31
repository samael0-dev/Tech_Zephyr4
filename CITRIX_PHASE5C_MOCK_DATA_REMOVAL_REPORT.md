# CITRIX Phase 5C — Mock Data Removal & State Integrity Report

## 1. Executive Summary

To satisfy the non-negotiable architectural requirement that Neon PostgreSQL is the sole single source of truth, all silent mock-data fallback logic was removed from the frontend application. Previously, when backend endpoints encountered network latency or errors, frontend services caught exceptions and returned synthetic demo objects from `src/data/demoData.js` or `src/services/mockAdapter.js`. In Phase 5C, all 11 operational mock datasets were decoupled from active UI components.

---

## 2. Decommissioned Mock Datasets

The following 11 mock datasets from `src/data/demoData.js` were removed from operational state management:

| # | Mock Dataset | Previous Usage | Phase 5C Live Replacement |
|---|---|---|---|
| 1 | `ROOMS` | Silent fallback in `roomService.js` and `RoomSearch.jsx` | `GET /api/v1/rooms`, `GET /api/v1/rooms/{id}/availability` |
| 2 | `FACULTY` | Hardcoded faculty status matrix in `AdminCommandCenter.jsx` | Live metrics in `GET /api/v1/dashboard/dean` |
| 3 | `COURSES` | Fallback course roster in timetable views | Live scheduled session courses in `GET /api/v1/timetable` |
| 4 | `STUDENT_GROUPS` | Fallback cohort definitions in `TimetableGenWorkspace.jsx` | Live groups from `/timetable` |
| 5 | `SESSIONS` | Fallback teaching schedule in `WeeklyTimetable.jsx` and `DailyTimetable.jsx` | Live session query in `GET /api/v1/timetable` |
| 6 | `SPECTRA_EVENTS` | Hardcoded festival proposals in `SpectraManagement.jsx` | Live bookings in `GET /api/v1/bookings` (filtered by fest/series) |
| 7 | `MIDSEM_EXAMS` | Initial state in `MidsemScheduling.jsx` | Real exam allocations in `GET /api/v1/exams` & `POST /api/v1/exams/generate` |
| 8 | `BOOKINGS` | Fallback booking records in `bookingService.js` and `ApprovalManagement.jsx` | Live booking records in `GET /api/v1/bookings` |
| 9 | `DISRUPTIONS` | Static incidents in `DisruptionManagement.jsx` | Real disruption records in `POST /api/v1/reschedule` |
| 10 | `AUDIT_LOGS` | Static audit records in `AuditLog.jsx` | Cryptographically signed logs in `GET /api/v1/audit/logs` |
| 11 | `ANALYTICS` | Hardcoded charts in `AdminCommandCenter.jsx` and `AnalyticsDashboard.jsx` | Telemetry from `GET /api/v1/analytics/resources`, `GET /api/v1/analytics/conflicts` |

*Note: Architectural geometry data in `src/data/campusLayout.js` and demo account credentials in `DEMO_ACCOUNTS` (for login shortcuts) are retained as static presentation fixtures.*

---

## 3. UI State Handling Improvements

In place of silent mock fallbacks, all affected UI components were upgraded with explicit lifecycle states:

1. **Loading State**:
   - Integrated animated spinner icons (`Loader2`) and skeleton cards when queries are in flight.
2. **Error State**:
   - Replaced silent mock rendering with prominent error alert banners displaying exact server error messages and HTTP status codes.
3. **Empty State**:
   - Rendered dedicated "no records found" empty state cards when the database returns zero matching items, rather than substituting mock objects.

---

## 4. Service-Level Error Propagation

In `apiClient.js` and individual services:
- Catch blocks in `roomService.js`, `bookingService.js`, `examService.js`, `timetableService.js`, and `spectraService.js` now re-throw `ApiError` instances rather than delegating to `mockAdapter.js`.
- Stores (`useBookingStore`) capture errors in `error: err.message` and clear loading indicators without populating stale mock arrays.
