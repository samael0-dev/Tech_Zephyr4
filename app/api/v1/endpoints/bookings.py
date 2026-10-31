from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import DEPARTMENT_LAB_ROOM_TYPES, Permission, RoleEnum
from app.core.rbac import (
    check_booking_approval_authority,
    get_current_user,
    require_permission,
)
from app.models.booking import BookingRequest
from app.models.room import Room
from app.schemas.auth import CurrentUser
from app.schemas.booking import (
    BookingCreateRequest,
    BookingDecisionRequest,
    BookingResponse,
)
from app.schemas.response import ApiResponse
from app.services.booking_service import create_booking_request, validate_booking_decision
from app.services.fest_service import evaluate_campus_fest_bookings

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("", response_model=ApiResponse[BookingResponse], status_code=status.HTTP_201_CREATED)
def submit_booking_request(
    booking_in: BookingCreateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.BOOKING_CREATE)),
    db: Session = Depends(get_db),
):
    """
    Submits a new venue booking request.
    Applies server-side role category cap and stores pending request.
    """
    client_ip = request.client.host if request.client else None
    booking = create_booking_request(db, current_user, booking_in)

    log_audit_event(
        db=db,
        actor=current_user,
        action="booking:create",
        entity_type="booking",
        entity_id=booking.id,
        status="SUCCESS",
        details={
            "title": booking.title,
            "category": booking.effective_category,
            "attendance": booking.attendance,
        },
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=BookingResponse.model_validate(booking),
        message="Booking request created successfully",
    )


@router.get("", response_model=ApiResponse[List[BookingResponse]])
def list_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists booking requests with server-side data isolation:
    - Admin: All bookings across the campus.
    - Department Coordinator: Bookings from their department or for their department's labs.
    - Faculty / Club: Only requests they created or belonging to their club/identity.
    - Student: Only approved public campus events.
    """
    query = db.query(BookingRequest)

    if current_user.role == RoleEnum.ADMIN.value:
        pass  # Global institutional access
    elif current_user.role == RoleEnum.DEPARTMENT_COORDINATOR.value:
        lab_types = DEPARTMENT_LAB_ROOM_TYPES.get(current_user.department or "", [])
        # Find room IDs for these lab types
        lab_rooms = [r.id for r in db.query(Room).filter(Room.type.in_(lab_types)).all()]
        query = query.filter(
            (BookingRequest.department == current_user.department)
            | (BookingRequest.assigned_room_id.in_(lab_rooms))
            | (BookingRequest.requested_room.in_(lab_rooms))
            | (BookingRequest.requester_user_id == current_user.id)
        )
    elif current_user.role in [RoleEnum.FACULTY.value, RoleEnum.CLUB.value]:
        conditions = [BookingRequest.requester_user_id == current_user.id]
        if current_user.club_name:
            conditions.append(BookingRequest.requester == current_user.club_name)
        query = query.filter(*conditions)
    elif current_user.role == RoleEnum.STUDENT.value:
        # Students see approved events
        query = query.filter(BookingRequest.status.in_(["approved", "alternative_offered"]))

    if status_filter:
        query = query.filter(BookingRequest.status == status_filter)

    bookings = query.order_by(BookingRequest.submitted_at.asc()).all()

    return ApiResponse(
        success=True,
        data=[BookingResponse.model_validate(b) for b in bookings],
        message="Bookings retrieved successfully",
    )


@router.get("/{booking_id}", response_model=ApiResponse[BookingResponse])
def get_booking(
    booking_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves a single booking request by ID with role-based data isolation check.
    """
    booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking request '{booking_id}' not found",
        )

    # Data isolation access check
    if current_user.role == RoleEnum.ADMIN.value:
        pass
    elif current_user.role == RoleEnum.DEPARTMENT_COORDINATOR.value:
        if booking.department != current_user.department and booking.requester_user_id != current_user.id:
            # Check if requested room is a lab of this coordinator
            room = db.query(Room).filter(Room.id == booking.requested_room).first()
            lab_types = DEPARTMENT_LAB_ROOM_TYPES.get(current_user.department or "", [])
            if not (room and room.type in lab_types):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: You do not have permission to view bookings outside your department/labs.",
                )
    elif current_user.role in [RoleEnum.FACULTY.value, RoleEnum.CLUB.value]:
        if booking.requester_user_id != current_user.id and booking.requester != current_user.club_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only view your own booking requests.",
            )

    return ApiResponse(
        success=True,
        data=BookingResponse.model_validate(booking),
        message="Booking request retrieved successfully",
    )


