# CITRIX Phase 5E — RoleGuard Client-Side Security & Access Control Report

**System:** CITRIX CampusOS Intelligence  
**Author:** Team Delta X  
**Date:** November 1, 2026  
**Status:** IMPLEMENTED & VERIFIED  
**Finding Addressed:** SEC-01 (Absence of Role-Based Client Routing Protection)  

---

## 1. Executive Summary

In Phase 5D, acceptance audit finding `SEC-01` identified that the React frontend used a flat `ProtectedRoute` verifying only generic authentication (`isAuthenticated: boolean`), permitting any authenticated persona (including students or club representatives) to access administrative or department-level URLs via direct browser navigation.

In Phase 5E, Team Delta X designed, implemented, and verified `RoleGuard`, a declarative, robust role-authorization barrier integrated into React Router v7. Unauthorized users attempting direct URL access are immediately redirected to their designated role dashboard without mounting or rendering privileged components or triggering unauthorized backend queries.

---

## 2. Architectural Design & Component Implementation

### 2.1 File Location & Export
- **File:** `frontend-1/citrix/src/components/auth/RoleGuard.jsx`
- **Helper:** `getDashboardForRole(role: string): string`

### 2.2 Security Invariants Enforced
1. **Zero Pre-Mount Rendering:** If authentication or authorization is pending (`loading: true`), a dedicated `RoleLoadingSpinner` renders. Privileged child routes are never mounted or evaluated.
2. **Unauthenticated Redirection:** If `!isAuthenticated || !user`, the user is immediately redirected to `/login` preserving target location in React Router state (`state={{ from: location }}`).
3. **Role Normalization:** Normalizes backend role representations (such as `department_coordinator` -> `coordinator`).
4. **Authorized Passthrough:** Renders `children` (if passed as wrapper) or `<Outlet />` (if used as route element layout).
5. **Unauthorized Re-routing:** If `!allowedRoles.includes(userRole)`, the user is redirected cleanly with HTTP state replacement (`replace: true`) to their primary role dashboard via `getDashboardForRole(userRole)`.

### 2.3 Dashboard Target Mapping (`getDashboardForRole`)

| Role (`user.role`) | Canonical Home Route | Description |
| :--- | :--- | :--- |
| `admin` | `/admin` | Admin Command Center |
| `coordinator` / `department_coordinator` | `/coordinator` | Department Coordination Workspace |
| `faculty` | `/faculty` | Faculty Personal Timetable & Leaves |
| `club` | `/club` | Club Representative Fest & Booking Hub |
| `student` | `/student` | Student Cohort Portal & Examinations |
| *Unauthenticated / Unknown* | `/login` | Public Authentication View |

---

## 3. Comprehensive Route Protection Matrix

The application route tree in `frontend-1/citrix/src/app/router.jsx` was structured into distinct authorization scopes:

```
/ (RootRedirect -> redirects authenticated user to role dashboard; unauthenticated to /login)
├── /login (Public with Suspense)
└── ProtectedRoute (Enforces isAuthenticated)
    └── AppShellLayout
        ├── RoleGuard (allowedRoles: ['admin'])
        │   ├── /admin
        │   ├── /admin/timetable/generate
        │   ├── /admin/midsem
        │   ├── /admin/spectra
        │   ├── /admin/disruptions
        │   ├── /admin/timetable/compare
        │   ├── /admin/analytics
        │   ├── /admin/audit
        │   └── /admin/data
        ├── RoleGuard (allowedRoles: ['coordinator'])
        │   └── /coordinator
        ├── RoleGuard (allowedRoles: ['faculty'])
        │   ├── /faculty
        │   └── /faculty/unavailability
        ├── RoleGuard (allowedRoles: ['club'])
        │   └── /club
        ├── RoleGuard (allowedRoles: ['student'])
        │   └── /student
        ├── RoleGuard (allowedRoles: ['admin', 'coordinator'])
        │   └── /approvals
        ├── RoleGuard (allowedRoles: ['admin', 'coordinator', 'faculty', 'club'])
        │   ├── /bookings
        │   ├── /bookings/new
        │   ├── /bookings/new/nl
        │   └── /bookings/:id
        └── Shared Authenticated Routes (All 5 Roles)
            ├── /campus/* (3D Digital Twin)
            ├── /rooms (Room Inventory)
            ├── /timetable/weekly (Weekly Timetable)
            ├── /timetable/daily (Daily Timetable)
            ├── /assistant (AI Assistant)
            └── /notifications (Alerts & Notifications)
```

---

## 4. Direct URL Access Verification Across All 5 Roles

Every combination of direct URL navigation was analyzed and verified against the router configuration:

| Authenticated Role | Direct URL Attempted | Access Result | Redirect Destination |
| :--- | :--- | :--- | :--- |
| **Student** | `/admin` | **DENIED** | `/student` |
| **Student** | `/coordinator` | **DENIED** | `/student` |
| **Student** | `/faculty` | **DENIED** | `/student` |
| **Student** | `/club` | **DENIED** | `/student` |
| **Student** | `/approvals` | **DENIED** | `/student` |
| **Student** | `/bookings/new` | **DENIED** | `/student` |
| **Student** | `/student` | **ALLOWED** | Mounts `StudentDashboard` |
| **Student** | `/campus` | **ALLOWED** | Mounts `CampusPage` |
| **Student** | `/timetable/weekly`| **ALLOWED** | Mounts `WeeklyTimetable` |
| **Club** | `/admin` | **DENIED** | `/club` |
| **Club** | `/coordinator` | **DENIED** | `/club` |
| **Club** | `/student` | **DENIED** | `/club` |
| **Club** | `/approvals` | **DENIED** | `/club` |
| **Club** | `/bookings/new` | **ALLOWED** | Mounts `BookingForm` |
| **Club** | `/club` | **ALLOWED** | Mounts `ClubDashboard` |
| **Faculty** | `/admin` | **DENIED** | `/faculty` |
| **Faculty** | `/coordinator` | **DENIED** | `/faculty` |
| **Faculty** | `/student` | **DENIED** | `/faculty` |
| **Faculty** | `/faculty` | **ALLOWED** | Mounts `FacultyDashboard` |
| **Coordinator** | `/admin` | **DENIED** | `/coordinator` |
| **Coordinator** | `/student` | **DENIED** | `/coordinator` |
| **Coordinator** | `/approvals` | **ALLOWED** | Mounts `ApprovalManagement` |
| **Coordinator** | `/coordinator` | **ALLOWED** | Mounts `CoordinatorDashboard` |
| **Admin** | `/admin` | **ALLOWED** | Mounts `AdminCommandCenter` |
| **Admin** | `/approvals` | **ALLOWED** | Mounts `ApprovalManagement` |
| **Admin** | `/student` | **DENIED** | `/admin` |
| **Unauthenticated**| Any Protected Route | **DENIED** | `/login` |

---

## 5. Security Conclusion

Finding `SEC-01` is completely resolved. Privileged views and operational workflows are fully protected by `RoleGuard` on the client side, aligning 1:1 with CITRIX backend permission enforcement. No unverified component renders, and users navigating directly to out-of-scope URLs are gracefully redirected to their respective home dashboards.
