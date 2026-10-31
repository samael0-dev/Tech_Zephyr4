from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.permissions import RoleEnum
from app.models.booking import BookingRequest
from app.models.exam import Exam
from app.models.faculty import Course, Faculty, StudentGroup
from app.models.room import Room
from app.models.schedule import ScheduledSession, ScheduleVersion
from app.models.session import SessionEntity
from app.schemas.auth import CurrentUser
from app.schemas.timetable import SessionResponse, TimetableQuery


def query_timetable_sessions(
    db: Session,
    user: CurrentUser,
    filters: TimetableQuery,
) -> List[Dict[str, Any]]:
    """
    Retrieves scheduled sessions while strictly enforcing role-based data isolation:
    - Admin: Unrestricted global access.
    - Department Coordinator: Only sessions for groups or courses in their department.
    - Faculty: Only sessions taught by this faculty member.
    - Student: Only sessions where their group is enrolled.
    """
    # 1. Enforce Role Isolation
    target_group = filters.group_id
    target_faculty = filters.faculty_id

    if user.role == RoleEnum.STUDENT.value:
        # Student cannot query another group's timetable
        target_group = user.student_group_id
    elif user.role == RoleEnum.FACULTY.value:
        # Faculty cannot query another faculty's timetable
        target_faculty = user.faculty_id

    # Base query on SessionEntity
    sess_query = db.query(SessionEntity)

    if target_faculty:
        sess_query = sess_query.filter(SessionEntity.faculty_id == target_faculty)

    all_sessions = sess_query.all()

    # Filter by student group in python (since groups is a JSON list)
    if target_group:
        all_sessions = [s for s in all_sessions if target_group in (s.groups or [])]

    # Department coordinator isolation
    if user.role == RoleEnum.DEPARTMENT_COORDINATOR.value and user.department:
        # Find courses in this department
        dept_courses = {c.id for c in db.query(Course).filter(Course.department == user.department).all()}
        dept_groups = {g.id for g in db.query(StudentGroup).filter(StudentGroup.department == user.department).all()}
        all_sessions = [
            s for s in all_sessions
            if s.course_id in dept_courses or any(g in dept_groups for g in (s.groups or []))
        ]

    # Fetch active schedule placements
    active_sched = db.query(ScheduleVersion).filter(ScheduleVersion.is_active == True).first()
    placements = {}
    if active_sched:
        scheduled = (
            db.query(ScheduledSession)
            .filter(ScheduledSession.schedule_id == active_sched.id)
            .all()
        )
        for sc in scheduled:
            placements[sc.session_id] = {
                "day": sc.day,
                "start_period": sc.start_period,
                "room_id": sc.room_id,
            }

    results = []
    for s in all_sessions:
        placement = placements.get(s.id, {})
        day_val = placement.get("day")
        room_val = placement.get("room_id")
        start_val = placement.get("start_period")

        # Apply room/day filter if provided
        if filters.room_id and room_val != filters.room_id:
            continue
        if filters.day and day_val != filters.day:
            continue

        item = {
            "id": s.id,
            "course_id": s.course_id,
            "kind": s.kind,
            "groups": s.groups,
            "faculty_id": s.faculty_id,
            "size": s.size,
            "duration": s.duration,
            "room_types": s.room_types,
            "needs_accessible": s.needs_accessible,
            "basket_slot": s.basket_slot,
            "fixed_slot": s.fixed_slot,
            "day": day_val,
            "start_period": start_val,
            "room_id": room_val,
        }
        results.append(item)

    return results


def build_schedule_export(db: Session, team_name: str = "Tech Zephyr") -> Dict[str, Any]:
    """
    Constructs the exact schedule.json document structure for official validator.py.
    """
    active_sched = db.query(ScheduleVersion).filter(ScheduleVersion.is_active == True).first()
    
    sessions_export = []
    overrides_export = []
    
    if active_sched:
        scheduled = db.query(ScheduledSession).filter(ScheduledSession.schedule_id == active_sched.id).all()
        for sc in scheduled:
            if sc.is_override:
                overrides_export.append({
                    "session_id": sc.session_id,
                    "day": sc.day,
                    "start_period": sc.start_period,
                    "room_id": sc.room_id,
                    "displaced_by": sc.displaced_by,
                })
            else:
                sessions_export.append({
                    "session_id": sc.session_id,
                    "day": sc.day,
                    "start_period": sc.start_period,
                    "room_id": sc.room_id,
                })

    # Bookings decisions
    decided_bookings = db.query(BookingRequest).all()
    bookings_export = []
    for b in decided_bookings:
        if b.status in ["approved", "alternative_offered"]:
            bookings_export.append({
                "request_id": b.id,
                "status": b.status,
                "day": b.assigned_day,
                "start_period": b.assigned_start_period,
                "end_period": b.assigned_end_period,
                "room_id": b.assigned_room_id,
                "reason": b.decision_reason or "Approved",
            })
        elif b.status == "rejected":
            bookings_export.append({
                "request_id": b.id,
                "status": "rejected",
                "reason": b.decision_reason or "Capacity or timing conflict",
            })

    # Exams
    exams = db.query(Exam).all()
    exams_export = []
    for ex in exams:
        if ex.day and ex.session and ex.rooms:
            exams_export.append({
                "exam_id": ex.id,
                "day": ex.day,
                "session": ex.session,
                "rooms": ex.rooms,
            })

    return {
        "team": team_name,
        "dataset_id": "cit-public-v1",
        "sessions": sessions_export,
        "fest_week": {
            "bookings": bookings_export,
            "session_overrides": overrides_export,
        },
        "exams": exams_export,
    }
