"""Midsem Examination Scheduling Service for CITRIX.

Integrates Google OR-Tools CP-SAT ExamScheduler with the consolidated PostgreSQL database.
Enforces:
- Halved room capacity rule (effective capacity = capacity // 2).
- Zero student-group exam overlaps.
- Proposal-first workflow requiring Admin approval before publication.
"""

import os
import sys
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CITRIX_DIR = os.path.join(BASE_DIR, "CITRIX", "CITRIX")
if CITRIX_DIR not in sys.path:
    sys.path.insert(0, CITRIX_DIR)

from engine.exams.engine import ExamScheduler, ExamScheduleResult
from engine.scheduler.models import Dataset

from app.core.audit import log_audit_event
from app.models.canonical import Exam, ExamRoomAllocation, Room
from app.schemas.auth import CurrentUser
from app.services.central_validator import validate_midsem_exam_schedule, get_default_dataset


def generate_exam_schedule_proposal(
    db: Session,
    user: CurrentUser,
    time_limit_seconds: float = 15.0,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Solves the midterm exam scheduling problem using Google OR-Tools CP-SAT.
    Generates a conflict-free proposal respecting the halved-capacity constraint.
    """
    raw_data = get_default_dataset()
    dataset = Dataset.model_validate(raw_data)

    scheduler = ExamScheduler(dataset)
    result: ExamScheduleResult = scheduler.solve(time_limit_seconds=time_limit_seconds)

    # Validate output with central validator
    validation = validate_midsem_exam_schedule(
        exams_schedule=result.assignments,
        data_dict=raw_data,
    )

    log_audit_event(
        db=db,
        actor=user,
        action="exam:proposal:generate",
        entity_type="exam",
        entity_id="all",
        status="SUCCESS" if result.is_feasible else "FAILED",
        details={
            "status": result.status,
            "is_feasible": result.is_feasible,
            "scheduled_count": len(result.assignments),
            "soft_penalty": result.soft_penalty,
            "wall_time": result.wall_time_seconds,
        },
        ip_address=client_ip,
    )

    return {
        "status": result.status,
        "is_feasible": result.is_feasible,
        "total_exams_scheduled": len(result.assignments),
        "soft_penalty": result.soft_penalty,
        "runtime_seconds": round(result.wall_time_seconds, 2),
        "assignments": result.assignments,
        "validation": validation.to_dict(),
        "message": (
            f"Midsem exam schedule proposal generated ({len(result.assignments)} exams scheduled). "
            "Proposal is pending Admin review and approval."
        ),
    }


def publish_exam_schedule(
    db: Session,
    user: CurrentUser,
    assignments: List[Dict[str, Any]],
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Admin-only workflow: Approves and publishes the midsem examination schedule.
    Updates the canonical exams and exam_room_allocations tables atomically.
    """
    raw_data = get_default_dataset()
    validation = validate_midsem_exam_schedule(assignments, data_dict=raw_data)
    if not validation.valid:
        raise ValueError(
            f"Cannot publish invalid exam schedule: {validation.hard_violation_count} violations detected: {validation.errors[:3]}"
        )

    # 1. Update exams table
    for assign in assignments:
        e_id = assign.get("exam_id")
        day = assign.get("day")
        sess = assign.get("session")
        rooms = assign.get("rooms", [])

        exam_obj = db.query(Exam).filter(Exam.id == e_id).first()
        if exam_obj:
            exam_obj.scheduled_day = day
            exam_obj.scheduled_session = sess

    # 2. Clear old allocations and insert new ones
    db.query(ExamRoomAllocation).delete()

    allocations = []
    for assign in assignments:
        e_id = assign.get("exam_id")
        for rid in assign.get("rooms", []):
            allocations.append(
                ExamRoomAllocation(
                    exam_id=e_id,
                    room_id=rid,
                    allocated_seats=25,  # Nominal seat assignment
                )
            )

    if allocations:
        db.bulk_save_objects(allocations)

    db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action="exam:publish",
        entity_type="exam",
        entity_id="all",
        status="SUCCESS",
        details={"published_count": len(assignments)},
        ip_address=client_ip,
    )

    return {
        "status": "published",
        "published_exams_count": len(assignments),
        "allocated_rooms_count": len(allocations),
        "published_by": user.id,
        "message": f"Midsem exam schedule published successfully ({len(assignments)} exams scheduled).",
    }
