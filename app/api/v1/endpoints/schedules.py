import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import get_current_user, require_permission
from app.models.canonical import Schedule, TimetableEntry
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse
from app.schemas.timetable import ScheduleGenerateRequest, ScheduleResponse
from app.services.scheduler_service import (
    generate_timetable_proposal,
    publish_timetable,
)
from app.services.central_validator import validate_academic_timetable
from app.services.timetable_service import build_schedule_export

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.post("/generate", response_model=ApiResponse[ScheduleResponse])
def generate_schedule(
    gen_req: ScheduleGenerateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_GENERATE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only endpoint: Solves academic timetable using Google OR-Tools CP-SAT.
    Generates an optimal, constraint-checked timetable proposal.
    Automatically publishes to active state if auto_publish=True or by default.
    """
    client_ip = request.client.host if request.client else None

    # Run CP-SAT solver
    prop = generate_timetable_proposal(
        db=db,
        user=current_user,
        dataset_id=gen_req.dataset_id,
        time_limit_seconds=min(gen_req.solver_timeout_seconds or 30.0, 30.0),
        client_ip=client_ip,
    )

    schedule_id = prop["schedule_id"]
    sched = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    # Automatically activate if feasible and validated
    if prop["is_feasible"] and prop["hard_violations_count"] == 0:
        publish_timetable(db=db, user=current_user, schedule_id=schedule_id, client_ip=client_ip)
        db.refresh(sched)

    sess_count = db.query(TimetableEntry).filter(TimetableEntry.schedule_id == sched.id).count()

    return ApiResponse(
        success=True,
        data=ScheduleResponse(
            id=sched.id,
            dataset_id=sched.dataset_id,
            version_name=sched.name,
            status=sched.status,
            is_active=sched.is_active,
            hard_violations_count=sched.hard_violations_count,
            soft_penalty_score=float(sched.soft_penalty_total),
            solver_status=sched.solver_status,
            solver_metrics=sched.solver_metrics,
            sessions_count=sess_count,
        ),
        message="Schedule generated and validated via CP-SAT solver.",
    )


@router.post("/{schedule_id}/publish", response_model=ApiResponse[Dict[str, Any]])
def publish_schedule_endpoint(
    schedule_id: str,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_APPROVE_CHANGE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only workflow: Approves and publishes a proposed schedule.
    Re-validates all hard constraints immediately before atomic activation.
    """
    client_ip = request.client.host if request.client else None
    try:
        res = publish_timetable(db=db, user=current_user, schedule_id=schedule_id, client_ip=client_ip)
        return ApiResponse(success=True, data=res, message="Schedule published successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/versions", response_model=ApiResponse[List[ScheduleResponse]])
def list_schedule_versions(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves all timetable versions and proposals.
    """
    schedules = db.query(Schedule).order_by(Schedule.created_at.desc()).all()
    results = []
    for s in schedules:
        sess_count = db.query(TimetableEntry).filter(TimetableEntry.schedule_id == s.id).count()
        results.append(
            ScheduleResponse(
                id=s.id,
                dataset_id=s.dataset_id,
                version_name=s.name,
                status=s.status,
                is_active=s.is_active,
                hard_violations_count=s.hard_violations_count,
                soft_penalty_score=float(s.soft_penalty_total),
                solver_status=s.solver_status,
                solver_metrics=s.solver_metrics,
                sessions_count=sess_count,
            )
        )

    return ApiResponse(
        success=True,
        data=results,
        message="Schedule versions retrieved successfully",
    )


@router.get("/{schedule_id}", response_model=ApiResponse[ScheduleResponse])
def get_schedule(
    schedule_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves schedule version details and metrics.
    """
    sched = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule version '{schedule_id}' not found",
        )

    sess_count = db.query(TimetableEntry).filter(TimetableEntry.schedule_id == sched.id).count()

    return ApiResponse(
        success=True,
        data=ScheduleResponse(
            id=sched.id,
            dataset_id=sched.dataset_id,
            version_name=sched.name,
            status=sched.status,
            is_active=sched.is_active,
            hard_violations_count=sched.hard_violations_count,
            soft_penalty_score=float(sched.soft_penalty_total),
            solver_status=sched.solver_status,
            solver_metrics=sched.solver_metrics,
            sessions_count=sess_count,
        ),
        message="Schedule retrieved successfully",
    )


@router.post("/validate", response_model=ApiResponse[Dict[str, Any]])
def validate_schedule_endpoint(
    custom_schedule: Optional[Dict[str, Any]] = None,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_VALIDATE)),
    db: Session = Depends(get_db),
):
    """
    Runs the authoritative central validator on current active schedule or custom payload.
    """
    sched_payload = custom_schedule or build_schedule_export(db)
    validation_res = validate_academic_timetable(sched_payload)

    return ApiResponse(
        success=True,
        data=validation_res.to_dict(),
        message="Validation executed against central validator",
    )
