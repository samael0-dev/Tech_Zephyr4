from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.permissions import ROLE_CATEGORY_CAP, RoleEnum
from app.models.booking import BookingRequest
from app.models.canonical import Room, RoomUnavailability, ScheduledSession
from app.schemas.auth import CurrentUser
from app.schemas.booking import BookingCreateRequest, BookingDecisionRequest


def check_booking_conflicts(
    db: Session,
    room_id: str,
    day: str,
    from_period: int,
    to_period: int,
    attendance: int,
    needs: Optional[List[str]] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Checks whether a requested venue slot has clashes with:
    1. Room existence and capacity
    2. Accessibility requirements
    3. Maintenance unavailabilities
    4. Master Timetable scheduled classes
    5. Existing approved venue bookings
    Returns (has_conflict, reason_if_any).
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return True, f"Room '{room_id}' does not exist in campus database."

    if room.capacity < attendance:
        return True, f"Capacity conflict: Room '{room.name}' capacity ({room.capacity}) cannot accommodate {attendance} attendees."

    if needs and "accessible" in needs and not room.accessible:
        return True, f"Accessibility conflict: Room '{room.name}' does not meet wheelchair/accessible requirements."

    # Check maintenance closures
    unavail = db.query(RoomUnavailability).filter(
        RoomUnavailability.room_id == room_id,
        RoomUnavailability.day == day,
    ).all()
    for u in unavail:
        for p in (u.periods or []):
            if from_period <= p <= to_period:
                return True, f"Maintenance conflict: Room '{room.name}' is closed for maintenance during period P{p} ({u.reason or 'Scheduled maintenance'})."

    # Check timetable sessions
    sessions = db.query(ScheduledSession).filter(
        ScheduledSession.room_id == room_id,
        ScheduledSession.day == day,
    ).all()
    for s in sessions:
        if not (to_period < s.start_period or from_period > s.end_period):
            return True, f"Timetable conflict: Room '{room.name}' is occupied on {day} during P{s.start_period}-P{s.end_period} by class session '{s.session_id}'."

    # Check existing approved bookings
    bookings = db.query(BookingRequest).filter(
        BookingRequest.assigned_room_id == room_id,
        BookingRequest.assigned_day == day,
        BookingRequest.status.in_(["approved", "alternative_offered"]),
    ).all()
    for b in bookings:
        if b.assigned_start_period and b.assigned_end_period:
            if not (to_period < b.assigned_start_period or from_period > b.assigned_end_period):
                return True, f"Venue booking conflict: Room '{room.name}' is already allocated to '{b.title}' on {day} during P{b.assigned_start_period}-P{b.assigned_end_period}."

    return False, None


def determine_effective_category(user_role: str, requested_category: str) -> str:
    """
    Enforces server-side category cap based on user's role.
    """
    role_enum = RoleEnum(user_role) if user_role in [r.value for r in RoleEnum] else RoleEnum.CLUB
    max_cap = ROLE_CATEGORY_CAP.get(role_enum)

    priority_hierarchy = {
        "institute_event": 3,
        "guest_lecture": 4,
        "department_event": 5,
        "club_event": 6,
    }

    req_val = priority_hierarchy.get(requested_category, 6)
    cap_val = priority_hierarchy.get(max_cap, 6) if max_cap else 6

    # In priority numbers, lower number = higher priority. If user requests higher priority than allowed, cap it!
    if req_val < cap_val:
        return max_cap or "club_event"
    return requested_category


def create_booking_request(
    db: Session,
    user: CurrentUser,
    req_data: BookingCreateRequest,
) -> BookingRequest:
    """
    Creates a new booking request with automatic role-based category cap and unique ID.
    If submitted with auto_execute=True (e.g. by Dean / Admin), directly checks constraints:
    - If conflict exists -> immediately marks REJECTED with conflict reason.
    - If clash-free -> immediately marks APPROVED and schedules the venue slot.
    """
    effective_category = determine_effective_category(user.role, req_data.requested_category)

    # Generate sequential BR ID
    count = db.query(BookingRequest).count()
    new_id = f"BR-{count + 1:02d}"

    status_val = "pending"
    decision_reason_val = None
    decided_by_val = None
    decided_at_val = None
    assigned_room_val = None
    assigned_day_val = None
    assigned_start_val = None
    assigned_end_val = None

    # Auto-execution check (Executive authority or auto_execute requested)
    if getattr(req_data, "auto_execute", False):
        target_room_id = req_data.requested_room
        window = req_data.windows[0] if req_data.windows else None
        day = window.day if window else "MON"
        from_p = window.from_period if window else 6
        to_p = window.to_period if window else (from_p + req_data.duration_periods - 1)

        if not target_room_id:
            # Pick first eligible room matching capacity
            candidate = db.query(Room).filter(Room.capacity >= req_data.attendance).first()
            target_room_id = candidate.id if candidate else "AUD"

        has_conflict, conflict_reason = check_booking_conflicts(
            db=db,
            room_id=target_room_id,
            day=day,
            from_period=from_p,
            to_period=to_p,
            attendance=req_data.attendance,
            needs=req_data.needs,
        )

        decided_by_val = user.id
        decided_at_val = datetime.now(timezone.utc)
        if has_conflict:
            status_val = "rejected"
            decision_reason_val = conflict_reason
        else:
            status_val = "approved"
            decision_reason_val = "Verified clash-free and directly executed by Dean of Academics (Executive Authority)."
            assigned_room_val = target_room_id
            assigned_day_val = day
            assigned_start_val = from_p
            assigned_end_val = to_p

    booking = BookingRequest(
        id=new_id,
        submitted_at=datetime.now(timezone.utc),
        requester=user.name if not user.club_name else user.club_name,
        requester_user_id=user.id,
        role=user.role,
        department=user.department or req_data.department,
        requested_category=req_data.requested_category,
        effective_category=effective_category,
        title=req_data.title,
        attendance=req_data.attendance,
        duration_periods=req_data.duration_periods,
        windows=[w.model_dump() for w in req_data.windows],
        room_types=req_data.room_types,
        needs=req_data.needs,
        requested_room=req_data.requested_room,
        mandatory_for_groups=req_data.mandatory_for_groups,
        series_id=req_data.series_id,
        raw_text=req_data.raw_text,
        status=status_val,
        assigned_room_id=assigned_room_val,
        assigned_day=assigned_day_val,
        assigned_start_period=assigned_start_val,
        assigned_end_period=assigned_end_val,
        decision_reason=decision_reason_val,
        decided_by_user_id=decided_by_val,
        decided_at=decided_at_val,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking



def validate_booking_decision(
    booking: BookingRequest,
    decision_req: BookingDecisionRequest,
    target_room: Optional[Room],
) -> Tuple[bool, Optional[str]]:
    """
    Validates room capacity and constraints before approving.
    """
    if decision_req.decision in ["approved", "alternative_offered"]:
        if not decision_req.room_id or not decision_req.day or not decision_req.start_period or not decision_req.end_period:
            return False, "Day, start_period, end_period, and room_id are required for approval or alternative"

        if not target_room:
            return False, f"Room '{decision_req.room_id}' does not exist"

        if target_room.capacity < booking.attendance:
            return False, f"Room capacity ({target_room.capacity}) is less than booking attendance ({booking.attendance})"

        # Check accessibility if booking needs accessible venue
        if "accessible" in (booking.needs or []) and not target_room.accessible:
            return False, f"Room '{target_room.id}' is not accessible, but booking requires accessibility"

    return True, None
