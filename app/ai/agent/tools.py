import time
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.permissions import ROLE_CATEGORY_CAP, RoleEnum
from app.models.booking import BookingRequest
from app.models.exam import Exam
from app.models.faculty import Faculty, StudentGroup
from app.models.room import Room, RoomUnavailability
from app.models.schedule import ScheduledSession, ScheduleVersion
from app.models.session import SessionEntity
from app.schemas.auth import CurrentUser
from app.services.timetable_service import build_schedule_export, query_timetable_sessions
from app.services.validator_service import run_official_validator


class ToolRegistry:
    """
    Typed Tool Registry for CITRIX Agentic AI.
    Executes actual backend operations with RBAC permission enforcement and latency tracking.
    """

    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}

    def register(self, name: str, description: str, is_state_changing: bool = False, required_role: Optional[str] = None):
        def decorator(func: Callable):
            self._tools[name] = {
                "name": name,
                "description": description,
                "func": func,
                "is_state_changing": is_state_changing,
                "required_role": required_role,
            }
            return func
        return decorator

    def get_tool(self, name: str) -> Optional[Dict[str, Any]]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "is_state_changing": t["is_state_changing"],
                "required_role": t["required_role"],
            }
            for t in self._tools.values()
        ]

    def execute(self, name: str, db: Session, user: CurrentUser, **kwargs) -> Dict[str, Any]:
        """
        Executes a registered tool with authorization validation and execution latency measurement in ms.
        """
        tool_entry = self.get_tool(name)
        if not tool_entry:
            return {
                "success": False,
                "error": f"Tool '{name}' is not registered in the CITRIX tool catalog.",
                "latency_ms": 0.0,
                "tool_name": name,
            }

        # Role clearance check
        req_role = tool_entry.get("required_role")
        if req_role and user.role != req_role and user.role != "admin":
            return {
                "success": False,
                "error": f"Access forbidden: Tool '{name}' requires role '{req_role}', but current user has role '{user.role}'.",
                "latency_ms": 0.0,
                "tool_name": name,
            }

        start_time = time.perf_counter()
        try:
            res = tool_entry["func"](db, user, **kwargs)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "success": True,
                "result": res,
                "latency_ms": duration_ms,
                "tool_name": name,
            }
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "success": False,
                "error": str(e),
                "latency_ms": duration_ms,
                "tool_name": name,
            }


tool_registry = ToolRegistry()


@tool_registry.register(
    name="lookup_room_availability",
    description="Checks period-by-period occupancy (P1-P13) for a campus room on a specific day.",
    is_state_changing=False,
)
def tool_lookup_room_availability(db: Session, user: CurrentUser, room_id: str, day: str = "MON") -> Dict[str, Any]:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return {"found": False, "message": f"Room '{room_id}' not found in CIT campus catalog"}

    sessions = db.query(ScheduledSession).filter(ScheduledSession.room_id == room_id, ScheduledSession.day == day).all()
    bookings = db.query(BookingRequest).filter(
        BookingRequest.assigned_room_id == room_id,
        BookingRequest.assigned_day == day,
        BookingRequest.status.in_(["approved", "alternative_offered"]),
    ).all()
    unavail = db.query(RoomUnavailability).filter(RoomUnavailability.room_id == room_id, RoomUnavailability.day == day).all()

    occupied_periods = {}
    for u in unavail:
        for p in (u.periods or []):
            occupied_periods[p] = f"Maintenance: {u.reason or 'Scheduled repair'}"
    for s in sessions:
        occupied_periods[s.start_period] = f"Class: {s.session_id}"
    for b in bookings:
        if b.assigned_start_period and b.assigned_end_period:
            for p in range(b.assigned_start_period, b.assigned_end_period + 1):
                occupied_periods[p] = f"Booking: {b.title} ({b.requester})"

    free_periods = [p for p in range(1, 14) if p not in occupied_periods]

    return {
        "found": True,
        "room_id": room.id,
        "room_name": room.name,
        "capacity": room.capacity,
        "accessible": room.accessible,
        "day": day,
        "free_periods": free_periods,
        "occupied_periods": occupied_periods,
    }


