# CITRIX Phase 5D — Role-Based Access Control & Security Acceptance Audit

**Audit Date**: October 31, 2026 / November 1, 2026  
**Auditor**: Independent Acceptance Auditor  
**System**: CITRIX CampusOS Security Engine & RBAC Matrix  

---

## 1. Executive Summary

This audit assesses the implementation of authentication, authorization, role boundaries, institutional anti-conflict rules, and data isolation across all five system roles:
1. **Admin / Dean of Academic Affairs**
2. **Department Coordinator (CSE)**
3. **Faculty Member**
4. **Student Club Representative**
5. **Student**

---

## 2. Five-Role Authentication Acceptance Matrix

| Role | Username / Identifier | Auth Method | Token Claims Validated | Backend Role Returned | Permissions Count | Status |
|---|---|---|:---:|---|:---:|:---:|
| **Admin** | `dean@cit.edu` | Bearer JWT | `sub`, `role`, `exp`, `iat` | `admin` | 19 permissions | **PASS** |
| **Coordinator** | `coordinator.cse@cit.edu` | Bearer JWT | `sub`, `role`, `dept`, `exp` | `department_coordinator` | 11 permissions | **PASS** |
| **Faculty** | `f01@cit.edu` | Bearer JWT | `sub`, `role`, `faculty_id`, `exp` | `faculty` | 9 permissions | **PASS** |
| **Club** | `coding@cit.edu` | Bearer JWT | `sub`, `role`, `club_name`, `exp` | `club` | 6 permissions | **PASS** |
| **Student** | `student.y1a@cit.edu` | Bearer JWT | `sub`, `role`, `group_id`, `exp` | `student` | 5 permissions | **PASS** |

### Token Expiration & Validation Findings:
- Passwords are validated using Argon2 / bcrypt hashing algorithms.
- Invalid passwords produce HTTP 401 Unauthorized with error code `UNAUTHORIZED`.
- JWT tokens expire according to configured TTL (default: 60 minutes) and require cryptographic signing.
- Malformed, tampered, or expired tokens return HTTP 401 Unauthorized.

---

## 3. Server-Side Dashboard RBAC Matrix

The backend enforces strict 1-to-1 dashboard permissions. The actual observed HTTP responses across all 25 role-dashboard combinations are documented below:

| Role Tested | `/dashboard/dean` | `/dashboard/coordinator` | `/dashboard/faculty` | `/dashboard/club` | `/dashboard/student` | Result |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | **200 OK** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | **PASS** |
| **Coordinator** | 403 Forbidden | **200 OK** | 403 Forbidden | 403 Forbidden | 403 Forbidden | **PASS** |
| **Faculty** | 403 Forbidden | 403 Forbidden | **200 OK** | 403 Forbidden | 403 Forbidden | **PASS** |
| **Club** | 403 Forbidden | 403 Forbidden | 403 Forbidden | **200 OK** | 403 Forbidden | **PASS** |
| **Student** | 403 Forbidden | 403 Forbidden | 403 Forbidden | 403 Forbidden | **200 OK** | **PASS** |

**Observation**: Every role can access *only* its authorized dashboard. Admin access to department coordinator, faculty, club, and student dashboards is strictly segmented at the permission level, preventing unauthorized administrative impersonation.

---

## 4. Server-Side Data Isolation Verification

### A. Student Timetable Isolation (`GET /api/v1/timetable`)
- **Requirement**: A student querying the timetable must only receive sessions assigned to their own student group.
- **Verification Result**: **PASS**.
- **Evidence**:
  - Unfiltered master schedule contains 189 canonical sessions.
  - Query executed by `student.y1a@cit.edu` (Cohort: `Y1-A`) automatically returned exactly 15 sessions.
  - Inspection of all 15 sessions confirmed 100% belonged to `Y1-A`. Zero cross-group leakage.

### B. Faculty Teaching Timetable Isolation (`GET /api/v1/timetable`)
- **Requirement**: Faculty members querying their schedule must only receive sessions where they are assigned as instructor.
- **Verification Result**: **PASS**.
- **Evidence**:
  - Query executed by `f01@cit.edu` (Dr. Rajesh Kumar, `F01`) automatically returned 7 sessions.
  - Every returned session had `faculty_id == 'F01'`. Zero other faculty sessions were visible.

### C. Department Coordinator Isolation (`GET /api/v1/timetable`)
- **Requirement**: Department Coordinator queries must be bounded to courses/groups in their department (`CSE`).
- **Verification Result**: **PASS**.
- **Evidence**:
  - Coordinator for CSE returned 48 department sessions.
  - Mechanical Engineering, Electrical, and Civil sessions were excluded.

---

## 5. Institutional Governance & Security Rules

### A. Anti-Conflict No-Self-Approval
- **Requirement**: An administrator or coordinator who submits a booking application must never be permitted to approve their own request.
- **Server-Side Enforcement**: **PASS**.
  - Admin user submitted booking `BR-26` (Symposium).
  - Admin user then dispatched `POST /api/v1/bookings/BR-26/decision` with `decision: approved`.
  - Backend responded with **HTTP 403 Forbidden** (`"Requester cannot approve their own booking request (No Self-Approval rule)"`).
- **Client-Side Enforcement**: **PASS**.
  - `ApprovalManagement.jsx` and `BookingDetail.jsx` detect `isSelf` and disable the Approve button with an explicit policy warning badge (`"Self-Approval Disabled"`).

### B. Role Category Cap Enforcement
- **Requirement**: Non-admin roles must not exceed their institutional booking priority limits:
  - Admin: Up to Tier 3 (`institute_event`).
  - Faculty: Up to Tier 4 (`guest_lecture`).
  - Coordinator: Up to Tier 5 (`department_event`).
  - Club: Up to Tier 6 (`club_event`).
- **Server-Side Enforcement**: **PASS**.
  - Club representative submitted a booking attempting to request `requested_category: 'institute_event'` (Tier 3).
  - Backend intercepted the request and automatically assigned `effective_category: 'club_event'` (Tier 6).
  - Database persistence verified `effective_category == 'club_event'`.

---

## 6. Client vs. Server Authorization Gap Analysis

| Security Layer | Server-Side Enforcement | Client-Side Enforcement | Assessment |
|---|:---:|:---:|---|
| **API Endpoints (FastAPI RBAC)** | Complete (403 Forbidden) | Complete (`apiClient.js` handles 401/403) | **SECURE** |
| **Data Query Scoping** | Server-side SQL filtering | Filter props passed from state | **SECURE** |
| **No-Self-Approval** | Route-level exception (403) | UI button disabled + toast error | **SECURE** |
| **Role Category Caps** | DB model validation & downgrade | Form category options | **SECURE** |
| **Route Navigation Guards** | N/A (Server handles APIs) | Lacks role route guards (`router.jsx`) | **FINDING SEC-01** |

### Client-Side Route Guard Finding (SEC-01):
While the backend completely protects all data and operations, the client-side router (`router.jsx`) currently only checks `isAuthenticated`. A non-admin user who enters `/admin` into the address bar can view the admin dashboard layout. No administrative actions succeed because API calls return 403, but the layout renders. A client-side `RoleGuard` wrapper is recommended for production deployment.
