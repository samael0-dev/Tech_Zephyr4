"""CP-SAT solver integration for generating optimal academic timetables."""

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from ortools.sat.python import cp_model

from engine.scheduler.data_loader import Dataset, ScheduleContext, load_dataset
from engine.scheduler.variables import ScheduleVariables
from engine.scheduler.constraints import add_hard_constraints
from engine.scheduler.objective import add_soft_objectives
from engine.scheduler.exporter import extract_assignments, build_schedule_dict


@dataclass
class SolverOptions:
    time_limit_seconds: float = 30.0
    num_workers: int = 8
    optimize_soft: bool = True
    soft_weights: Optional[Dict[str, int]] = None
    random_seed: int = 42
    log_search_progress: bool = False
    hint_assignments: Optional[Dict[str, Any]] = None


@dataclass
class TimetableResult:
    status: str  # OPTIMAL | FEASIBLE | INFEASIBLE | UNKNOWN
    is_feasible: bool
    objective_value: Optional[float]
    wall_time_seconds: float
    sessions: List[Dict[str, Any]] = field(default_factory=list)
    schedule_dict: Dict[str, Any] = field(default_factory=dict)
    diagnostics: Dict[str, Any] = field(default_factory=dict)


def generate_timetable(
    dataset_or_source: Dataset | str | Path | dict,
    options: Optional[SolverOptions] = None,
) -> TimetableResult:
    """Solve the timetable CSP/COP using Google OR-Tools CP-SAT."""
    if options is None:
        options = SolverOptions()

    start_wall = time.time()

    if isinstance(dataset_or_source, Dataset):
        dataset = dataset_or_source
        raw_dict = dataset.model_dump()
    elif isinstance(dataset_or_source, dict):
        dataset = Dataset.model_validate(dataset_or_source)
        raw_dict = dataset_or_source
    else:
        dataset = load_dataset(dataset_or_source)
        raw_dict = dataset.model_dump()

    ctx = ScheduleContext(dataset, raw_dict)
    model = cp_model.CpModel()

    # Variables
    vars = ScheduleVariables(model, ctx)

    # Constraints
    add_hard_constraints(model, ctx, vars)

    # Objective
    if options.optimize_soft:
        add_soft_objectives(model, ctx, vars, weights=options.soft_weights)

    # Warm start / solution hints
    if options.hint_assignments:
        for sid, slot in options.hint_assignments.items():
            if isinstance(slot, (list, tuple)) and len(slot) >= 3:
                day, period, room = slot[0], slot[1], slot[2]
                if (sid, day, period, room) in vars.x:
                    model.AddHint(vars.x[(sid, day, period, room)], 1)
            elif isinstance(slot, dict):
                day, period, room = slot.get("day"), slot.get("start_period"), slot.get("room_id")
                if (sid, day, period, room) in vars.x:
                    model.AddHint(vars.x[(sid, day, period, room)], 1)

    # Solver configuration
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = options.time_limit_seconds
    solver.parameters.num_workers = options.num_workers
    solver.parameters.random_seed = options.random_seed
    solver.parameters.log_search_progress = options.log_search_progress

    solve_status_code = solver.Solve(model)
    elapsed = time.time() - start_wall

    status_name = solver.StatusName(solve_status_code)
    is_feasible = solve_status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    diagnostics = {
        "status_code": solve_status_code,
        "status_name": status_name,
        "wall_time": elapsed,
        "branches": solver.NumBranches(),
        "conflicts": solver.NumConflicts(),
        "num_variables": len(model.Proto().variables),
        "num_constraints": len(model.Proto().constraints),
        "random_seed": options.random_seed,
        "num_workers": options.num_workers,
        "best_objective_bound": solver.BestObjectiveBound() if options.optimize_soft and is_feasible else None,
    }

    if not is_feasible:
        return TimetableResult(
            status=status_name,
            is_feasible=False,
            objective_value=None,
            wall_time_seconds=elapsed,
            sessions=[],
            schedule_dict={},
            diagnostics=diagnostics,
        )

    # Extract soft penalties directly from solved CP-SAT variables
    if options.optimize_soft:
        solver_penalties = {}
        for pen_name, terms in vars.soft_penalty_terms.items():
            solver_penalties[pen_name] = int(sum(solver.Value(var) * coeff for var, coeff in terms))
        diagnostics["solver_soft_penalties"] = solver_penalties

        s2_by_grp_day = {}
        for (g, day, p), gap_var in vars.s2_gap_vars.items():
            key = f"{g}_{day}"
            s2_by_grp_day[key] = s2_by_grp_day.get(key, 0) + int(solver.Value(gap_var))
        diagnostics["solver_s2_by_group_day"] = s2_by_grp_day
        diagnostics["solver_s2_total"] = int(sum(s2_by_grp_day.values()))

    # Extract assignments
    sessions_out = extract_assignments(solver, ctx, vars)
    sched_dict = build_schedule_dict(
        dataset_id=dataset.dataset_id,
        sessions=sessions_out,
    )

    obj_val = solver.ObjectiveValue() if options.optimize_soft else None

    return TimetableResult(
        status=status_name,
        is_feasible=True,
        objective_value=obj_val,
        wall_time_seconds=elapsed,
        sessions=sessions_out,
        schedule_dict=sched_dict,
        diagnostics=diagnostics,
    )
