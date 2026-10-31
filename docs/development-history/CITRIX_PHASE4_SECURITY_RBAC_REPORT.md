# CITRIX Phase 4: Security & RBAC Implementation Report

**Date:** October 31, 2026  
**System:** CITRIX Campus Operations & Intelligence Platform  
**Authority Model:** Single Database Architecture (Neon PostgreSQL 18.6)  
**Security Standards:** Least Privilege RBAC + Mandatory Confirmation Gates + Immutable Audit Logs

---

## 1. Role-Based Access Control (RBAC) Architecture

CITRIX enforces strict multi-tier Role-Based Access Control mapped across all 56 canonical user accounts in PostgreSQL:

### 1.1 Account Inventory & Role Mapping

1. **System Persona Accounts (11 Accounts):**
   - `dean@cit.edu` (Role: `admin`) — Full campus-wide administrative authority.
   - `coordinator.cse@cit.edu` (Role: `department_coordinator`, Department: `CSE`) — CSE department coordinator.
   - `coordinator.ece@cit.edu` (Role: `department_coordinator`, Department: `ECE`) — ECE department coordinator.
   - `coordinator.me@cit.edu` (Role: `department_coordinator`, Department: `ME`) — ME department coordinator.
   - `coordinator.ce@cit.edu` (Role: `department_coordinator`, Department: `CE`) — CE department coordinator.
   - `coding@cit.edu` (Role: `club`, Club: `Coding Club`) — Technical club lead.
   - `robotics@cit.edu` (Role: `club`, Club: `Robotics Club`) — Technical club lead.
   - `dramatics@cit.edu` (Role: `club`, Club: `Dramatics Society`) — Cultural club lead.
   - `music@cit.edu` (Role: `club`, Club: `Music Club`) — Cultural club lead.
   - `student.y1a@cit.edu` (Role: `student`, Group: `Y1-A`) — Year 1 Section A student.
   - `student.y2cse@cit.edu` (Role: `student`, Group: `Y2-CSE`) — Year 2 CSE student.

2. **Faculty Persona Accounts (40 Accounts):**
   - `f01@cit.edu` through `f40@cit.edu` (Role: `faculty`, linked to canonical faculty IDs `F01`–`F40`).

3. **Canonical System Accounts (5 Accounts):**
   - `admin_spectra`, `club_robotics`, `coord_ece`, `dean_academics`, `hod_cse`.

---

## 2. Permission Matrix & Operational Gates

The table below outlines the exact permission enforcement across all endpoints:

| Permission | Enforced Roles | Operational Scope |
|---|---|---|
| `schedule:generate` | `admin` | Solves academic timetable proposals via CP-SAT. |
| `timetable:approve_change` | `admin` | **Admin-Only Publication Gate:** Activates academic timetables and applies disruption rescheduling proposals. |
| `exam:generate` | `admin` | Generates and publishes midsem examination schedules. |
| `booking:approve_all` | `admin` | Evaluates all campus fest bookings globally. |
| `booking:approve_dept_lab` | `department_coordinator` | Approves booking requests for department-specific laboratories only. |
| `timetable:request_change` | `faculty`, `department_coordinator`, `admin` | Submits disruption requests (faculty illness, conference travel, room closure). |
| `booking:create` | `club`, `faculty`, `department_coordinator`, `admin` | Submits venue booking requests with role category cap. |
| `timetable:view_group` | `student` | Restricted view of timetable sessions for enrolled student group only. |
| `timetable:view_faculty` | `faculty` | Restricted view of timetable sessions for assigned teaching schedule only. |

---

## 3. Four Core Security Invariants

### 3.1 The Admin-Only Publication Gate
- **Invariant:** Neither AI agents, regular faculty, department coordinators, nor background solvers can unilaterally publish or activate a timetable or exam schedule.
- **Enforcement:**
  - `POST /api/v1/schedules/{id}/publish` requires `timetable:approve_change` (`admin` role only). Faculty attempting to publish receive `HTTP 403 Forbidden: Access forbidden: Missing required permission 'timetable:approve_change'`.
  - `POST /api/v1/exams/publish` requires `exam:generate` (`admin` role only). Students and faculty attempting to publish receive `HTTP 403 Forbidden`.
  - `POST /api/v1/reschedule/{id}/approve` requires `timetable:approve_change` (`admin` role only). Non-admins receive `HTTP 403 Forbidden`.

### 3.2 The No-Self-Approval Rule
- **Invariant:** Nobody can approve their own request under any circumstances.
- **Enforcement:**
  - Implemented in `app/core/rbac.py` (`enforce_no_self_approval`, `check_booking_approval_authority`).
  - Tested in `tests/test_approval_security.py` and `tests/test_phase4_workflows.py`.
  - When an Administrator (`dean@cit.edu`) creates an Institute Event booking request or a disruption request, they cannot approve it. Approving their own request returns `HTTP 403 Forbidden: No Self-Approval rule: You cannot approve your own request.`

### 3.3 Role-Based Data Isolation
- **Student Data Isolation:** Students can only query timetable sessions and examination schedules for their enrolled group (`student_group_id`). Querying another group's schedule returns empty or filtered results.
- **Faculty Data Isolation:** Faculty members only see their personal teaching schedule unless specifically authorized.
- **Department Coordinator Boundary:** Department coordinators can only approve venue bookings for laboratories within their department (e.g., `coordinator.cse@cit.edu` can approve `CS-LAB-1`, but is blocked from approving `AUD` or `ME-LAB-1`).

### 3.4 AI Assistant Confirmation Gate (Human-in-the-Loop)
- **Invariant:** The AI assistant operates strictly as an intelligent operational assistant. It is physically incapable of directly mutating the database.
- **Enforcement:**
  - Operational intents (e.g., "reschedule lecture", "book auditorium") generate an `action_proposal` with `requires_confirmation = True`.
  - The action is only dispatched when the user explicitly calls `POST /api/v1/assistant/confirm-action` with `confirmed=True`.
  - Even after human confirmation, high-impact actions (disruptions and publications) transition to `pending_approval` status, requiring formal administrative review.

---

## 4. Immutable Audit Logging

Every state mutation in the application is recorded in the `audit_logs` table in PostgreSQL:
- **Captured Fields:** `actor_user_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `status` (`SUCCESS`/`FAILED`), `details` (JSON payload), `ip_address`, and `created_at` timestamp.
- **Audit Verification:** Verified by `tests/test_audit_log.py` to ensure logs cannot be modified, bypassed, or forged.
