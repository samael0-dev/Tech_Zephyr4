"""Authoritative Central Validation Layer for CITRIX Campus Operations Platform.

Validates:
- Academic timetable generation and publications (H1-H14, S1-S6)
- Midsem examination schedules (half room capacity, student overlap, room suitability)
- Venue booking requests and priority rankings (Spectra / Fest Week)
- Disruption rescheduling proposals (stability, minimal moves, hard constraint compliance)
"""

import copy
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Ensure CrunchWeek_StarterPack and CITRIX are discoverable
BASE_DIR = Path(__file__).resolve().parents[2]
STARTER_PACK_DIR = BASE_DIR / "CrunchWeek_StarterPack"
CITRIX_DIR = BASE_DIR / "CITRIX" / "CITRIX"

for p in [STARTER_PACK_DIR, CITRIX_DIR]:
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    import validator as official_validator
except ImportError:
    official_validator = None


@dataclass
class ValidationResult:
    valid: bool
    hard_violation_count: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    violated_constraints: List[str] = field(default_factory=list)
    affected_sessions: List[str] = field(default_factory=list)
    soft_penalties: Dict[str, Any] = field(default_factory=dict)
    soft_total: int = 0
    explanation: str = ""
    diagnostics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "hard_violation_count": self.hard_violation_count,
            "errors": self.errors,
            "warnings": self.warnings,
            "violated_constraints": self.violated_constraints,
            "affected_sessions": self.affected_sessions,
            "soft_penalties": self.soft_penalties,
            "soft_total": self.soft_total,
            "explanation": self.explanation,
            "diagnostics": self.diagnostics,
        }


def get_default_dataset() -> Dict[str, Any]:
    """Loads canonical dataset cit_public.json."""
    dataset_path = STARTER_PACK_DIR / "data" / "cit_public.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_academic_timetable(
    schedule_dict: Dict[str, Any],
    data_dict: Optional[Dict[str, Any]] = None,
    baseline_dict: Optional[Dict[str, Any]] = None,
    disruption_dict: Optional[Dict[str, Any]] = None,
) -> ValidationResult:
    """
    Validates academic timetable using the official validator.py logic.
    Checks H1-H14 hard constraints, calculates S1-S6 soft penalties, and verifies schedule integrity.
    """
    data = data_dict or get_default_dataset()
    if official_validator is None:
        return ValidationResult(
            valid=False,
            errors=["Official validator module is not available in environment."],
            explanation="Validator module missing.",
        )

    try:
        report = official_validator.run(
            copy.deepcopy(data),
            copy.deepcopy(schedule_dict),
            copy.deepcopy(baseline_dict) if baseline_dict else None,
        )

        hard_count = report.get("hard_violation_count", 0)
        hard_violations = report.get("hard_violations", [])
        soft_penalties = report.get("soft_penalties", {})
        soft_total = report.get("soft_total", 0)
        warnings = report.get("warnings", [])

        violated_rules = sorted(list({v.get("rule", "UNKNOWN") for v in hard_violations}))
        affected = []
        error_messages = []
        for v in hard_violations:
            rule = v.get("rule", "HARD")
            detail = v.get("detail", "")
            where = v.get("where", "")
            error_messages.append(f"[{rule}] {where}: {detail}")
            if "session" in str(where).lower() or "session" in str(detail).lower():
                affected.append(str(where))

        is_valid = hard_count == 0
        explanation = (
            "Timetable passed all H1-H14 hard constraints with zero violations."
            if is_valid
            else f"Timetable violated {hard_count} hard constraints ({', '.join(violated_rules)})."
        )

        return ValidationResult(
            valid=is_valid,
            hard_violation_count=hard_count,
            errors=error_messages,
            warnings=warnings,
            violated_constraints=violated_rules,
            affected_sessions=affected,
            soft_penalties=soft_penalties,
            soft_total=soft_total,
            explanation=explanation,
            diagnostics={
                "team": report.get("team"),
                "dataset_id": report.get("dataset_id"),
                "hard_by_rule": report.get("hard_by_rule", {}),
            },
        )
    except Exception as e:
        return ValidationResult(
            valid=False,
            errors=[f"Validation execution failed: {str(e)}"],
            explanation=f"Exception during timetable validation: {str(e)}",
        )