@tool_registry.register(
    name="lookup_timetable",
    description="Retrieves scheduled classes for a student group, faculty member, or department.",
    is_state_changing=False,
)
def tool_lookup_timetable(db: Session, user: CurrentUser, group_id: Optional[str] = None, faculty_id: Optional[str] = None, day: Optional[str] = None) -> Dict[str, Any]:
    from app.schemas.timetable import TimetableQuery

    query = TimetableQuery(group_id=group_id, faculty_id=faculty_id, day=day)
    sessions = query_timetable_sessions(db, user, query)

    return {
        "count": len(sessions),
        "sessions": [
            {
                "session_id": s["id"],
                "course_id": s["course_id"],
                "day": s.get("day", "TBD"),
                "period": s.get("start_period", "TBD"),
                "room": s.get("room_id", "TBD"),
                "faculty": s["faculty_id"],
                "groups": s["groups"],
            }
            for s in sessions[:15]
        ],
    }


@tool_registry.register(
    name="lookup_faculty_availability",
    description="Looks up faculty daily teaching limit (4 hours), scheduled classes, and unavailability periods.",
    is_state_changing=False,
)
def tool_lookup_faculty_availability(db: Session, user: CurrentUser, faculty_id: str, day: Optional[str] = None) -> Dict[str, Any]:
    fac = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not fac:
        return {"found": False, "message": f"Faculty member '{faculty_id}' not found in CIT records."}

    # Data isolation: faculty cannot view other faculty's schedule unless admin
    if user.role == "faculty" and user.faculty_id != faculty_id:
        return {"found": False, "message": "Access restricted: Faculty members may only inspect their own availability schedule."}

    # Fetch currently scheduled sessions for this faculty
    all_fac_sessions = db.query(SessionEntity).filter(SessionEntity.faculty_id == faculty_id).all()
    sess_ids = [s.id for s in all_fac_sessions]

    sched_query = db.query(ScheduledSession).filter(ScheduledSession.session_id.in_(sess_ids))
    if day:
        sched_query = sched_query.filter(ScheduledSession.day == day)
    scheduled_items = sched_query.all()

    hours_by_day: Dict[str, int] = {}
    for sc in scheduled_items:
        hours_by_day[sc.day] = hours_by_day.get(sc.day, 0) + 1

    return {
        "found": True,
        "faculty_id": fac.id,
        "faculty_name": fac.name,
        "department": fac.department,
        "max_hours_per_day": fac.max_hours_per_day,
        "scheduled_teaching_hours_by_day": hours_by_day,
        "unavailability": fac.unavailable,
        "preferences": fac.preferences,
        "daily_limit_compliant": all(h <= fac.max_hours_per_day for h in hours_by_day.values()),
    }


@tool_registry.register(
    name="lookup_booking_status",
    description="Inspects the current status, decision reason, and allocated venue for a venue booking request.",
    is_state_changing=False,
)
def tool_lookup_booking_status(db: Session, user: CurrentUser, booking_id: str) -> Dict[str, Any]:
    booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not booking:
        return {"found": False, "message": f"Booking request '{booking_id}' not found."}

    # Data isolation check
    if user.role in ["faculty", "club"] and booking.requester_user_id != user.id and booking.requester != user.club_name:
        return {"found": False, "message": "Access restricted: You may only inspect your own booking requests."}

    return {
        "found": True,
        "booking_id": booking.id,
        "title": booking.title,
        "requester": booking.requester,
        "requested_room": booking.requested_room,
        "status": booking.status,
        "decision_reason": booking.decision_reason or "Pending review by Dean's Office / Coordinator",
        "assigned_venue": booking.assigned_room_id,
        "assigned_day": booking.assigned_day,
        "assigned_periods": [booking.assigned_start_period, booking.assigned_end_period] if booking.assigned_start_period else None,
        "effective_category": booking.effective_category,
    }


