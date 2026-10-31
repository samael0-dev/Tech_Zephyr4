"""Export CP-SAT assignments to the official timetable format."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from ortools.sat.python import cp_model

from engine.scheduler.data_loader import ScheduleContext
from engine.scheduler.variables import ScheduleVariables


def extract_assignments(
    solver: cp_model.CpSolver,
    ctx: ScheduleContext,
    vars: ScheduleVariables,
) -> List[Dict[str, Any]]:
    """Extract solved session placements from CP-SAT solver."""
    sessions_out = []
    for sid, candidates in vars.candidates_by_session.items():
        chosen = None
        for c in candidates:
            var = vars.x.get((sid, c.day, c.start_period, c.room_id))
            if var is not None and solver.BooleanValue(var):
                chosen = {
                    "session_id": sid,
                    "day": c.day,
                    "start_period": c.start_period,
                    "room_id": c.room_id,
                }
                break
        if chosen is not None:
            sessions_out.append(chosen)
        else:
            raise ValueError(f"No assignment found in solver solution for session {sid}!")
    return sessions_out


def build_schedule_dict(
    dataset_id: str,
    sessions: List[Dict[str, Any]],
    fest_week: Optional[Dict[str, Any]] = None,
    exams: Optional[List[Dict[str, Any]]] = None,
    team: str = "CampusOS Intelligence",
) -> Dict[str, Any]:
    """Construct full schedule dictionary matching official shape."""
    out = {
        "team": team,
        "dataset_id": dataset_id,
        "sessions": sorted(sessions, key=lambda s: s["session_id"]),
    }
    if fest_week is not None:
        out["fest_week"] = fest_week
    if exams is not None:
        out["exams"] = exams
    return out


def export_schedule_json(
    schedule_dict: Dict[str, Any],
    output_path: str | Path,
) -> Path:
    """Save schedule to JSON file with clean indentation."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(schedule_dict, f, indent=2)
    return path
