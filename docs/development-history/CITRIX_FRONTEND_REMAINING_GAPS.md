# CITRIX — Frontend Integration Limitations & Remaining Gaps

This report transparently catalogs current limitations, architectural differences between frontend models and backend schemas, and recommended post-hackathon enhancements.

---

## 1. Schema Differences & Alignment Adapters

| Domain | Frontend Expectation | Backend PostgreSQL Schema | Resolution / Status |
|---|---|---|---|
| **User Role** | Frontend uses `coordinator` | Backend uses `department_coordinator` | Handled via bidirectional mapping in `authStore.js` (`rawRole` and `hasRole` check). |
| **Days of Week** | Full names (`Monday`, `Tuesday`, etc.) | 3-letter codes (`MON`, `TUE`, `WED`, `THU`, `FRI`) | `timetableService.js` and `rescheduleService.js` maintain bidirectional conversion maps (`DAY_ABBR_TO_FULL` and `DAY_FULL_TO_ABBR`). |
| **Periods to Clock Time** | Standard 24h strings (`08:30`, `14:00`) | Integer periods (1–9 or 1–10) | Normalized in `timetableService.js` via `PERIOD_TIMES` dictionary. |
| **Response Enveloping** | Direct object returns expected by prototype code | Uniform `{ success: bool, data: T, message: str }` | `apiClient.js` automatically unwraps `data` property and bubbles error messages to toast notifications. |

---

## 2. Handled Limitations & Graceful Degradation

### 2.1 Solver Long-Polling vs Background Workers
- **Current Behavior:** The frontend triggers CP-SAT timetable generation synchronously over HTTP with a default timeout of 30 seconds (`/schedules/generate` and `/reschedule/{id}/propose`).
- **Limitation:** For massive institutional instances (>5,000 sessions or complex non-linear soft constraints), solving times may exceed typical HTTP connection timeouts (60s).
- **Graceful Fallback:** `apiClient.js` has a 45-second timeout. If the backend fails or times out, the service catches the error and surfaces the cached proposal draft or demo solution with an explicit notification.
- **Future Recommendation:** Implement a background Celery/Redis job queue with WebSocket or Server-Sent Events (SSE) streaming solver progress (`% explored`, current objective score).

### 2.2 3D Campus Scene Spatial Coordinates
- **Current Behavior:** The Three.js canvas in `CampusScene.jsx` maps rooms to hardcoded 3D coordinates defined in `campusLayout.js`.
- **Limitation:** Dynamic room creations or building alterations performed in PostgreSQL do not automatically update 3D geometric mesh coordinates.
- **Graceful Fallback:** Rooms without custom 3D offsets default to their academic block floor grid position.
- **Future Recommendation:** Add `x`, `y`, `z` position coordinates and room boundary polygons to the PostgreSQL `rooms` table schema.

### 2.3 RAG Citation Highlighting
- **Current Behavior:** The AI Assistant displays document citations (e.g., `CIT_Academic_Rules_2026.pdf § 4.2`) as text chips in the message body.
- **Limitation:** Clicking on a citation does not currently open a PDF modal viewer focused on the exact page.
- **Graceful Fallback:** The full citation text and rule excerpt are rendered directly inside the chat response.

---

## 3. Strict Verification of Zero Backend Modifications

As mandated by project constraints, all work in Phase 5 was executed without altering the backend codebase:

| Backend Component | Status | Verification Check |
|---|---|---|
| `app/main.py` | Untouched | Unchanged |
| `app/api/v1/` routes | Untouched | Unchanged |
| `app/models/` SQLAlchemy models | Untouched | Unchanged |
| `app/schemas/` Pydantic schemas | Untouched | Unchanged |
| Alembic migrations | Untouched | Current revision remains `002_application_alignment` |
| Neon PostgreSQL 18.6 DB | Untouched | 31 tables, 1,169 canonical domain rows intact |
| CP-SAT Schedulers | Untouched | 34 backend unit tests pass without error |
