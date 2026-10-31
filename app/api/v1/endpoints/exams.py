from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import Permission, RoleEnum
from app.core.rbac import get_current_user, require_permission
from app.models.canonical import Exam, ExamRoomAllocation, SessionEntity
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import ExamResponse
from app.schemas.response import ApiResponse
from app.services.exam_service import (
    generate_exam_schedule_proposal,
    publish_exam_schedule,
)
from app.services.central_validator import validate_midsem_exam_schedule

router = APIRouter(prefix="/exams", tags=["Exams"])


class ExamPublishRequest(BaseModel):
    assignments: List[Dict[str, Any]]


@router.get("", response_model=ApiResponse[List[ExamResponse]])
def get_exams(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves exams with role-based data isolation:
    - Admin: All exams across CIT.
    - Student: Exams relevant to their student group.
    - Faculty: Exams for courses taught by the faculty.
    """
    exams = db.query(Exam).all()

    if current_user.role == RoleEnum.ADMIN.value:
        filtered = exams
    elif current_user.role == RoleEnum.STUDENT.value:
        filtered = [
            ex for ex in exams
            if current_user.student_group_id in (ex.groups or [])
        ]
    elif current_user.role == RoleEnum.FACULTY.value:
        fac_courses = {
            s.course_id
            for s in db.query(SessionEntity).filter(SessionEntity.faculty_id == current_user.faculty_id).all()
        }
        filtered = [
            ex for ex in exams
            if any(c in fac_courses for c in (ex.course_ids or []))
        ]
    else:
        filtered = exams

    # Map allocations if available
    res_list = []
    for e in filtered:
        alloc_rooms = [a.room_id for a in db.query(ExamRoomAllocation).filter(ExamRoomAllocation.exam_id == e.id).all()]
        data_item = ExamResponse(
            id=e.id,
            course_ids=e.course_ids or [],
            groups=e.groups or [],
            size=e.size,
            duration_hours=e.duration_hours,
            day=e.scheduled_day,
            session=e.scheduled_session,
            rooms=alloc_rooms or (e.rooms if hasattr(e, "rooms") and e.rooms else []),
        )
        res_list.append(data_item)

    return ApiResponse(
        success=True,
        data=res_list,
        message="Exams retrieved successfully",
    )


@router.post("/generate", response_model=ApiResponse[Dict[str, Any]])
def generate_exams_schedule(
    request: Request,
    time_limit_seconds: float = 15.0,
    auto_publish: bool = True,
    current_user: CurrentUser = Depends(require_permission(Permission.EXAM_GENERATE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Solves midsem exam scheduling using Google OR-Tools CP-SAT.
    Enforces halved room capacity and clash-free constraints.
    """
    client_ip = request.client.host if request.client else None

    prop = generate_exam_schedule_proposal(
        db=db,
        user=current_user,
        time_limit_seconds=time_limit_seconds,
        client_ip=client_ip,
    )

    if auto_publish and prop.get("is_feasible") and prop.get("assignments"):
        publish_exam_schedule(
            db=db,
            user=current_user,
            assignments=prop["assignments"],
            client_ip=client_ip,
        )
        prop["published"] = True

    return ApiResponse(
        success=True,
        data=prop,
        message="Midsem exam schedule generated via CP-SAT ExamScheduler.",
    )


@router.post("/publish", response_model=ApiResponse[Dict[str, Any]])
def publish_exams_endpoint(
    publish_req: ExamPublishRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_permission(Permission.EXAM_GENERATE)),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Validates and publishes an exam schedule proposal.
    """
    client_ip = request.client.host if request.client else None
    try:
        res = publish_exam_schedule(
            db=db,
            user=current_user,
            assignments=publish_req.assignments,
            client_ip=client_ip,
        )
        return ApiResponse(success=True, data=res, message="Exam schedule published successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/validate", response_model=ApiResponse[Dict[str, Any]])
def validate_exams_endpoint(
    validate_req: ExamPublishRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Validates proposed exam assignments against half-capacity and clash constraints.
    """
    val = validate_midsem_exam_schedule(validate_req.assignments)
    return ApiResponse(success=True, data=val.to_dict(), message="Exam schedule validation complete")