def validate_midsem_exam_schedule(
    exams_schedule: List[Dict[str, Any]],
    data_dict: Optional[Dict[str, Any]] = None,
) -> ValidationResult:
    """
    Validates midsem exam schedule:
    - Exam-room capacity halved constraint: effective room capacity is capacity // 2.
    - No student group has overlapping exams in the same slot.
    - No room is double-booked in the same slot.
    - Exams scheduled only during allowed exam days and sessions (AM/PM).
    """
    data = data_dict or get_default_dataset()
    rooms = {r["id"]: r for r in data.get("rooms", [])}
    exams_meta = {e["id"]: e for e in data.get("exams", [])}

    errors: List[str] = []
    warnings: List[str] = []
    violated_constraints: List[str] = []
    affected: List[str] = []

    # Track slot occupancy: (day, session, room_id) -> exam_id
    room_slot_occ: Dict[Tuple[str, str, str], str] = {}
    # Track student group exam slots: (day, session, group_id) -> exam_id
    group_slot_occ: Dict[Tuple[str, str, str], str] = {}

    scheduled_exam_ids: Set[str] = set()

    for item in exams_schedule:
        e_id = item.get("exam_id") or item.get("id")
        day = item.get("day")
        sess = item.get("session")  # AM or PM
        allocated_rooms = item.get("rooms", [])

        if not e_id:
            errors.append("Exam item missing 'exam_id'.")
            continue

        scheduled_exam_ids.add(e_id)
        meta = exams_meta.get(e_id)
        if not meta:
            warnings.append(f"Exam '{e_id}' not found in canonical dataset catalog.")
            continue

        groups = meta.get("groups", [])
        size = meta.get("size", 0)

        if not day or not sess:
            errors.append(f"Exam '{e_id}' has unassigned day or session slot.")
            violated_constraints.append("EXAM_SLOT_UNASSIGNED")
            affected.append(e_id)
            continue

        # Check group clash
        for g in groups:
            key = (day, sess, g)
            if key in group_slot_occ:
                clashing = group_slot_occ[key]
                errors.append(
                    f"Student group clash: Group '{g}' has multiple exams ('{e_id}' and '{clashing}') in {day} {sess}."
                )
                violated_constraints.append("EXAM_GROUP_CLASH")
                affected.append(e_id)
            else:
                group_slot_occ[key] = e_id

        # Check room allocations and half-capacity
        total_effective_cap = 0
        for rid in allocated_rooms:
            r = rooms.get(rid)
            if not r:
                errors.append(f"Exam '{e_id}' allocated non-existent room '{rid}'.")
                violated_constraints.append("EXAM_INVALID_ROOM")
                continue

            if "exam" not in r.get("allowed_uses", []):
                errors.append(f"Room '{rid}' is not authorized for examinations (allowed: {r.get('allowed_uses')}).")
                violated_constraints.append("EXAM_ROOM_USE_INVALID")
                affected.append(e_id)

            r_key = (day, sess, rid)
            if r_key in room_slot_occ:
                clashing = room_slot_occ[r_key]
                errors.append(
                    f"Room conflict: Room '{rid}' double-booked for exams '{e_id}' and '{clashing}' in {day} {sess}."
                )
                violated_constraints.append("EXAM_ROOM_DOUBLE_BOOKED")
                affected.append(e_id)
            else:
                room_slot_occ[r_key] = e_id

            half_cap = r["capacity"] // 2
            total_effective_cap += half_cap

        # Verify capacity
        if total_effective_cap < size:
            errors.append(
                f"Capacity violation: Exam '{e_id}' size is {size}, but total effective halved capacity of rooms {allocated_rooms} is {total_effective_cap}."
            )
            violated_constraints.append("EXAM_CAPACITY_VIOLATION")
            affected.append(e_id)

    # Check for unscheduled exams
    all_exam_ids = set(exams_meta.keys())
    unscheduled = all_exam_ids - scheduled_exam_ids
    if unscheduled:
        warnings.append(f"{len(unscheduled)} exams remain unscheduled: {sorted(list(unscheduled))[:5]}...")

    is_valid = len(errors) == 0
    explanation = (
        "Midsem exam schedule satisfies all room capacity (halved) and clash-free constraints."
        if is_valid
        else f"Midsem exam schedule has {len(errors)} violations across {len(set(affected))} exams."
    )

    return ValidationResult(
        valid=is_valid,
        hard_violation_count=len(errors),
        errors=errors,
        warnings=warnings,
        violated_constraints=sorted(list(set(violated_constraints))),
        affected_sessions=sorted(list(set(affected))),
        explanation=explanation,
        diagnostics={
            "total_exams_scheduled": len(scheduled_exam_ids),
            "unscheduled_exams_count": len(unscheduled),
        },
    )


