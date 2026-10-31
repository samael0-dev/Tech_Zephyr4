from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.permissions import DEPARTMENT_LAB_ROOM_TYPES, ROLE_CATEGORY_CAP, RoleEnum
from app.models.booking import BookingRequest
from app.models.room import Room
from app.models.user import User
from app.schemas.auth import CurrentUser
from app.schemas.booking import BookingCreateRequest, BookingDecisionRequest


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
    """
    effective_category = determine_effective_category(user.role, req_data.requested_category)

    # Generate sequential BR ID
    count = db.query(BookingRequest).count()
    new_id = f"BR-{count + 1:02d}"

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
        status="pending",
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
