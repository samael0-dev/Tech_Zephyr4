from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import enforce_no_self_approval, get_current_user, require_permission
from app.models.canonical import Disruption
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import DisruptionRequest, DisruptionResponse
from app.schemas.response import ApiResponse
from app.services.rescheduler_service import (
    generate_reschedule_proposal_for_disruption,
    approve_and_apply_reschedule,
)

router = APIRouter(prefix="/reschedule", tags=["Rescheduling"])


@router.post("", response_model=ApiResponse[DisruptionResponse])
def request_reschedule(
    req: DisruptionRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_REQUEST_CHANGE)),
    db: Session = Depends(get_db),
):
    """
    Submits a schedule change or disruption request (e.g. faculty leave, room closure).
    """
    client_ip = request.client.host if request.client else None

    payload = req.raw_payload or {
        "disruption_type": req.disruption_type,
        "faculty_id": req.faculty_id,
        "room_id": req.room_id,
        "days": req.days or [],
        "periods": req.periods or [],
        "reason": req.reason,
    }

    disruption = Disruption(
        submitted_by_user_id=current_user.id,
        disruption_type=req.disruption_type,
        payload=payload,
        status="pending",
        impact_summary={"affected_sessions_estimated": 2},
    )
    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    log_audit_event(
        db=db,
        actor=current_user,
        action="reschedule:request",
        entity_type="disruption",
        entity_id=str(disruption.id),
        status="SUCCESS",
        details=payload,
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=DisruptionResponse(
            request_id=disruption.id,
            disruption_type=disruption.disruption_type,
            status=disruption.status,
            impact_summary=disruption.impact_summary,
            message="Reschedule request registered and pending Admin approval",
        ),
        message="Reschedule request registered successfully",
    )


@router.post("/{request_id}/propose", response_model=ApiResponse[Dict[str, Any]])
def generate_reschedule_proposal_endpoint(
    request_id: int,
    request: Request,
    time_limit_seconds: float = 30.0,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Executes CP-SAT Rescheduling Engine to generate a minimum-displacement repair proposal.
    Keeps the current published timetable intact until explicit approval.
    """
    client_ip = request.client.host if request.client else None
    try:
        prop = generate_reschedule_proposal_for_disruption(
            db=db,
            user=current_user,
            disruption_id=request_id,
            time_limit_seconds=time_limit_seconds,
            client_ip=client_ip,
        )
        return ApiResponse(success=True, data=prop, message="Rescheduling proposal generated successfully.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{request_id}", response_model=ApiResponse[Dict[str, Any]])
def get_reschedule_details(
    request_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves status and impact summary of a reschedule request.
    """
    disruption = db.query(Disruption).filter(Disruption.id == request_id).first()
    if not disruption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reschedule request '{request_id}' not found",
        )

    return ApiResponse(
        success=True,
        data={
            "id": disruption.id,
            "disruption_type": disruption.disruption_type,
            "payload": disruption.payload,
            "status": disruption.status,
            "impact_summary": disruption.impact_summary,
            "proposed_schedule_id": disruption.proposed_schedule_id,
            "submitted_by": disruption.submitted_by_user_id,
            "approved_by": disruption.approved_by_user_id,
            "created_at": disruption.created_at,
        },
        message="Reschedule details retrieved successfully",
    )


@router.post("/{request_id}/approve", response_model=ApiResponse[Dict[str, Any]])
def approve_reschedule(
    request_id: int,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_APPROVE_CHANGE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Approves a reschedule request.
    Strictly enforces NO SELF-APPROVAL: Requester cannot approve their own disruption!
    If a rescheduling proposal exists, validates and applies the new timetable.
    """
    disruption = db.query(Disruption).filter(Disruption.id == request_id).first()
    if not disruption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reschedule request '{request_id}' not found",
        )

    # Enforce No Self-Approval
    enforce_no_self_approval(disruption.submitted_by_user_id, current_user.id)

    client_ip = request.client.host if request.client else None

    # If proposed schedule is present, apply it atomically
    if disruption.proposed_schedule_id:
        try:
            res = approve_and_apply_reschedule(
                db=db,
                user=current_user,
                disruption_id=request_id,
                client_ip=client_ip,
            )
            return ApiResponse(success=True, data=res, message="Reschedule proposal applied successfully")
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Standard approval without pre-computed proposal
    disruption.status = "approved"
    disruption.approved_by_user_id = current_user.id
    db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="reschedule:approve",
        entity_type="disruption",
        entity_id=str(disruption.id),
        status="SUCCESS",
        details={"status": "approved"},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data={"status": "approved", "request_id": disruption.id},
        message="Reschedule request approved successfully",
    )
