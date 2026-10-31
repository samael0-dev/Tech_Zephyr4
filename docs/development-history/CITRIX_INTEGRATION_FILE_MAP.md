# CITRIX Integration File Map & Action Inventory

This document maps all important files from both projects to their future destination, architectural ownership, and required action during the integration phase.

---

## 1. Intelligence Engine & Core Optimization (`CITRIX/CITRIX/`)

| Current Source Path | Future Target Path | Future Ownership | Required Integration Action |
| :--- | :--- | :--- | :--- |
| `CITRIX/CITRIX/engine/scheduler/solver.py` | `app/engine/scheduler/solver.py` | Intelligence Core | Copy to application engine directory. Maintain standalone status. |
| `CITRIX/CITRIX/engine/scheduler/constraints.py`| `app/engine/scheduler/constraints.py`| Intelligence Core | Copy as-is. Enforces all H1–H14 academic constraints. |
| `CITRIX/CITRIX/engine/scheduler/objective.py` | `app/engine/scheduler/objective.py` | Intelligence Core | Copy as-is. Enforces soft objectives S1–S6 including S2 gap minimization. |
| `CITRIX/CITRIX/engine/scheduler/models.py` | `app/engine/scheduler/models.py` | Intelligence Core | Copy as-is. Pydantic models for CP-SAT solver. |
| `CITRIX/CITRIX/engine/scheduler/data_loader.py`| `app/engine/scheduler/data_loader.py`| Intelligence Core | Copy as-is. Parses dataset and applies disruption diffs. |
| `CITRIX/CITRIX/engine/scheduler/exporter.py` | `app/engine/scheduler/exporter.py` | Intelligence Core | Copy as-is. Translates solver assignments to canonical format. |
| `CITRIX/CITRIX/engine/scheduler/validator_adapter.py`| `app/engine/scheduler/validator_adapter.py`| Intelligence Core | Copy as-is. Bridges solver output with official `validator.py`. |
| `CITRIX/CITRIX/engine/scheduler/variables.py` | `app/engine/scheduler/variables.py` | Intelligence Core | Copy as-is. Models CP-SAT interval and boolean variables. |
| `CITRIX/CITRIX/engine/exams/engine.py` | `app/engine/exams/engine.py` | Intelligence Core | Copy as-is. Exam allocation engine with alternate seating. |
| `CITRIX/CITRIX/engine/fest/engine.py` | `app/engine/fest/engine.py` | Intelligence Core | Copy as-is. Spectra Week booking priority engine. |
| `CITRIX/CITRIX/engine/rescheduler/engine.py` | `app/engine/rescheduler/engine.py` | Intelligence Core | Copy as-is. Disruption rescheduler optimizing stability. |
| `CITRIX/CITRIX/api/models.py` | `app/models/postgres_models.py` (or replace `app/models/`) | Database Tier | **Authoritative Database Models.** Replace SQLite models with these 30 normalized models. Add `hashed_password` to `User`. |
| `CITRIX/CITRIX/api/database.py` | `app/core/database.py` | Database Tier | Port connection pooling (`pool_pre_ping=True`, `pool_recycle=300`) and dual TCP/HTTPS transport into application database module. |
| `CITRIX/CITRIX/alembic/` | `alembic/` (Root) | Database Tier | Move Alembic directory to root for persistent migration management. |
| `CITRIX/CITRIX/alembic.ini` | `alembic.ini` (Root) | Database Tier | Move to workspace root. |
| `CITRIX/CITRIX/api/services/campus_service.py` | `app/services/campus_service.py` | Service Tier | Retain as query service for Neon PostgreSQL. |
| `CITRIX/CITRIX/api/services/analytics_service.py`| `app/services/analytics_service.py` | Service Tier | Retain as analytics calculation engine. |

---

## 2. Application, RBAC & Security Layer (`app/core/`, `app/api/`)

