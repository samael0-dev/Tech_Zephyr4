"""Disruption Rescheduling Service for CITRIX.

Integrates the CP-SAT Rescheduling Engine to repair timetables following disruptions
(e.g., faculty sick leave, emergency maintenance room closure, cancelled sessions).
Enforces:
- Minimum session displacement objective.
- Proposal-first workflow: original published timetable remains 100% untouched until Admin approval.
- Stale proposal detection and rejection.
- Explicit session movement diff generation.
"""

from datetime import datetime, timezone
import json
import os
import sys
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CITRIX_DIR = os.path.join(BASE_DIR, "CITRIX", "CITRIX")
if CITRIX_DIR not in sys.path:
    sys.path.insert(0, CITRIX_DIR)

from engine.rescheduler.engine import reschedule, RescheduleResult

from app.core.audit import log_audit_event
from app.core.rbac import enforce_no_self_approval
from app.models.canonical import Disruption, Schedule, TimetableEntry
from app.schemas.auth import CurrentUser
from app.services.central_validator import validate_academic_timetable, get_default_dataset


def build_baseline_schedule_dict(db: Session) -> Dict[str, Any]:
    """Retrieves currently active published timetable in schedule.json format."""
    active_sched = db.query(Schedule).filter(Schedule.is_active.is_(True)).first()
    if not active_sched:
        # Fall back to baseline schedule in exports if no schedule active yet
        export_path = os.path.join(BASE_DIR, "CITRIX", "CITRIX", "exports", "schedule.json")
        if os.path.exists(export_path):
            with open(export_path, "r", encoding="utf-8") as f:
                base_json = json.load(f)
                return {
                    "dataset_id": base_json.get("dataset_id", "cit-public-v1"),
                    "schedule_id": "SCHED-CANONICAL-BASELINE",
                    "sessions": base_json.get("sessions", []),
                }
        raise ValueError("No active published timetable found to reschedule from.")

    entries = db.query(TimetableEntry).filter(TimetableEntry.schedule_id == active_sched.id).all()
    sessions = []
    for e in entries:
        sessions.append({
            "session_id": e.session_id,
            "day": e.day,
            "start_period": e.start_period,
            "room_id": e.room_id,
        })

    if not sessions and active_sched.raw_schedule_json and "sessions" in active_sched.raw_schedule_json:
        sessions = active_sched.raw_schedule_json["sessions"]

    return {
        "dataset_id": active_sched.dataset_id or "cit-public-v1",
        "schedule_id": active_sched.id,
        "sessions": sessions,
    }


