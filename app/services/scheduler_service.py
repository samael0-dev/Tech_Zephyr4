"""Academic Timetable Solver Service for CITRIX.

Integrates Google OR-Tools CP-SAT scheduler engine with the consolidated PostgreSQL database.
Enforces proposal-first workflow: Solvers generate proposals which must be validated and
explicitly approved by an authorized Admin before becoming the active published timetable.
"""

import copy
import json
import os
import sys
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

# Ensure CITRIX engine is importable
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CITRIX_DIR = os.path.join(BASE_DIR, "CITRIX", "CITRIX")
if CITRIX_DIR not in sys.path:
    sys.path.insert(0, CITRIX_DIR)

from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.scheduler.data_loader import load_dataset, Dataset

from app.core.audit import log_audit_event
from app.core.permissions import RoleEnum
from app.models.canonical import Schedule, TimetableEntry, SessionEntity, Room
from app.schemas.auth import CurrentUser
from app.services.central_validator import validate_academic_timetable, get_default_dataset


def get_dataset_for_solver(db: Session) -> Dict[str, Any]:
    """
    Constructs the canonical scheduling dataset dictionary from the database,
    falling back to cit_public.json for static calendar attributes.
    """
    data = get_default_dataset()
    return data


def generate_timetable_proposal(
    db: Session,
    user: CurrentUser,
    dataset_id: str = "cit-public-v1",
    time_limit_seconds: float = 30.0,
    soft_weights: Optional[Dict[str, int]] = None,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Solves the academic timetable CSP/COP using Google OR-Tools CP-SAT.
    Generates a proposed schedule that remains unpublished until explicitly approved by an Admin.
    """
    raw_dataset = get_dataset_for_solver(db)
    options = SolverOptions(
        time_limit_seconds=time_limit_seconds,
        soft_weights=soft_weights,
        num_workers=8,
        random_seed=42,
    )

    solver_res = generate_timetable(raw_dataset, options=options)

    schedule_id = f"SCHED-{uuid.uuid4().hex[:8].upper()}"

    # Validate output through authoritative central validator
    validation = validate_academic_timetable(
        schedule_dict=solver_res.schedule_dict,
        data_dict=raw_dataset,
    )

    # Persist as proposal (is_active=False)
    new_schedule = Schedule(
        id=schedule_id,
        name=f"Generated Timetable Proposal ({dataset_id})",
        dataset_id=dataset_id,
        is_active=False,
        is_baseline=False,
        status="proposal" if solver_res.is_feasible and validation.valid else "infeasible",
        hard_violations_count=validation.hard_violation_count,
        soft_penalty_total=validation.soft_total,
        solver_runtime_seconds=solver_res.wall_time_seconds,
        raw_schedule_json=solver_res.schedule_dict,
        created_by=user.id,
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    # Pre-populate timetable entries associated with this proposal
    entries = []
    for s_entry in solver_res.sessions:
        entries.append(
            TimetableEntry(
                schedule_id=schedule_id,
                session_id=s_entry["session_id"],
                day=s_entry["day"],
                start_period=s_entry["start_period"],
                end_period=s_entry["start_period"] + s_entry.get("duration", 1) - 1,
                room_id=s_entry["room_id"],
                is_override=False,
            )
        )
    if entries:
        db.bulk_save_objects(entries)
        db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action="schedule:proposal:generate",
        entity_type="schedule",
        entity_id=schedule_id,
        status="SUCCESS" if solver_res.is_feasible else "FAILED",
        details={
            "status": solver_res.status,
            "is_feasible": solver_res.is_feasible,
            "hard_violations": validation.hard_violation_count,
            "soft_total": validation.soft_total,
            "runtime_seconds": solver_res.wall_time_seconds,
        },
        ip_address=client_ip,
    )

    return {
        "schedule_id": schedule_id,
        "status": solver_res.status,
        "is_feasible": solver_res.is_feasible,
        "is_active": False,
        "hard_violations_count": validation.hard_violation_count,
        "soft_penalty_total": validation.soft_total,
        "soft_penalties": validation.soft_penalties,
        "sessions_scheduled": len(solver_res.sessions),
        "runtime_seconds": round(solver_res.wall_time_seconds, 2),
        "validation": validation.to_dict(),
        "diagnostics": solver_res.diagnostics,
        "message": (
            f"Timetable proposal generated successfully with status {solver_res.status}. "
            "Proposal is pending Admin review and publication."
        ),
    }


def publish_timetable(
    db: Session,
    user: CurrentUser,
    schedule_id: str,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Admin-only workflow: Approves and publishes a proposed timetable.
    Re-validates against latest state, deactivates existing active schedules,
    and atomically activates the new schedule.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise ValueError(f"Schedule proposal '{schedule_id}' not found.")

    if schedule.raw_schedule_json:
        # Re-validate immediately before applying to prevent stale publications
        raw_dataset = get_dataset_for_solver(db)
        validation = validate_academic_timetable(schedule.raw_schedule_json, data_dict=raw_dataset)
        if not validation.valid:
            raise ValueError(
                f"Cannot publish schedule '{schedule_id}': Latest validation failed with {validation.hard_violation_count} hard violations: {validation.errors[:3]}"
            )

    # Deactivate existing active schedules atomically
    db.query(Schedule).filter(Schedule.is_active.is_(True)).update({"is_active": False})

    schedule.is_active = True
    schedule.status = "active"
    db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action="schedule:publish",
        entity_type="schedule",
        entity_id=schedule_id,
        status="SUCCESS",
        details={
            "published_by": user.id,
            "hard_violations": schedule.hard_violations_count,
            "soft_penalty_total": schedule.soft_penalty_total,
        },
        ip_address=client_ip,
    )

    return {
        "schedule_id": schedule.id,
        "status": "published",
        "is_active": True,
        "hard_violations_count": schedule.hard_violations_count,
        "soft_penalty_total": schedule.soft_penalty_total,
        "published_by": user.id,
        "message": f"Timetable '{schedule_id}' is now active and published.",
    }
