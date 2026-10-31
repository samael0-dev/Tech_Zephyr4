# CITRIX — Integration Risk Register & Mitigation Strategy

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint (Pre-Implementation)  
**Scope:** Risk Assessment across Data, Solver, Security, AI, and Network Boundaries

---

## 1. Risk Evaluation Matrix

Risks are categorized by **Likelihood** (Low, Medium, High) and **Impact** (Low, Medium, High, Critical):

| Risk ID | Risk Domain | Description | Likelihood | Impact | Severity | Mitigation Summary |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **R01** | Database | PostgreSQL vs. SQLite Schema Incompatibilities | High | High | **CRITICAL** | Incremental Alembic migration `002`; replace SQLite models with 30 canonical models. |
| **R02** | Database | Alembic Migration History Drift | Medium | High | **HIGH** | Stamp migration baseline at `001_initial_citrix_schema`; test migration on staging branch. |
| **R03** | Engine | Solver Execution & Timeout on Cloud Resources | Medium | High | **HIGH** | Configurable `time_limit_seconds`; worker parameterization; baseline fallback. |
| **R04** | Security | Anti-Self-Approval Bypass & Permission Gaps | Medium | Critical | **CRITICAL** | Strict gate check `enforce_no_self_approval()` applied in service layer and API routes. |
| **R05** | AI / Agent | AI Tool Calling Direct Database Mutation / Bypass | Medium | High | **HIGH** | State-modifying actions produce confirmation proposals; tokens required for execution. |
| **R06** | Concurrency | Race Conditions in Concurrent Venue Bookings | Medium | High | **HIGH** | Row-level locking (`SELECT ... FOR UPDATE`) during booking approval transactions. |
| **R07** | Network | Raw TCP Port 5432 Resets (`WinError 10054`) | High | High | **CRITICAL** | Dual-transport architecture: TCP pooler with transparent HTTPS fallback over TLS 443. |
| **R08** | Business Logic| Competing Scheduling Logic & Duplicate Solvers | Low | High | **MEDIUM** | Remove mock stubs in `schedules.py`; establish CP-SAT as single authoritative solver. |
| **R09** | Architecture | Timetable Version Drift & Unvalidated Commits | Low | Critical | **HIGH** | Mandatory `validator.py` gate check (0 hard violations) prior to committing active status. |
| **R10** | Testing | Test Suite Execution Mutating Production Data | Medium | High | **HIGH** | Test database transactions with automatic rollback fixture (`db.rollback()`). |
| **R11** | RAG / Knowledge| Sensitive Policy Leakage to Unprivileged Roles | Low | High | **MEDIUM** | Role-based document metadata filtering (`access_role_minimum`). |
| **R12** | API Contracts| Frontend Dashboard Breakdown Due to Model Changes | Low | Medium | **MEDIUM** | Pydantic response schemas maintain invariant API response contract. |

---

## 2. Detailed Risk Profiles & Concrete Mitigations

### R01: PostgreSQL vs. SQLite Schema Incompatibilities
- **Root Cause:** The friend's SQLite project relies on denormalized JSON columns (`faculty.unavailable`, `sessions.groups`, `exams.rooms`, `room_unavailabilities.periods`), whereas Neon PostgreSQL implements 30 normalized tables with composite primary/unique keys and foreign keys.
- **Concrete Impact:** Direct substitution would cause ORM crashes (`AttributeError`, `OperationalError`) and broken timetable joins.
- **Mitigation Strategy:**
  1. Port the 30 canonical SQLAlchemy models from `CITRIX/CITRIX/api/models.py` into `app/models/`.
  2. Implement Alembic migration `002_application_alignment` to add only the missing columns (`hashed_password`, `username`, `last_login_at`, `requester_user_id`, `decided_by_user_id`).
  3. Update queries in `app/services/` to join `session_groups`, `faculty_unavailabilities`, and `exam_room_allocations`.

### R02: Alembic Migration History Drift
- **Root Cause:** If migrations are generated haphazardly without reference to the existing `alembic_version` in Neon, Alembic may attempt to re-create existing tables and fail with `DuplicateTable` errors.
- **Concrete Impact:** Migration pipeline failure blocking deployment.
- **Mitigation Strategy:**
  1. Base migration `002` strictly on revision `001_initial_citrix_schema` (`down_revision = '001_initial_citrix_schema'`).
  2. Use `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` DDL guards.