| Current Source Path | Future Target Path | Future Ownership | Required Integration Action |
| :--- | :--- | :--- | :--- |
| `app/core/config.py` | `app/core/config.py` | Core Configuration | Update `DATABASE_URL` to source PostgreSQL connection string. Add connection pool settings. |
| `app/core/database.py` | `app/core/database.py` | Database Tier | Remove SQLite `check_same_thread`. Implement Neon connection pool and session generator. |
| `app/core/security.py` | `app/core/security.py` | Security Tier | Retain as-is. Provides bcrypt hashing and JWT bearer encoding/decoding. |
| `app/core/permissions.py` | `app/core/permissions.py` | Security Tier | Retain as-is. Defines Role and Permission enums and role mappings. |
| `app/core/rbac.py` | `app/core/rbac.py` | Security Tier | Retain as-is. Enforces permission dependencies and anti-self-approval checks. |
| `app/core/audit.py` | `app/core/audit.py` | Audit & Logging | Update to log into Neon `audit_logs` table. |
| `app/api/v1/endpoints/auth.py` | `app/api/v1/endpoints/auth.py` | API Tier | Update to query canonical `users` table with password verification. |
| `app/api/v1/endpoints/schedules.py` | `app/api/v1/endpoints/schedules.py` | API Tier | Replace stub logic with CP-SAT solver `generate_timetable()`. Commit results to `schedules` and `timetable_entries`. |
| `app/api/v1/endpoints/reschedule.py` | `app/api/v1/endpoints/reschedule.py` | API Tier | Replace stub impact logic with CP-SAT rescheduler `reschedule()`. |
| `app/api/v1/endpoints/bookings.py` | `app/api/v1/endpoints/bookings.py` | API Tier | Update queries to Neon `booking_requests` with role category caps and anti-self-approval. |
| `app/api/v1/endpoints/exams.py` | `app/api/v1/endpoints/exams.py` | API Tier | Connect `/generate` to `ExamScheduler`. Store seat allocations in `exam_room_allocations`. |
| `app/api/v1/endpoints/dashboards.py` | `app/api/v1/endpoints/dashboards.py` | API Tier | Update data aggregation queries to read from Neon tables. |
| `app/api/v1/endpoints/timetable.py` | `app/api/v1/endpoints/timetable.py` | API Tier | Update query to join `sessions` with `timetable_entries`. |
| `app/api/v1/endpoints/rooms.py` | `app/api/v1/endpoints/rooms.py` | API Tier | Update to query Neon `rooms` and `room_unavailabilities`. |
| `app/api/v1/endpoints/analytics.py` | `app/api/v1/endpoints/analytics.py` | API Tier | Wire to `AnalyticsService`. |
| `app/api/v1/endpoints/audit.py` | `app/api/v1/endpoints/audit.py` | API Tier | Query Neon `audit_logs`. |

---

## 3. Agentic AI & RAG Knowledge Base (`app/ai/`)

| Current Source Path | Future Target Path | Future Ownership | Required Integration Action |
| :--- | :--- | :--- | :--- |
| `app/ai/llm_factory.py` | `app/ai/llm_factory.py` | AI Tier | Retain as-is. Manages TinyLlama ChatHuggingFace and mock fallback. |
| `app/ai/agent/orchestrator.py` | `app/ai/agent/orchestrator.py` | AI Tier | Retain as-is. Multi-turn dialogue orchestrator with slot filling. |
| `app/ai/agent/intent.py` | `app/ai/agent/intent.py` | AI Tier | Retain as-is. English and Hinglish intent classifier and entity extractor. |
| `app/ai/agent/tools.py` | `app/ai/agent/tools.py` | AI Tier | **Crucial update:** Re-point all 10 tools to query updated Neon PostgreSQL models and application services. |
| `app/ai/agent/context.py` | `app/ai/agent/context.py` | AI Tier | Retain as-is. Manages session slots and multi-turn state. |
| `app/ai/rag/vector_store.py` | `app/ai/rag/vector_store.py` | RAG Tier | Retain as-is. Hybrid BM25 and dense semantic store. |
| `app/ai/rag/retrieval_service.py`| `app/ai/rag/retrieval_service.py`| RAG Tier | Connect to Neon's `knowledge_documents` and `document_chunks`. |
| `app/ai/rag/chunking.py` | `app/ai/rag/chunking.py` | RAG Tier | Retain as-is. Handles markdown sliding window chunking. |
| `app/ai/rag/evaluation.py` | `app/ai/rag/evaluation.py` | RAG Tier | Retain as-is. RAG evaluation benchmark framework. |
| `app/api/v1/endpoints/assistant.py`| `app/api/v1/endpoints/assistant.py`| AI Tier | Retain as-is. Handles `/chat`, `/confirm-action`, and `/dean-insights`. |
| `app/api/v1/endpoints/rag.py` | `app/api/v1/endpoints/rag.py` | RAG Tier | Retain as-is. REST endpoints for querying and ingesting knowledge documents. |

---

## 4. Test Suites & Verification (`tests/`, `CITRIX/CITRIX/tests/`)