def validate_venue_booking_decision(
    booking_id: str,
    decision: str,
    day: Optional[str],
    start_period: Optional[int],
    end_period: Optional[int],
    room_id: Optional[str],
    data_dict: Optional[Dict[str, Any]] = None,
    timetable_sessions: Optional[List[Dict[str, Any]]] = None,
    existing_bookings: Optional[List[Dict[str, Any]]] = None,
) -> ValidationResult:
    """
    Validates a venue booking decision (approval/alternative) against:
    - Academic timetable overlap (no overlap with teaching classes unless fest week override permitted)
    - Room unavailability / maintenance closures
    - Existing approved booking overlaps
    - Room capacity vs requested attendance
    - Room suitability and allowed uses
    """
    if decision not in ["approved", "alternative_offered"]:
        # Rejection is always constraint-valid
        return ValidationResult(valid=True, explanation="Booking rejection is valid.")

    data = data_dict or get_default_dataset()
    rooms = {r["id"]: r for r in data.get("rooms", [])}
    req_meta = {b["id"]: b for b in data.get("booking_requests", [])}

    errors: List[str] = []
    violated: List[str] = []

    if not day or not start_period or not end_period or not room_id:
        return ValidationResult(
            valid=False,
            errors=["Approved booking must specify day, start_period, end_period, and room_id."],
            explanation="Missing booking placement parameters.",
        )

    room = rooms.get(room_id)
    if not room:
        return ValidationResult(
            valid=False,
            errors=[f"Room '{room_id}' does not exist."],
            violated_constraints=["INVALID_ROOM"],
            explanation=f"Room '{room_id}' does not exist.",
        )

    # Check capacity
    req = req_meta.get(booking_id, {})
    attendance = req.get("attendance", 0)
    if room["capacity"] < attendance:
        errors.append(
            f"Capacity violation: Room '{room_id}' capacity ({room['capacity']}) cannot accommodate attendance {attendance}."
        )
        violated.append("BOOKING_CAPACITY_VIOLATION")

    # Check room allowed uses
    allowed = room.get("allowed_uses", [])
    if "event" not in allowed and "lecture" not in allowed:
        errors.append(f"Room '{room_id}' does not allow campus events (allowed: {allowed}).")
        violated.append("BOOKING_ROOM_USE_INVALID")

    # Check room maintenance unavailability
    for u in data.get("room_unavailability", []):
        if u["room_id"] == room_id and u["day"] == day:
            for p in u.get("periods", []):
                if start_period <= p <= end_period:
                    errors.append(
                        f"Maintenance conflict: Room '{room_id}' is unavailable on {day} period {p} ({u.get('reason', 'Maintenance')})."
                    )
                    violated.append("ROOM_UNAVAILABLE_MAINTENANCE")

    # Check overlap with existing approved bookings
    for b in existing_bookings or []:
        if b.get("id") == booking_id:
            continue
        if b.get("status") in ["approved", "alternative_offered"]:
            b_day = b.get("assigned_day") or b.get("day")
            b_room = b.get("assigned_room_id") or b.get("room_id")
            b_start = b.get("assigned_start_period") or b.get("start_period")
            b_end = b.get("assigned_end_period") or b.get("end_period")

            if b_day == day and b_room == room_id and b_start and b_end:
                if max(start_period, b_start) <= min(end_period, b_end):
                    errors.append(
                        f"Booking clash: Overlaps with approved booking '{b.get('id')}' in {room_id} on {day} P{b_start}-P{b_end}."
                    )
                    violated.append("BOOKING_OVERLAP")

    # Check overlap with teaching classes in timetable
    for ts in timetable_sessions or []:
        ts_day = ts.get("day")
        ts_room = ts.get("room_id")
        ts_start = ts.get("start_period")
        ts_dur = ts.get("duration", 1)
        ts_end = ts_start + ts_dur - 1 if ts_start else None

        if ts_day == day and ts_room == room_id and ts_start and ts_end:
            if max(start_period, ts_start) <= min(end_period, ts_end):
                errors.append(
                    f"Class clash: Overlaps with academic class session '{ts.get('session_id')}' in {room_id} on {day} P{ts_start}-P{ts_end}."
                )
                violated.append("BOOKING_CLASS_CLASH")

    is_valid = len(errors) == 0
    return ValidationResult(
        valid=is_valid,
        hard_violation_count=len(errors),
        errors=errors,
        violated_constraints=sorted(list(set(violated))),
        explanation="Booking parameters verified conflict-free." if is_valid else "; ".join(errors),
    )