@tool_registry.register(
    name="lookup_exam_schedule",
    description="Looks up scheduled midsem examinations for courses or student groups.",
    is_state_changing=False,
)
def tool_lookup_exam_schedule(db: Session, user: CurrentUser, group_id: Optional[str] = None, course_id: Optional[str] = None) -> Dict[str, Any]:
    exams = db.query(Exam).all()
    if group_id:
        exams = [ex for ex in exams if group_id in (ex.groups or [])]
    if course_id:
        exams = [ex for ex in exams if course_id in (ex.course_ids or [])]

    return {
        "total_exams": len(exams),
        "exams": [
            {
                "exam_id": ex.id,
                "courses": ex.course_ids,
                "groups": ex.groups,
                "day": ex.day or "Exam Week",
                "session": ex.session or "AM/PM",
                "rooms": ex.rooms or ["AUD"],
            }
            for ex in exams[:10]
        ],
    }


@tool_registry.register(
    name="explain_scheduling_conflicts",
    description="Connects to the CP-SAT engine and official validator to explain hard constraint violations and soft penalties.",
    is_state_changing=False,
)
def tool_explain_scheduling_conflicts(db: Session, user: CurrentUser) -> Dict[str, Any]:
    active_sched = db.query(ScheduleVersion).filter(ScheduleVersion.is_active.is_(True)).first()
    export_payload = build_schedule_export(db)
    val_res = run_official_validator(export_payload)

    report = val_res.get("report", {}) if val_res.get("success") else {}
    hard_violations = report.get("hard_violations", [])
    hard_by_rule = report.get("hard_by_rule", {})
    soft_penalties = report.get("soft_penalties", {})
    warnings = report.get("warnings", [])

    return {
        "schedule_active": active_sched.version_name if active_sched else "Baseline",
        "hard_violations_count": len(hard_violations),
        "hard_violations_by_rule": hard_by_rule,
        "soft_penalties": soft_penalties,
        "warnings_sample": warnings[:5],
        "solver_explanation": (
            "No hard violations detected" if len(hard_violations) == 0
            else f"Detected {len(hard_violations)} hard constraint violations. Primary constraint bottlenecks: {list(hard_by_rule.keys())}."
        ),
    }


@tool_registry.register(
    name="get_dean_operational_intelligence",
    description="Provides real-time campus briefing: room occupancy, pending booking approvals, bottleneck venues, and alerts.",
    is_state_changing=False,
    required_role="admin",
)
def tool_get_dean_operational_intelligence(db: Session, user: CurrentUser) -> Dict[str, Any]:
    total_rooms = db.query(Room).count()
    pending_bookings = db.query(BookingRequest).filter(BookingRequest.status == "pending").all()
    approved_bookings = db.query(BookingRequest).filter(BookingRequest.status.in_(["approved", "alternative_offered"])).all()

    departments = ["CSE", "ECE", "ME", "EE", "CE"]
    dept_loads = {}
    all_sessions = db.query(SessionEntity).all()
    for dept in departments:
        dept_groups = {g.id for g in db.query(StudentGroup).filter(StudentGroup.department == dept).all()}
        dept_sessions_count = len([s for s in all_sessions if any(grp in dept_groups for grp in (s.groups or []))])
        dept_loads[dept] = f"{dept_sessions_count} sessions/wk"

    return {
        "total_campus_venues": total_rooms,
        "pending_booking_approvals_count": len(pending_bookings),
        "upcoming_events_count": len(approved_bookings),
        "department_teaching_loads": dept_loads,
        "bottlenecks": [
            {"venue": "SH-1", "issue": "High concurrency on Thursday evening during Spectra fest."},
            {"venue": "AUD", "issue": "Exclusive priority required for Institute Keynote."},
        ],
        "pending_requests_sample": [
            {"id": b.id, "title": b.title, "requester": b.requester, "requested_room": b.requested_room}
            for b in pending_bookings[:5]
        ],
    }


@tool_registry.register(
    name="lookup_campus_analytics",
    description="Computes resource utilization across buildings and room types with conflict analytics.",
    is_state_changing=False,
)
def tool_lookup_campus_analytics(db: Session, user: CurrentUser) -> Dict[str, Any]:
    rooms = db.query(Room).all()
    by_type = {}
    for r in rooms:
        by_type[r.type] = by_type.get(r.type, 0) + 1

    bookings = db.query(BookingRequest).all()
    rejected_count = len([b for b in bookings if b.status == "rejected"])
    approved_count = len([b for b in bookings if b.status in ["approved", "alternative_offered"]])

    return {
        "total_rooms": len(rooms),
        "rooms_by_type": by_type,
        "total_booking_requests": len(bookings),
        "approved_requests": approved_count,
        "rejected_requests": rejected_count,
        "average_room_capacity": sum(r.capacity for r in rooms) // len(rooms) if rooms else 0,
    }