def generate_reschedule_proposal_for_disruption(
    db: Session,
    user: CurrentUser,
    disruption_id: int,
    time_limit_seconds: float = 30.0,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Invokes CP-SAT Rescheduler to compute minimum-disruption repair proposal.
    Computes exact session moves and validates all hard constraints.
    Keeps the current published timetable intact.
    """
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    if not disruption:
        raise ValueError(f"Disruption request '{disruption_id}' not found.")

    baseline = build_baseline_schedule_dict(db)
    raw_dataset = get_default_dataset()

    # Normalize disruption payload to official format: {"changes": [...]}
    raw_payload = disruption.payload or {}
    if "changes" not in raw_payload:
        # Synthesize change structure from simple fields
        change = {}
        dtype = disruption.disruption_type or raw_payload.get("disruption_type", "faculty_unavailable")
        change["type"] = dtype
        if dtype == "faculty_unavailable":
            change["faculty_id"] = raw_payload.get("faculty_id") or "F01"
            change["days"] = raw_payload.get("days", ["WED"])
            change["periods"] = raw_payload.get("periods", [1, 2, 3, 4])
            change["reason"] = raw_payload.get("reason", "Faculty unavailability")
        elif dtype == "room_unavailable":
            change["room_id"] = raw_payload.get("room_id") or "LH-1"
            change["days"] = raw_payload.get("days", ["MON"])
            change["periods"] = raw_payload.get("periods", [1, 2])
            change["reason"] = raw_payload.get("reason", "Room maintenance")
        disruption_formatted = {"changes": [change]}
    else:
        disruption_formatted = raw_payload

    # Run CP-SAT rescheduler
    res: RescheduleResult = reschedule(
        baseline_schedule=baseline,
        disruption=disruption_formatted,
        raw_dataset=raw_dataset,
        time_limit_seconds=time_limit_seconds,
    )

    if not res.is_feasible:
        disruption.status = "infeasible"
        disruption.impact_summary = {
            "status": res.status,
            "is_feasible": False,
            "explanation": "No feasible timetable exists satisfying all hard constraints with this disruption.",
        }
        db.commit()
        return {
            "disruption_id": disruption.id,
            "status": "infeasible",
            "is_feasible": False,
            "explanation": "The requested disruption cannot be accommodated without hard constraint conflicts.",
        }

    # Calculate exact diffs between baseline and proposed schedule
    base_map = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in baseline["sessions"]}
    prop_map = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in res.schedule_dict.get("sessions", [])}

    moves_detail = []
    for sid, (p_day, p_start, p_room) in prop_map.items():
        if sid in base_map:
            b_day, b_start, b_room = base_map[sid]
            if (p_day, p_start, p_room) != (b_day, b_start, b_room):
                moves_detail.append({
                    "session_id": sid,
                    "from": {"day": b_day, "start_period": b_start, "room_id": b_room},
                    "to": {"day": p_day, "start_period": p_start, "room_id": p_room},
                    "time_changed": (p_day, p_start) != (b_day, b_start),
                    "room_changed": p_room != b_room,
                })

    # Validate proposed schedule
    val_res = validate_academic_timetable(res.schedule_dict, data_dict=raw_dataset, baseline_dict=baseline)

    proposal_schedule_id = f"SCHED-REPAIR-{uuid.uuid4().hex[:6].upper()}"

    # Persist proposed Schedule record (inactive)
    proposed_schedule = Schedule(
        id=proposal_schedule_id,
        name=f"Rescheduled Timetable Proposal for Disruption #{disruption_id}",
        dataset_id=baseline.get("dataset_id", "cit-public-v1"),
        is_active=False,
        is_baseline=False,
        status="proposal",
        hard_violations_count=val_res.hard_violation_count,
        soft_penalty_total=val_res.soft_total,
        solver_runtime_seconds=res.wall_time_seconds,
        raw_schedule_json=res.schedule_dict,
        created_by=user.id,
    )
    db.add(proposed_schedule)

    # Update disruption
    disruption.proposed_schedule_id = proposal_schedule_id
    disruption.impact_summary = {
        "status": res.status,
        "is_feasible": True,
        "sessions_moved": len(moves_detail),
        "time_changed": res.time_changed,
        "room_only_changed": res.room_only_changed,
        "moves": moves_detail,
        "baseline_schedule_id": baseline["schedule_id"],
        "proposed_schedule_id": proposal_schedule_id,
    }
    db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action="reschedule:proposal:generate",
        entity_type="disruption",
        entity_id=str(disruption.id),
        status="SUCCESS",
        details={
            "moves_count": len(moves_detail),
            "proposal_id": proposal_schedule_id,
            "runtime_seconds": res.wall_time_seconds,
        },
        ip_address=client_ip,
    )

    return {
        "disruption_id": disruption.id,
        "status": "proposal_generated",
        "is_feasible": True,
        "sessions_moved": len(moves_detail),
        "time_changed": res.time_changed,
        "room_only_changed": res.room_only_changed,
        "proposed_schedule_id": proposal_schedule_id,
        "moves": moves_detail,
        "validation": val_res.to_dict(),
        "message": f"Rescheduling proposal ready ({len(moves_detail)} sessions moved). Pending Admin approval.",
    }


def approve_and_apply_reschedule(
    db: Session,
    user: CurrentUser,
    disruption_id: int,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Admin-only workflow: Approves and applies a rescheduling proposal.
    Strictly enforces:
    1. NO SELF-APPROVAL (requester cannot approve their own disruption).
    2. Stale proposal rejection (if active schedule changed since proposal generation).
    3. Atomic activation of the repaired timetable.
    """
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    if not disruption:
        raise ValueError(f"Disruption request '{disruption_id}' not found.")

    # 1. Enforce No Self-Approval!
    enforce_no_self_approval(disruption.submitted_by_user_id, user.id)

    if not disruption.proposed_schedule_id:
        raise ValueError("Cannot approve disruption: No rescheduling proposal has been generated yet.")

    impact = disruption.impact_summary or {}
    expected_baseline_id = impact.get("baseline_schedule_id")

    # 2. Check for stale proposal
    active_sched = db.query(Schedule).filter(Schedule.is_active.is_(True)).first()
    if not active_sched or (expected_baseline_id and active_sched.id != expected_baseline_id):
        raise ValueError(
            f"Stale proposal detected: Active schedule has changed ({active_sched.id if active_sched else 'None'} vs expected {expected_baseline_id}). Please regenerate rescheduling proposal."
        )

    # 3. Retrieve proposed schedule
    proposed_sched = db.query(Schedule).filter(Schedule.id == disruption.proposed_schedule_id).first()
    if not proposed_sched or not proposed_sched.raw_schedule_json:
        raise ValueError(f"Proposed schedule '{disruption.proposed_schedule_id}' is missing schedule data.")

    # 4. Atomic activation
    # Deactivate current schedule
    db.query(Schedule).filter(Schedule.is_active.is_(True)).update({"is_active": False})

    # Activate repaired schedule
    proposed_sched.is_active = True
    proposed_sched.status = "active"

    # Replace timetable entries
    db.query(TimetableEntry).filter(TimetableEntry.schedule_id == proposed_sched.id).delete()
    new_entries = []
    for s in proposed_sched.raw_schedule_json.get("sessions", []):
        new_entries.append(
            TimetableEntry(
                schedule_id=proposed_sched.id,
                session_id=s["session_id"],
                day=s["day"],
                start_period=s["start_period"],
                end_period=s["start_period"] + s.get("duration", 1) - 1,
                room_id=s["room_id"],
                is_override=False,
            )
        )
    if new_entries:
        db.bulk_save_objects(new_entries)

    disruption.status = "approved"
    disruption.approved_by_user_id = user.id
    disruption.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action="reschedule:approve_and_apply",
        entity_type="disruption",
        entity_id=str(disruption.id),
        status="SUCCESS",
        details={
            "approved_by": user.id,
            "new_active_schedule_id": proposed_sched.id,
            "sessions_moved": impact.get("sessions_moved", 0),
        },
        ip_address=client_ip,
    )

    return {
        "disruption_id": disruption.id,
        "status": "applied",
        "new_active_schedule_id": proposed_sched.id,
        "approved_by": user.id,
        "message": f"Rescheduling proposal applied successfully. Schedule '{proposed_sched.id}' is now active.",
    }
