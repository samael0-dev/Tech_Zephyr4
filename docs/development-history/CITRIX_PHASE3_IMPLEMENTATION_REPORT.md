# CITRIX — Phase 3: Complete PostgreSQL Consolidation Implementation Report

**Status:** Completed  
**Authoritative Database:** Neon Serverless PostgreSQL 18.6  
**Host:** `ep-quiet-lake-b3ejtk83.c-4.ap-southeast-1.aws.neon.tech`  
**Database:** `neondb`  
**Engine:** SQLAlchemy 2.0 with Psycopg2 / HTTPS REST dual transport  
**Alembic Migration Level:** `002_application_alignment`

---

## 1. Executive Summary

Phase 3 has successfully consolidated the CITRIX database architecture, establishing the deployed Neon Serverless PostgreSQL 18.6 database as the single, authoritative source of truth for the entire application.

The previous fragmented database state consisted of:
1. A deployed Neon PostgreSQL 18.6 database hosting 30 canonical domain tables and 1,169 competition records.
2. A separate SQLite database (`campus_ops.db`) used by the FastAPI application layer with demo credentials and disparate model definitions.

Through Phase 3:
- **100% of Canonical Data Preserved:** All 1,169 canonical domain records, IDs, foreign keys, and integrity constraints in Neon remain strictly intact.
- **Alembic Migration 002 Applied:** Applied non-destructive schema alignment adding application-required columns (`username`, `hashed_password`, `role`, `actor_role`, `disruptions`, `access_role_minimum`).
- **User Credentials Migrated:** Bcrypt hashed credentials for all 40 faculty members (`F01`..`F40`) and 11 persona accounts (Dean, 5 Department Coordinators, 3 Clubs, 2 Students) migrated into Neon, expanding users to 56 verified accounts.
- **Canonical Model Consolidation:** Replaced SQLite-oriented models in `app/models/` with canonical models in `app/models/canonical.py`, providing bi-directional synonym support (`name <-> full_name`, `department <-> department_code`, `ScheduleVersion <-> Schedule`).
- **SQLite Active Dependency Retired:** Removed SQLite connection defaults, removed `check_same_thread` flags, safely archived `campus_ops.db` to `exports/archive/campus_ops.db`, and updated `tests/conftest.py` to use hermetic zero-disk-file in-memory testing.
- **Dual-Transport Database Layer:** Enhanced `app/core/database.py` with intelligent connection pooling and dual-transport support (standard PostgreSQL port 5432 with transparent port 443 HTTPS REST fallback for restricted ISP/firewall environments).

---

## 2. Neon Connection & Session Management

### 2.1 Connection Details (Credentials Masked)
- **Database Engine:** PostgreSQL 18.6 (Neon Serverless)
- **Driver:** `postgresql+psycopg2://`
- **Masked URL:** `postgresql+psycopg2://neondb_owner:***@ep-quiet-lake-b3ejtk83.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
- **SSL Enforcement:** `sslmode=require` strictly enforced across all connection paths.
- **Credential Protection:** `mask_database_url()` active across all logs and health check diagnostics.

### 2.2 Connection Pooling Configuration
Configured in `app/core/database.py`:
- `pool_pre_ping = True` (actively validates server health before checking out connections)
- `pool_recycle = 300` (recycles connections every 5 minutes to prevent stale serverless timeouts)
- `pool_size = 5` (base pool sized for serverless efficiency)
- `max_overflow = 10` (permits transient bursts up to 15 concurrent connections)
- `pool_timeout = 30.0` (30-second checkout ceiling)

### 2.3 Network Transport Diagnostic & Dual-Transport Resilience
During diagnostic testing on the local Windows environment, network probing revealed that local ISP firewalls actively terminate outbound TLS ClientHello packets on port 5432 (`WinError 10054 Connection reset by peer`), whereas outbound HTTPS port 443 is unrestricted.

To guarantee zero downtime across both local developer workstations and production cloud containers (Docker/Linux where port 5432 connects cleanly), `app/core/database.py` implements dual-transport execution:
1. **Primary Standard Transport (Port 5432):** Standard SQLAlchemy TCP connection with Psycopg2 pooling and transactions.
2. **Neon HTTPS REST Transport (Port 443):** Direct execution via `https://<neon-host>/sql` with TLS SNI authentication for environments where port 5432 is restricted.