### R03: Solver Execution & Timeout on Cloud Resources
- **Root Cause:** CP-SAT solving is CPU-intensive. On resource-constrained serverless instances, complex disruptions could approach request timeout limits (e.g. 30 seconds).
- **Concrete Impact:** FastAPI request worker timeouts (HTTP 504 Gateway Timeout).
- **Mitigation Strategy:**
  1. Set `SolverOptions.time_limit_seconds = 25.0` with `num_workers = 4`.
  2. If CP-SAT returns status `FEASIBLE` within the timeout, accept the solution immediately (sufficient for 0 hard violations).
  3. If the timeout expires without feasibility, return an informative HTTP 422 error detailing the exact constraint bottlenecks.

### R04: Anti-Self-Approval Bypass & Permission Gaps
- **Root Cause:** An administrator submitting a venue booking or disruption request might be able to invoke the approval endpoint for their own submission.
- **Concrete Impact:** Severe violation of institutional governance and competition security specifications.
- **Mitigation Strategy:**
  1. Record `requester_user_id` on all `booking_requests` and `disruptions`.
  2. Enforce `enforce_no_self_approval(req.requester_user_id, current_user.id)` in both the service layer and endpoint handlers.
  3. Verify with automated pytest security scenarios (`tests/test_approval_security.py`).

### R05: AI Tool Calling Direct Database Mutation / Bypass
- **Root Cause:** If the AI Assistant had direct SQL execution privileges, prompt injection or hallucinations could manipulate campus schedules or approve rejected bookings.
- **Concrete Impact:** Data corruption, constraint violations, and unauthorized state mutation.
- **Mitigation Strategy:**
  1. State-modifying tools (`propose_booking_request`, `propose_rescheduling_request`) are read-only proposals returning `requires_confirmation: true`.
  2. Actions can only be executed by a human user presenting the HMAC-signed action token to `POST /api/v1/assistant/confirm-action`.
  3. Every confirmed action undergoes standard service validation.

### R06: Race Conditions in Concurrent Venue Bookings
- **Root Cause:** Two coordinators simultaneously approving two different events for the same venue (e.g. `SH-1` on Thursday Period 10).
- **Concrete Impact:** Double-booked venues during Spectra Fest Week.
- **Mitigation Strategy:**
  1. Use database row-level locking during approval:
     ```python
     booking = db.query(BookingRequest).filter(BookingRequest.id == b_id).with_for_update().first()
     ```
  2. Verify venue availability inside the locked transaction before updating status to `approved`.

### R07: Raw TCP Port 5432 Resets (`WinError 10054`)
- **Root Cause:** Firewalls in university or enterprise networks routinely terminate persistent outbound raw TCP connections on port 5432.
- **Concrete Impact:** Random connection drops and socket errors in application threads.
- **Mitigation Strategy:**
  1. Primary connection pool configured with `pool_pre_ping=True` and `pool_recycle=300`.
  2. Transparent fallback to Neon Cloud HTTPS REST transport (`https://<neon-host>/sql` over TLS port 443) when socket resets occur, as verified in `CITRIX/CITRIX/api/database.py`.

### R08: Competing Scheduling Logic & Duplicate Solvers
- **Root Cause:** The friend's project contained mock placement logic in `schedules.py`, while `CITRIX/CITRIX` had the true CP-SAT solver.
- **Concrete Impact:** Divergent schedule outputs; confusion regarding which engine is authoritative.
- **Mitigation Strategy:**
  1. Fully delete the mock placement loops in `app/api/v1/endpoints/schedules.py`.
  2. Wire `TimetableService` directly to `app/engine/scheduler/solver.py`.

### R09: Timetable Version Drift & Unvalidated Commits
- **Root Cause:** A developer or service committing a repaired timetable without validating it through `validator.py`.
- **Concrete Impact:** Hard constraint violations appearing in published timetables.
- **Mitigation Strategy:**
  1. `commit_schedule()` strictly requires `validator.py` output with `hard_violations_count == 0` as a mandatory precondition.
  2. Any violation automatically aborts the database transaction.

### R10: Test Suite Execution Mutating Production Data
- **Root Cause:** Running 65 integration tests against the live Neon database could insert test users or alter canonical timetable rows.
- **Concrete Impact:** Corruption of the 1,169 canonical domain records.
- **Mitigation Strategy:**
  1. Test fixture in `tests/conftest.py` executes inside nested transactions:
     ```python
     @pytest.fixture
     def db_session():
         connection = engine.connect()
         transaction = connection.begin()
         session = SessionLocal(bind=connection)
         yield session
         session.close()
         transaction.rollback()
         connection.close()
     ```
  2. All test inserts and modifications are automatically rolled back, guaranteeing 100% preservation of canonical records.
