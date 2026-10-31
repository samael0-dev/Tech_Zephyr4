# CITRIX — Phase 3: Database Migration Report

**Date:** 2026-10-31  
**Target Database:** Neon Serverless PostgreSQL 18.6 (`neondb`)  
**Migration Head:** `002_application_alignment`  
**Previous Migration:** `001_initial_canonical`  
**Pre-Migration Snapshot:** `exports/backup_neon_before_migration_002.json`

---

## 1. Migration Overview

The purpose of migration `002_application_alignment` was to bridge the application schema requirements with the canonical PostgreSQL database schema without altering or dropping any of the 1,169 canonical domain records.

### Pre-Migration Safeguards
Before applying any DDL statements:
- An automated JSON export was executed against Neon, dumping all 1,170 rows (1,169 domain records + 1 alembic version row) across all 30 canonical tables.
- Stored at: `exports/backup_neon_before_migration_002.json`.

---

## 2. Schema DDL Changes Applied (`002_application_alignment`)

The migration was created at `CITRIX/CITRIX/alembic/versions/002_application_alignment.py` and applied via `CITRIX/CITRIX/scripts/apply_migration_002.py`.

### 2.1 Table: `users`
Enhanced canonical identity table to support JWT authentication, role-based access control, and user personas:
- Added `username` (`VARCHAR(64)`, `UNIQUE`, nullable)
- Added `hashed_password` (`VARCHAR(256)`, nullable)
- Added `last_login_at` (`TIMESTAMPTZ`, nullable)
- Added `role` (`VARCHAR(32)`, indexed, nullable)
- Added `faculty_id` (`VARCHAR(32)`, indexed, nullable)
- Added `student_group_id` (`VARCHAR(32)`, indexed, nullable)
- Added `club_name` (`VARCHAR(64)`, indexed, nullable)
- Added index: `ix_users_username`
- Added index: `ix_users_role`

### 2.2 Table: `booking_requests`
Added application workflow tracking fields:
- Added `requester_user_id` (`VARCHAR(64)`, `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL`)
- Added `decided_by_user_id` (`VARCHAR(64)`, `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL`)
- Added `decided_at` (`TIMESTAMPTZ`, nullable)
- Added index: `idx_booking_req_user`
- Added index: `idx_booking_decided_by`

### 2.3 Table: `disruptions` (New Table)
Created table to record operational timetable disruptions:
- `id` (`SERIAL PRIMARY KEY`)
- `type` (`VARCHAR(32)`, non-null: `faculty_unavailable`, `room_closed`, `emergency_cancellation`)
- `faculty_id` (`VARCHAR(32)`, `FOREIGN KEY REFERENCES faculty_profiles(id) ON DELETE SET NULL`)
- `room_id` (`VARCHAR(32)`, `FOREIGN KEY REFERENCES rooms(id) ON DELETE SET NULL`)
- `day` (`VARCHAR(4)`, non-null)
- `periods` (`JSONB`, non-null)
- `reason` (`TEXT`, nullable)
- `reported_by_user_id` (`VARCHAR(64)`, `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL`)
- `status` (`VARCHAR(32)`, default `'pending'`, non-null)
- `simulation_result` (`JSONB`, nullable)
- `created_at` (`TIMESTAMPTZ`, default `NOW()`, non-null)
- Added index: `idx_disruption_day_type`
- Added index: `idx_disruption_status`

### 2.4 Table: `audit_logs`
Aligned with application security tracking:
- Added `actor_role` (`VARCHAR(32)`, nullable)
- Added `status` (`VARCHAR(32)`, default `'SUCCESS'`, non-null)
- Added `ip_address` (`VARCHAR(64)`, nullable)

### 2.5 Table: `knowledge_documents`
Aligned with RAG document management:
- Added `access_role_minimum` (`VARCHAR(32)`, default `'student'`, non-null)
- Added `raw_content` (`TEXT`, nullable)

### 2.6 Migration Tracking
- Updated `alembic_version.version_num` from `001_initial_canonical` to `002_application_alignment`.

---

## 3. Data Migration from SQLite to Neon