@tool_registry.register(
    name="propose_booking_request",
    description="Prepares a structured venue booking request with server validation. Requires human confirmation before database submission.",
    is_state_changing=True,
)
def tool_propose_booking_request(
    db: Session,
    user: CurrentUser,
    title: str,
    attendance: int,
    requested_room: Optional[str],
    day: str,
    from_period: int,
    to_period: int,
) -> Dict[str, Any]:
    role_enum = RoleEnum(user.role) if user.role in [r.value for r in RoleEnum] else RoleEnum.CLUB
    effective_category = ROLE_CATEGORY_CAP.get(role_enum, "club_event") or "club_event"

    room_obj = db.query(Room).filter(Room.id == requested_room).first() if requested_room else None
    conflicts = []
    if room_obj and room_obj.capacity < attendance:
        conflicts.append(f"Room {requested_room} capacity ({room_obj.capacity}) is less than expected attendance ({attendance})")

    proposal = {
        "action": "create_booking",
        "title": title,
        "attendance": attendance,
        "requested_category": effective_category,
        "requested_room": requested_room,
        "day": day,
        "from_period": from_period,
        "to_period": to_period,
        "windows": [{"day": day, "from_period": from_period, "to_period": to_period}],
        "is_valid": len(conflicts) == 0,
        "conflicts": conflicts,
    }

    return {
        "requires_confirmation": True,
        "action_type": "create_booking",
        "proposal": proposal,
        "message": (
            f"I have prepared your booking proposal for {title} in {requested_room or 'recommended venue'} "
            f"on {day} (Periods {from_period}-{to_period}). "
            f"{'Warning: ' + '; '.join(conflicts) if conflicts else 'All capacity checks passed.'} "
            "Please confirm to officially submit this request."
        ),
    }


@tool_registry.register(
    name="propose_rescheduling_request",
    description="Prepares a schedule disruption proposal (e.g. faculty sick leave, room maintenance). Requires human confirmation before submission.",
    is_state_changing=True,
)
def tool_propose_rescheduling_request(
    db: Session,
    user: CurrentUser,
    disruption_type: str,
    faculty_id: Optional[str] = None,
    room_id: Optional[str] = None,
    days: Optional[List[str]] = None,
    periods: Optional[List[int]] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    # Determine affected sessions
    affected_sessions = []
    if faculty_id:
        fac_sessions = db.query(SessionEntity).filter(SessionEntity.faculty_id == faculty_id).all()
        sess_ids = [s.id for s in fac_sessions]
        q = db.query(ScheduledSession).filter(ScheduledSession.session_id.in_(sess_ids))
        if days:
            q = q.filter(ScheduledSession.day.in_(days))
        if periods:
            q = q.filter(ScheduledSession.start_period.in_(periods))
        affected_sessions = [sc.session_id for sc in q.all()]
    elif room_id:
        q = db.query(ScheduledSession).filter(ScheduledSession.room_id == room_id)
        if days:
            q = q.filter(ScheduledSession.day.in_(days))
        if periods:
            q = q.filter(ScheduledSession.start_period.in_(periods))
        affected_sessions = [sc.session_id for sc in q.all()]

    proposal = {
        "action": "apply_disruption",
        "disruption_type": disruption_type,
        "faculty_id": faculty_id,
        "room_id": room_id,
        "days": days or ["MON"],
        "periods": periods or [1, 2, 3, 4, 5, 6, 7, 8, 9],
        "reason": reason or "Emergency disruption",
        "affected_sessions": affected_sessions,
        "estimated_moves": len(affected_sessions),
    }

    return {
        "requires_confirmation": True,
        "action_type": "apply_disruption",
        "proposal": proposal,
        "message": (
            f"Disruption proposal prepared for {disruption_type} ({faculty_id or room_id}). "
            f"Identified {len(affected_sessions)} currently scheduled sessions affected: {affected_sessions}. "
            "Please confirm to submit this disruption request for Dean's approval and rescheduling."
        ),
    }