---

## 3. Canonical Model Consolidation

Application models in `app/models/` have been consolidated into `app/models/canonical.py` (and individual re-export modules) matching the 30 canonical domain tables.

### 3.1 Mapping & Synonym Matrix

| Application Model | Canonical Table | Primary Key | Key Compatibility Synonyms |
|---|---|---|---|
| `User` | `users` | `id` (e.g. `usr-admin-01`, `F01`) | `name = synonym("full_name")`<br>`department = synonym("department_code")` |
| `Role` | `roles` | `id` (e.g. `admin`, `faculty`) | Canonical role catalog |
| `Department` | `departments` | `code` (e.g. `CSE`, `ECE`) | Relationship: `faculty_profiles`, `student_groups`, `courses` |
| `Faculty` / `FacultyProfile` | `faculty_profiles` | `id` (e.g. `F01`..`F40`) | `department = synonym("department_code")`<br>`unavailable` property getter/setter |
| `StudentGroup` | `student_groups` | `id` (e.g. `Y1-A`) | `department = synonym("department_code")` |
| `Course` | `courses` | `id` (e.g. `CS101`) | `name = synonym("title")`<br>`department = synonym("department_code")` |
| `Room` | `rooms` | `id` (e.g. `LH-1`, `AUD`) | `building = synonym("building_id")`<br>`exam_capacity` auto-calculation |
| `RoomUnavailability` | `room_unavailabilities` | `id` (autoincrement) | `periods` list getter/setter |
| `SessionEntity` / `Session` | `sessions` | `id` (e.g. `MA101-AB-L1`) | `groups` list getter/setter<br>`fixed_slot` dict getter/setter |
| `Schedule` / `ScheduleVersion` | `schedules` | `id` (e.g. `SCHED-BASELINE`) | `version_name = synonym("name")`<br>`soft_penalty_score = synonym("soft_penalty_total")`<br>`created_by_user_id = synonym("created_by")`<br>`solver_status`, `solver_metrics` properties |
| `ScheduledSession` / `TimetableEntry` | `timetable_entries` | `id` (autoincrement) | `is_override = synonym("is_overridden_for_fest")`<br>`displaced_by = synonym("override_displaced_by")` |
| `BookingRequest` | `booking_requests` | `id` (e.g. `BR-01`) | `requester_user_id`, `decided_by_user_id`, `decided_at` |
| `Exam` | `exams` | `id` (e.g. `EXAM-MA101`) | `day = synonym("scheduled_day")`<br>`session = synonym("scheduled_session")` |
| `AuditLog` | `audit_logs` | `id` (autoincrement) | `actor_id = synonym("user_id")` |
| `KnowledgeDocument` | `knowledge_documents` | `id` (e.g. `doc-leave-policy`) | `category = synonym("document_type")`<br>`department`, `file_type`, `uploaded_by_user_id` |
| `DocumentChunk` | `document_chunks` | `id` | Linked to `knowledge_documents` |
| `Disruption` | `disruptions` | `id` (autoincrement) | Created via migration 002 |

---

## 4. SQLite Retirement

1. **Root Database Files Removed:** `campus_ops.db` and `test_campus_ops.db` have been completely removed from the project root.
2. **Recoverable Archive:** `campus_ops.db` is securely preserved in `exports/archive/campus_ops.db` for archival compliance.
3. **Configuration Defaults:** `.env.example` and `app/core/config.py` default to Neon PostgreSQL connection parameters.
4. **Codebase Grep Verification:** Zero active occurrences of `campus_ops.db`, `check_same_thread`, or `sqlite` remain in the application package (`app/`).
5. **Hermetic Test Execution:** `tests/conftest.py` has been transitioned to zero-file in-memory SQLite with `StaticPool` for hermetic test execution, guaranteeing that `test_campus_ops.db` is never created on disk and that canonical Neon data cannot be mutated by test runs.

---

## 5. Verification & Service Layer Status

- **Database Verification:** `CITRIX/CITRIX/scripts/verify_db_counts.py` confirms all 1,169 canonical domain rows and 56 user accounts exist in Neon.
- **Application Test Suite:** 29 of 29 application tests passed in `tests/`.
- **Engine Test Suite:** Database connectivity and all 12 database integration query tests passed against Neon PostgreSQL in `CITRIX/CITRIX/tests`.
