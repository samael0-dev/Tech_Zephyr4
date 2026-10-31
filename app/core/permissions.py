from enum import Enum
from typing import Dict, Optional, Set


class RoleEnum(str, Enum):
    # Official Competition Personas
    ADMIN = "admin"
    COORDINATOR = "department_coordinator"
    FACULTY = "faculty"
    CLUB_REPRESENTATIVE = "club"

    # Backward-Compatibility Aliases
    DEPARTMENT_COORDINATOR = "department_coordinator"
    CLUB = "club"

    # Additional Scoped Roles
    STUDENT = "student"
    SECURITY = "security"


def normalize_role(role: Optional[str]) -> str:
    """Normalize incoming role string to standard canonical system role."""
    if not role:
        return RoleEnum.STUDENT.value
    r = role.strip().lower()
    mapping = {
        "admin": RoleEnum.ADMIN.value,
        "coordinator": RoleEnum.COORDINATOR.value,
        "department_coordinator": RoleEnum.COORDINATOR.value,
        "faculty": RoleEnum.FACULTY.value,
        "club": RoleEnum.CLUB_REPRESENTATIVE.value,
        "club_representative": RoleEnum.CLUB_REPRESENTATIVE.value,
        "student": RoleEnum.STUDENT.value,
        "security": RoleEnum.SECURITY.value,
        "dean": RoleEnum.ADMIN.value,
        "hod": RoleEnum.COORDINATOR.value,
    }
    return mapping.get(r, r)


class Permission(str, Enum):
    # Timetable
    TIMETABLE_VIEW_ALL = "timetable:view_all"
    TIMETABLE_VIEW_DEPT = "timetable:view_dept"
    TIMETABLE_VIEW_OWN = "timetable:view_own"
    TIMETABLE_VIEW_GROUP = "timetable:view_group"
    TIMETABLE_GENERATE = "timetable:generate"
    TIMETABLE_VALIDATE = "timetable:validate"
    TIMETABLE_REQUEST_CHANGE = "timetable:request_change"
    TIMETABLE_APPROVE_CHANGE = "timetable:approve_change"

    # Bookings
    BOOKING_CREATE = "booking:create"
    BOOKING_VIEW_ALL = "booking:view_all"
    BOOKING_VIEW_DEPT = "booking:view_dept"
    BOOKING_VIEW_OWN = "booking:view_own"
    BOOKING_APPROVE_ALL = "booking:approve_all"
    BOOKING_APPROVE_DEPT_LAB = "booking:approve_dept_lab"
    BOOKING_REJECT = "booking:reject"
    BOOKING_CANCEL_OWN = "booking:cancel_own"

    # Exams
    EXAM_GENERATE = "exam:generate"
    EXAM_VIEW_ALL = "exam:view_all"
    EXAM_VIEW_GROUP = "exam:view_group"
    EXAM_VIEW_OWN = "exam:view_own"

    # Rooms
    ROOM_VIEW = "room:view"
    ROOM_MANAGE = "room:manage"

    # Dashboards
    DASHBOARD_DEAN = "dashboard:dean"
    DASHBOARD_COORDINATOR = "dashboard:coordinator"
    DASHBOARD_FACULTY = "dashboard:faculty"
    DASHBOARD_CLUB = "dashboard:club"
    DASHBOARD_STUDENT = "dashboard:student"

    # Analytics
    ANALYTICS_VIEW_ALL = "analytics:view_all"
    ANALYTICS_VIEW_DEPT = "analytics:view_dept"

    # System & Audit
    AUDIT_VIEW = "audit:view"
    SYSTEM_RESET_DEMO = "system:reset_demo"
    ASSISTANT_CHAT = "assistant:chat"


# Role to Permissions Mapping
ROLE_PERMISSIONS: Dict[RoleEnum, Set[Permission]] = {
    RoleEnum.ADMIN: {
        Permission.TIMETABLE_VIEW_ALL,
        Permission.TIMETABLE_GENERATE,
        Permission.TIMETABLE_VALIDATE,
        Permission.TIMETABLE_REQUEST_CHANGE,
        Permission.TIMETABLE_APPROVE_CHANGE,
        Permission.BOOKING_CREATE,
        Permission.BOOKING_VIEW_ALL,
        Permission.BOOKING_APPROVE_ALL,
        Permission.BOOKING_REJECT,
        Permission.BOOKING_CANCEL_OWN,
        Permission.EXAM_GENERATE,
        Permission.EXAM_VIEW_ALL,
        Permission.ROOM_VIEW,
        Permission.ROOM_MANAGE,
        Permission.DASHBOARD_DEAN,
        Permission.ANALYTICS_VIEW_ALL,
        Permission.AUDIT_VIEW,
        Permission.SYSTEM_RESET_DEMO,
        Permission.ASSISTANT_CHAT,
    },
    RoleEnum.COORDINATOR: {
        Permission.TIMETABLE_VIEW_DEPT,
        Permission.TIMETABLE_REQUEST_CHANGE,
        Permission.BOOKING_CREATE,
        Permission.BOOKING_VIEW_DEPT,
        Permission.BOOKING_APPROVE_DEPT_LAB,
        Permission.BOOKING_REJECT,
        Permission.BOOKING_CANCEL_OWN,
        Permission.ROOM_VIEW,
        Permission.DASHBOARD_COORDINATOR,
        Permission.ANALYTICS_VIEW_DEPT,
        Permission.ASSISTANT_CHAT,
    },
    RoleEnum.FACULTY: {
        Permission.TIMETABLE_VIEW_OWN,
        Permission.TIMETABLE_REQUEST_CHANGE,
        Permission.BOOKING_CREATE,
        Permission.BOOKING_VIEW_OWN,
        Permission.BOOKING_CANCEL_OWN,
        Permission.EXAM_VIEW_OWN,
        Permission.ROOM_VIEW,
        Permission.DASHBOARD_FACULTY,
        Permission.ASSISTANT_CHAT,
    },
    RoleEnum.CLUB_REPRESENTATIVE: {
        Permission.BOOKING_CREATE,
        Permission.BOOKING_VIEW_OWN,
        Permission.BOOKING_CANCEL_OWN,
        Permission.ROOM_VIEW,
        Permission.DASHBOARD_CLUB,
        Permission.ASSISTANT_CHAT,
    },
    RoleEnum.STUDENT: {
        Permission.TIMETABLE_VIEW_GROUP,
        Permission.EXAM_VIEW_GROUP,
        Permission.ROOM_VIEW,
        Permission.DASHBOARD_STUDENT,
        Permission.ASSISTANT_CHAT,
    },
    RoleEnum.SECURITY: {
        Permission.ROOM_VIEW,
        Permission.TIMETABLE_VIEW_ALL,
        Permission.ASSISTANT_CHAT,
    },
}

# Role category cap mapping
ROLE_CATEGORY_CAP: Dict[RoleEnum, Optional[str]] = {
    RoleEnum.ADMIN: "institute_event",
    RoleEnum.COORDINATOR: "department_event",
    RoleEnum.FACULTY: "guest_lecture",
    RoleEnum.CLUB_REPRESENTATIVE: "club_event",
    RoleEnum.STUDENT: None,
    RoleEnum.SECURITY: None,
}

# Department specialized laboratory room types
DEPARTMENT_LAB_ROOM_TYPES = {
    "CSE": ["lab_cs"],
    "ECE": ["lab_elec"],
    "EE": ["lab_elec"],
    "ME": ["workshop"],
    "CE": ["lab_civil"],
    "PH": ["lab_phy"],
}
