from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import get_current_user, require_permission
from app.models.booking import BookingRequest
from app.models.room import Room, RoomUnavailability
from app.models.schedule import ScheduledSession
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse
from app.schemas.room import RoomAvailabilityResponse, RoomPeriodSlot, RoomResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("", response_model=ApiResponse[List[RoomResponse]])
def get_rooms(
    type: Optional[str] = None,
    building: Optional[str] = None,
    accessible: Optional[bool] = None,
    capacity_min: Optional[int] = None,
    allowed_use: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission(Permission.ROOM_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Lists campus rooms with optional filters for capacity, building, room type, accessibility.
    """
    query = db.query(Room)
    if type:
        query = query.filter(Room.type == type)
    if building:
        query = query.filter(Room.building == building)
    if accessible is not None:
        query = query.filter(Room.accessible == accessible)
    if capacity_min is not None:
        query = query.filter(Room.capacity >= capacity_min)

    rooms = query.all()

    # Filter allowed_use if specified in JSON column
    if allowed_use:
        rooms = [r for r in rooms if allowed_use in (r.allowed_uses or [])]

    return ApiResponse(
        success=True,
        data=[RoomResponse.model_validate(r) for r in rooms],
        message="Rooms retrieved successfully",
    )


@router.get("/{room_id}", response_model=ApiResponse[dict])
def get_room_details(
    room_id: str,
    current_user: CurrentUser = Depends(require_permission(Permission.ROOM_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Returns full room information including maintenance windows.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_id}' not found",
        )

    unavailabilities = (
        db.query(RoomUnavailability).filter(RoomUnavailability.room_id == room_id).all()
    )

    return ApiResponse(
        success=True,
        data={
            "room": RoomResponse.model_validate(room),
            "unavailability": [
                {
                    "day": u.day,
                    "periods": u.periods,
                    "reason": u.reason,
                }
                for u in unavailabilities
            ],
        },
        message="Room details retrieved successfully",
    )


@router.get("/{room_id}/availability", response_model=ApiResponse[RoomAvailabilityResponse])
def get_room_availability(
    room_id: str,
    day: str = Query("MON", pattern="^(MON|TUE|WED|THU|FRI)$"),
    current_user: CurrentUser = Depends(require_permission(Permission.ROOM_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Returns period-by-period occupancy array for periods P1-P13.
    Integrates regular sessions, approved bookings, and maintenance windows.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_id}' not found",
        )

    # Fetch scheduled sessions in this room on this day
    sessions = (
        db.query(ScheduledSession)
        .filter(ScheduledSession.room_id == room_id, ScheduledSession.day == day)
        .all()
    )

    # Fetch approved bookings
    bookings = (
        db.query(BookingRequest)
        .filter(
            BookingRequest.assigned_room_id == room_id,
            BookingRequest.assigned_day == day,
            BookingRequest.status.in_(["approved", "alternative_offered"]),
        )
        .all()
    )

    # Fetch room maintenance unavailabilities
    unavail = (
        db.query(RoomUnavailability)
        .filter(RoomUnavailability.room_id == room_id, RoomUnavailability.day == day)
        .all()
    )
    unavail_periods = set()
    unavail_reasons = {}
    for u in unavail:
        for p in (u.periods or []):
            unavail_periods.add(p)
            unavail_reasons[p] = u.reason or "Maintenance"

    slots: List[RoomPeriodSlot] = []

    for p in range(1, 14):
        slot = RoomPeriodSlot(period=p, is_occupied=False)

        # Check maintenance
        if p in unavail_periods:
            slot.is_occupied = True
            slot.occupied_by_type = "maintenance"
            slot.title = unavail_reasons.get(p, "Maintenance")
            slots.append(slot)
            continue

        # Check scheduled regular sessions
        matched_sess = next((s for s in sessions if s.start_period == p), None)
        if matched_sess:
            slot.is_occupied = True
            slot.occupied_by_type = "session"
            slot.title = f"Class {matched_sess.session_id}"
            slots.append(slot)
            continue

        # Check approved bookings
        matched_b = next(
            (
                b
                for b in bookings
                if b.assigned_start_period
                and b.assigned_end_period
                and b.assigned_start_period <= p <= b.assigned_end_period
            ),
            None,
        )
        if matched_b:
            slot.is_occupied = True
            slot.occupied_by_type = "booking"
            slot.title = matched_b.title
            slots.append(slot)
            continue

        slots.append(slot)

    return ApiResponse(
        success=True,
        data=RoomAvailabilityResponse(
            room_id=room.id,
            room_name=room.name,
            day=day,
            slots=slots,
        ),
        message="Room availability calculated successfully",
    )