| Current Source Path | Future Target Path | Test Scope | Required Integration Action |
| :--- | :--- | :--- | :--- |
| `CITRIX/CITRIX/tests/test_timetable_solver.py` | `tests/test_timetable_solver.py` | Solver (1 test) | Move to root `tests/`. Verify CP-SAT produces 0 hard violations. |
| `CITRIX/CITRIX/tests/test_fest_bookings.py` | `tests/test_fest_bookings.py` | Solver (1 test) | Move to root `tests/`. Verify Spectra Fest Week booking logic. |
| `CITRIX/CITRIX/tests/test_exam_scheduler.py` | `tests/test_exam_scheduler.py` | Solver (1 test) | Move to root `tests/`. Verify midterm exam half-capacity scheduling. |
| `CITRIX/CITRIX/tests/test_rescheduler.py` | `tests/test_rescheduler.py` | Solver (1 test) | Move to root `tests/`. Verify minimal-change disruption repair. |
| `CITRIX/CITRIX/tests/test_s2_regression.py` | `tests/test_s2_regression.py` | Solver (8 tests) | Move to root `tests/`. Verify S2 gap minimization regression benchmarks. |
| `CITRIX/CITRIX/tests/test_database_integration.py`| `tests/test_database_integration.py`| Database (12 tests) | Move to root `tests/`. Verify PostgreSQL schema and table queries. |
| `CITRIX/CITRIX/tests/test_database.py` | `tests/test_database.py` | Database (3 tests) | Move to root `tests/`. Verify Neon URL masking and pooling. |
| `CITRIX/CITRIX/tests/test_data_loader.py` | `tests/test_data_loader.py` | Engine (3 tests) | Move to root `tests/`. Verify dataset loading and disruption diffing. |
| `CITRIX/CITRIX/tests/test_rag.py` | `tests/test_rag_pipeline.py` | RAG (2 tests) | Move to root `tests/`. Verify document indexing and retrieval. |
| `CITRIX/CITRIX/tests/test_ai_assistant.py` | `tests/test_ai_assistant.py` | AI (4 tests) | Move to root `tests/`. Verify assistant parsing and booking proposals. |
| `tests/test_auth.py` | `tests/test_auth.py` | Auth (3 tests) | Retain. Adapt fixture to execute against PostgreSQL user table. |
| `tests/test_rbac.py` | `tests/test_rbac.py` | RBAC (2 tests) | Retain. Verify dashboard protection and action authorization. |
| `tests/test_approval_security.py` | `tests/test_approval_security.py` | Security (3 tests) | Retain. Verify category cap, anti-self-approval, and lab approvals. |
| `tests/test_data_isolation.py` | `tests/test_data_isolation.py` | Security (3 tests) | Retain. Verify student and faculty timetable scoping. |
| `tests/test_audit_log.py` | `tests/test_audit_log.py` | Audit (1 test) | Retain. Verify audit trail recording and tamper prevention. |
| `tests/test_citrix_agent.py` | `tests/test_citrix_agent.py` | AI (5 tests) | Retain. Verify intent parsing, tools, confirmations, and insights. |
| `tests/test_agent_scenarios.py` | `tests/test_agent_scenarios.py` | AI (3 tests) | Retain. Verify end-to-end multi-turn scenarios. |
| `tests/test_ai_security.py` | `tests/test_ai_security.py` | AI (4 tests) | Retain. Verify prompt-injection defense and token protection. |
| `tests/test_citrix_rag.py` | `tests/test_citrix_rag.py` | RAG (4 tests) | Retain. Verify semantic search, citations, and role filtering. |
| `tests/test_rag_evaluation.py` | `tests/test_rag_evaluation.py` | RAG (1 test) | Retain. Verify automated RAG benchmark metrics. |

---

## 5. Files Scheduled for Retirement (Post-Migration)

| File Path | Current Role | Retirement Action | Condition for Removal |
| :--- | :--- | :--- | :--- |
| `campus_ops.db` | Local SQLite database | Archive & Delete | Only after all 65 tests pass on Neon PostgreSQL. |
| `test_campus_ops.db` | Test SQLite database | Archive & Delete | Only after all 65 tests pass on Neon PostgreSQL. |
| `app/models/base.py` | SQLite timestamp mixin | Consolidate | Replaced by `api/models.py` declarative base. |
| `app/models/room.py` | SQLite room models | Retire | Replaced by canonical `Room` and `RoomUnavailability`. |
| `app/models/faculty.py` | SQLite faculty models | Retire | Replaced by `FacultyProfile`, `FacultyUnavailability`, `StudentGroup`, `Course`. |
| `app/models/booking.py` | SQLite booking model | Consolidate | Merged into canonical `BookingRequest` and `BookingCancellation`. |
| `app/models/schedule.py` | SQLite schedule models | Retire | Replaced by `Schedule`, `ScheduleVersion`, and `TimetableEntry`. |
| `app/models/session.py` | SQLite session model | Retire | Replaced by `Session` and `SessionGroup`. |
| `app/models/exam.py` | SQLite exam model | Retire | Replaced by `Exam`, `ExamSession`, and `ExamRoomAllocation`. |
| `CITRIX/CITRIX/api/main.py` | Prototype FastAPI app | Retire | Superseded by root `app/main.py`. |