The data migration script `CITRIX/CITRIX/scripts/migrate_users_from_sqlite.py` extracted and migrated user records from `campus_ops.db`:

1. **40 Faculty Accounts (`F01` to `F40`):**
   - Linked to existing canonical `faculty_profiles` records.
   - Updated existing rows in `users` with `username = f01`..`f40`, `email = f01@cit.edu`, bcrypt hashed password, and `faculty_id = F01`..`F40`.
2. **11 Persona Accounts:**
   - `usr-admin-01`: Dean of Academics (`dean@cit.edu`, `role = admin`)
   - `usr-coord-cse`..`ce`: 5 Department Coordinators (`CSE`, `ECE`, `ME`, `EE`, `CE`)
   - `usr-club-dramatics`, `coding`, `robotics`: 3 Club Representatives
   - `usr-student-y1a`, `student-y2cse`: 2 Student accounts
   - Seeded into `users` and mapped into `user_roles`.
3. **Total User Accounts in Neon:** 56 (was 45).

---

## 4. Verification and Record Count Audit

Executed verification via `CITRIX/CITRIX/scripts/verify_db_counts.py`. Every canonical domain record from the initial ingested dataset was verified:

| Table Name | Initial Pre-Migration Count | Post-Migration Count | Status | Notes |
|---|---|---|---|---|
| `roles` | 7 | 7 | Verified | Canonical system roles |
| `buildings` | 12 | 12 | Verified | Canonical campus buildings |
| `departments` | 10 | 10 | Verified | Academic & admin departments |
| `users` | 45 | 56 | Verified | 45 existing + 11 persona accounts |
| `user_roles` | 45 | 56 | Verified | Identity role assignments |
| `faculty_profiles` | 40 | 40 | Verified | Faculty profiles F01..F40 intact |
| `faculty_unavailabilities` | 95 | 95 | Verified | S1 constraint unavailabilities intact |
| `student_groups` | 14 | 14 | Verified | Y1..Y4 cohort groups intact |
| `academic_terms` | 1 | 1 | Verified | Fall 2026 / cit-public-v1 |
| `academic_periods` | 13 | 13 | Verified | Periods 1 through 13 intact |
| `courses` | 62 | 62 | Verified | Canonical curriculum courses |
| `rooms` | 27 | 27 | Verified | All 27 classrooms, labs, lecture halls |
| `room_unavailabilities` | 13 | 13 | Verified | Maintenance unavailability windows |
| `sessions` | 189 | 189 | Verified | Canonical lecture/lab/tut sessions |
| `session_groups` | 240 | 240 | Verified | Session group cohort mappings |
| `event_categories` | 4 | 4 | Verified | Fest week priority categories |
| `booking_requests` | 25 | 25 | Verified | Competition booking requests BR-01..25 |
| `booking_cancellations` | 1 | 1 | Verified | BR-04 cancellation record intact |
| `exam_sessions` | 2 | 2 | Verified | Morning (AM) / Afternoon (PM) |
| `exams` | 41 | 41 | Verified | Canonical midsem exams intact |
| `exam_room_allocations` | 51 | 51 | Verified | Canonical exam seat allocations |
| `schedules` | 1 | 1 | Verified | Baseline active schedule intact |
| `schedule_versions` | 1 | 1 | Verified | Baseline schedule version intact |
| `timetable_entries` | 189 | 189 | Verified | 189 baseline timetable placements |
| `knowledge_documents` | 3 | 3 | Verified | Institutional policy docs intact |
| `document_chunks` | 38 | 38 | Verified | Ingested policy text chunks intact |
| **Total Rows** | **1,169** | **1,191** | **Verified** | **100% Data Integrity Preserved** |

---

## 5. Constraint and Foreign Key Integrity

- Zero orphaned rows detected.
- All foreign keys (`users.department_code -> departments.code`, `faculty_profiles.user_id -> users.id`, `booking_requests.requester_user_id -> users.id`) validated.
- `BR-03` analysis: Verified `requested_room` is `NULL` and `assigned_room_id` is `"AUD"` with capacity 400, satisfying attendance 300 without foreign key conflicts.
- Rollback capability verified: Migration 002 includes full reversible `downgrade()` implementation.
