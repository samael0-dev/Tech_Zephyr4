"""Disruption-aware Timetable Rescheduling Engine."""

import copy
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from ortools.sat.python import cp_model

from engine.scheduler.models import Dataset
from engine.scheduler.data_loader import ScheduleContext, load_dataset, apply_disruption_to_dict
from engine.scheduler.variables import ScheduleVariables
from engine.scheduler.constraints import add_hard_constraints
from engine.scheduler.objective import add_soft_objectives
from engine.scheduler.exporter import extract_assignments, build_schedule_dict


@dataclass
class RescheduleResult:
    status: str
    is_feasible: bool
    sessions_moved: int
    time_changed: int
    room_only_changed: int
    wall_time_seconds: float
    schedule_dict: Dict[str, Any] = field(default_factory=dict)
    diagnostics: Dict[str, Any] = field(default_factory=dict)


def reschedule(
    baseline_schedule: dict,
    disruption: dict,
    raw_dataset: dict,
    time_limit_seconds: float = 30.0,
) -> RescheduleResult:
    """Solve the disruption-repair problem minimizing sessions moved from baseline."""
    t0 = time.time()

    # 1. Apply disruption to raw dataset dict
    disrupted_data = apply_disruption_to_dict(raw_dataset, disruption)
    dataset = Dataset.model_validate(disrupted_data)

    # 2. Extract baseline assignments
    baseline_assign = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in baseline_schedule.get("sessions", [])
    }

    # 3. Build model and variables for disrupted dataset
    ctx = ScheduleContext(dataset, disrupted_data)
    model = cp_model.CpModel()
    vars = ScheduleVariables(model, ctx)

    # 4. Enforce all hard constraints (zero tolerance for violations)
    add_hard_constraints(model, ctx, vars)

    # 5. Build stability objective:
    # Penalize moving sessions from baseline
    stability_penalties = []
    # session_moved_var[sid] = 1 if session moved from baseline
    session_moved_vars = {}
    time_moved_vars = {}

    for sid, candidates in vars.candidates_by_session.items():
        if sid in baseline_assign:
            b_day, b_start, b_room = baseline_assign[sid]

            # Binary var indicating if session moved at all
            is_moved = model.NewBoolVar(f"moved_{sid}")
            is_time_moved = model.NewBoolVar(f"time_moved_{sid}")
            session_moved_vars[sid] = is_moved
            time_moved_vars[sid] = is_time_moved

            # Variables matching baseline exactly
            exact_match_var = vars.x.get((sid, b_day, b_start, b_room))
            if exact_match_var is not None:
                # If exact match chosen, is_moved = 0
                model.Add(is_moved == 1 - exact_match_var)
            else:
                # Baseline placement is no longer valid under new constraints
                model.Add(is_moved == 1)

            # Variables matching time exactly
            same_time_vars = [
                vars.x[(sid, b_day, b_start, r)]
                for r in ctx.compatible_rooms[sid]
                if (sid, b_day, b_start, r) in vars.x
            ]
            if same_time_vars:
                model.Add(is_time_moved == 1 - sum(same_time_vars))
            else:
                model.Add(is_time_moved == 1)

            # High penalty for changing time (100), moderate penalty for changing room only (10)
            stability_penalties.append(is_time_moved * 100 + is_moved * 10)

    # Also include soft penalty terms with small weight so quality is preserved
    soft_terms = add_soft_objectives(model, ctx, vars)
    model.Minimize(sum(stability_penalties) * 5 + soft_terms)

    # 6. Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8

    solve_status_code = solver.Solve(model)
    elapsed = time.time() - t0
    status_name = solver.StatusName(solve_status_code)

    if solve_status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return RescheduleResult(
            status=status_name,
            is_feasible=False,
            sessions_moved=0,
            time_changed=0,
            room_only_changed=0,
            wall_time_seconds=elapsed,
            schedule_dict={},
            diagnostics={"error": "Infeasible under disruption constraints"},
        )

    # 7. Extract assignments
    new_sessions = extract_assignments(solver, ctx, vars)
    sched_dict = build_schedule_dict(
        dataset_id=dataset.dataset_id,
        sessions=new_sessions,
        team=baseline_schedule.get("team", "CampusOS Intelligence"),
    )

    # Preserve exams and fest week if present
    if "exams" in baseline_schedule:
        sched_dict["exams"] = baseline_schedule["exams"]

    # Calculate stability metrics
    new_assign = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in new_sessions}
    moved_ids = [
        sid for sid in new_assign
        if sid in baseline_assign and new_assign[sid] != baseline_assign[sid]
    ]
    time_changed_count = sum(1 for sid in moved_ids if new_assign[sid][:2] != baseline_assign[sid][:2])
    room_only_count = len(moved_ids) - time_changed_count

    return RescheduleResult(
        status=status_name,
        is_feasible=True,
        sessions_moved=len(moved_ids),
        time_changed=time_changed_count,
        room_only_changed=room_only_count,
        wall_time_seconds=elapsed,
        schedule_dict=sched_dict,
        diagnostics={
            "moved_ids": moved_ids,
            "branches": solver.NumBranches(),
            "conflicts": solver.NumConflicts(),
        },
    )