@router.post("/{booking_id}/decision", response_model=ApiResponse[BookingResponse])
def decide_booking_request(
    booking_id: str,
    decision_in: BookingDecisionRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Approves, rejects, or offers an alternative for a booking request.
    Strictly enforces:
    1. Role authority (Admin globally or Department Coordinator for department labs).
    2. NO SELF-APPROVAL: Nobody can approve their own request!
    3. Room constraints and capacity.
    4. Immutable audit logging.
    """
    booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking request '{booking_id}' not found",
        )

    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot decide a cancelled booking request",
        )

    client_ip = request.client.host if request.client else None

    # Resolve target room
    target_room_id = decision_in.room_id or booking.requested_room
    target_room = db.query(Room).filter(Room.id == target_room_id).first() if target_room_id else None

    # Security check: Approval Authority + No Self-Approval!
    check_booking_approval_authority(current_user, booking, target_room)

    # Validate decision parameters
    is_valid, err_msg = validate_booking_decision(booking, decision_in, target_room)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)

    # Apply decision
    booking.status = decision_in.decision
    booking.decision_reason = decision_in.reason
    booking.decided_by_user_id = current_user.id
    booking.decided_at = datetime.now(timezone.utc)

    if decision_in.decision in ["approved", "alternative_offered"]:
        booking.assigned_day = decision_in.day
        booking.assigned_start_period = decision_in.start_period
        booking.assigned_end_period = decision_in.end_period
        booking.assigned_room_id = decision_in.room_id

    db.commit()
    db.refresh(booking)

    # Immutable Audit Log
    log_audit_event(
        db=db,
        actor=current_user,
        action=f"booking:decision:{decision_in.decision}",
        entity_type="booking",
        entity_id=booking.id,
        status="SUCCESS",
        details={
            "decision": decision_in.decision,
            "reason": decision_in.reason,
            "assigned_room": booking.assigned_room_id,
            "assigned_day": booking.assigned_day,
            "assigned_period_range": [booking.assigned_start_period, booking.assigned_end_period],
        },
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=BookingResponse.model_validate(booking),
        message=f"Booking request {decision_in.decision} successfully",
    )


@router.post("/{booking_id}/cancel", response_model=ApiResponse[BookingResponse])
def cancel_booking_request(
    booking_id: str,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.BOOKING_CANCEL_OWN)),
    db: Session = Depends(get_db),
):
    """
    Cancels a booking request. Only the requester or Admin can cancel a request.
    """
    booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking request '{booking_id}' not found",
        )

    if current_user.role != RoleEnum.ADMIN.value:
        if booking.requester_user_id != current_user.id and booking.requester != current_user.club_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own booking requests.",
            )

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        actor=current_user,
        action="booking:cancel",
        entity_type="booking",
        entity_id=booking.id,
        status="SUCCESS",
        details={"status": "cancelled"},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=BookingResponse.model_validate(booking),
        message="Booking request cancelled successfully",
    )


@router.post("/evaluate-fest", response_model=ApiResponse[Dict[str, Any]])
@router.post("/evaluate", response_model=ApiResponse[Dict[str, Any]])
def evaluate_fest_bookings_endpoint(
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.BOOKING_APPROVE_ALL)),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Executes the CP-SAT FestWeekEngine to rank, prioritize,
    and detect displacements for all Spectra Week venue booking requests.
    """
    client_ip = request.client.host if request.client else None
    eval_res = evaluate_campus_fest_bookings(db, current_user, client_ip=client_ip)
    return ApiResponse(
        success=True,
        data=eval_res,
        message="Spectra Week booking evaluation executed successfully via CP-SAT engine.",
    )
