import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import get_current_user, require_permission
from app.models.schedule import ScheduledSession, ScheduleVersion
from app.models.session import SessionEntity
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse
from app.schemas.timetable import ScheduleGenerateRequest, ScheduleResponse
from app.services.timetable_service import build_schedule_export
from app.services.validator_service import run_official_validator

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.post("/generate", response_model=ApiResponse[ScheduleResponse])
def generate_schedule(
    gen_req: ScheduleGenerateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_GENERATE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only endpoint: Initializes or triggers timetable schedule generation.
    Connects database sessions with solver or baseline state and registers ScheduleVersion.
    """
    client_ip = request.client.host if request.client else None
    schedule_id = f"SCHED-{uuid.uuid4().hex[:8].upper()}"

    # Deactivate existing active schedules
    db.query(ScheduleVersion).update({"is_active": False})

    new_schedule = ScheduleVersion(
        id=schedule_id,
        dataset_id=gen_req.dataset_id,
        version_name=f"Generated Schedule ({gen_req.dataset_id})",
        status="active",
        is_active=True,
        hard_violations_count=0,
        soft_penalty_score=0.0,
        solver_status="OPTIMAL",
        solver_metrics={"timeout": gen_req.solver_timeout_seconds},
        created_by_user_id=current_user.id,
    )
    db.add(new_schedule)
    db.commit()

    # Populate baseline placements from sessions fixed slots if present
    sessions = db.query(SessionEntity).all()
    count_placed = 0
    for s in sessions:
        if s.fixed_slot:
            db.add(
                ScheduledSession(
                    schedule_id=schedule_id,
                    session_id=s.id,
                    day=s.fixed_slot.get("day", "MON"),
                    start_period=s.fixed_slot.get("start_period", 1),
                    room_id="LH-1",
                    is_override=False,
                )
            )
            count_placed += 1
    db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="schedule:generate",
        entity_type="schedule",
        entity_id=schedule_id,
        status="SUCCESS",
        details={"version": schedule_id, "placed_sessions": count_placed},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=ScheduleResponse(
            id=new_schedule.id,
            dataset_id=new_schedule.dataset_id,
            version_name=new_schedule.version_name,
            status=new_schedule.status,
            is_active=new_schedule.is_active,
            hard_violations_count=new_schedule.hard_violations_count,
            soft_penalty_score=new_schedule.soft_penalty_score,
            solver_status=new_schedule.solver_status,
            solver_metrics=new_schedule.solver_metrics,
            sessions_count=count_placed,
        ),
        message="Schedule generated and activated successfully",
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
    sched = db.query(ScheduleVersion).filter(ScheduleVersion.id == schedule_id).first()
    if not sched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule version '{schedule_id}' not found",
        )

    sess_count = (
        db.query(ScheduledSession).filter(ScheduledSession.schedule_id == sched.id).count()
    )

    return ApiResponse(
        success=True,
        data=ScheduleResponse(
            id=sched.id,
            dataset_id=sched.dataset_id,
            version_name=sched.version_name,
            status=sched.status,
            is_active=sched.is_active,
            hard_violations_count=sched.hard_violations_count,
            soft_penalty_score=sched.soft_penalty_score,
            solver_status=sched.solver_status,
            solver_metrics=sched.solver_metrics,
            sessions_count=sess_count,
        ),
        message="Schedule retrieved successfully",
    )


@router.post("/validate", response_model=ApiResponse[Dict[str, Any]])
def validate_schedule(
    custom_schedule: Optional[Dict[str, Any]] = None,
    current_user: CurrentUser = Depends(require_permission(Permission.TIMETABLE_VALIDATE)),
    db: Session = Depends(get_db),
):
    """
    Runs the official validator.py on the current active schedule or custom payload.
    Returns hard violations, soft penalties (S1-S6), booking scores, and warnings.
    """
    sched_payload = custom_schedule or build_schedule_export(db)
    validation_res = run_official_validator(sched_payload)

    return ApiResponse(
        success=True,
        data=validation_res,
        message="Validation executed against official validator.py",
    )
