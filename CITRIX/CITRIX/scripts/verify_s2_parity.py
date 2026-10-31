"""Independent S2 Solver-to-Validator Parity Verifier.
Compares S2 calculations at the individual student group and day level.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from CrunchWeek_StarterPack.validator import Ctx, soft_score
from engine.scheduler.data_loader import load_dataset, ScheduleContext
from engine.scheduler.variables import ScheduleVariables
from engine.scheduler.constraints import add_hard_constraints
from engine.scheduler.objective import add_soft_objectives
from ortools.sat.python import cp_model


def verify_schedule_s2_parity(
    data_path: str = "CrunchWeek_StarterPack/data/cit_public.json",
    schedule_path: str = "exports/schedule.json",
) -> Dict[str, any]:
    """Verify exact parity between solver-side S2 modeling and validator.py S2 scoring."""

    with open(data_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    with open(schedule_path, "r", encoding="utf-8") as f:
        sched_data = json.load(f)

    # 1. Validator S2 computation
    v_ctx = Ctx(raw_data)
    assign = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in sched_data.get("sessions", [])
    }
    pen_dict, total_pen = soft_score(v_ctx, assign)
    val_s2_total = pen_dict.get("S2", 0)

    # Validator group-day breakdown
    grp_day = defaultdict(set)
    for sid, (day, start, rid) in assign.items():
        s = v_ctx.sessions.get(sid)
        if s is None:
            continue
        for g in s["groups"]:
            for p in range(start, start + s["duration"]):
                grp_day[(g, day)].add(p)

    val_breakdown = {}
    for g in v_ctx.data["student_groups"]:
        gid = g["id"]
        for d in v_ctx.days:
            ps = grp_day.get((gid, d), set())
            gaps = 0 if not ps else sum(1 for p in range(min(ps), max(ps) + 1) if p not in ps)
            val_breakdown[(gid, d)] = gaps

    # 2. Solver-side S2 computation
    # Replay assignments through CP-SAT model to extract exact solver variable values
    dataset = load_dataset(raw_data)
    ctx = ScheduleContext(dataset, raw_data)
    model = cp_model.CpModel()
    vars = ScheduleVariables(model, ctx)
    add_hard_constraints(model, ctx, vars)
    add_soft_objectives(model, ctx, vars)

    # Fix variables to match the given schedule assignments
    for sid, (day, start, rid) in assign.items():
        chosen_var = vars.x.get((sid, day, start, rid))
        if chosen_var is not None:
            model.Add(chosen_var == 1)

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"Could not solve schedule for parity check! Status: {solver.StatusName(status)}")

    solver_breakdown = {}
    for (g, day, p), gap_var in vars.s2_gap_vars.items():
        key = (g, day)
        solver_breakdown[key] = solver_breakdown.get(key, 0) + int(solver.Value(gap_var))

    solver_s2_total = sum(solver_breakdown.values())

    # 3. Compare at group-day level
    discrepancies = []
    all_group_days = sorted(list(val_breakdown.keys()))

    print("=" * 70)
    print(f"S2 SOLVER-TO-VALIDATOR PARITY AUDIT: {schedule_path}")
    print("=" * 70)
    print(f"{'Group':<12} | {'Day':<5} | {'Validator S2':<14} | {'Solver S2':<12} | {'Match'}")
    print("-" * 70)

    for g, d in all_group_days:
        v_gap = val_breakdown.get((g, d), 0)
        s_gap = solver_breakdown.get((g, d), 0)
        match = (v_gap == s_gap)
        if not match:
            discrepancies.append({"group": g, "day": d, "validator": v_gap, "solver": s_gap})
            print(f"{g:<12} | {d:<5} | {v_gap:<14} | {s_gap:<12} | MISMATCH!")
        elif v_gap > 0:
            print(f"{g:<12} | {d:<5} | {v_gap:<14} | {s_gap:<12} | OK")

    print("-" * 70)
    print(f"Total Validator S2: {val_s2_total}")
    print(f"Total Solver S2:    {solver_s2_total}")
    print(f"Discrepancies:      {len(discrepancies)}")
    print(f"Parity Verified:    {len(discrepancies) == 0 and val_s2_total == solver_s2_total}")
    print("=" * 70)

    return {
        "schedule_path": schedule_path,
        "is_exact_parity": len(discrepancies) == 0 and val_s2_total == solver_s2_total,
        "discrepancies": discrepancies,
        "total_validator_s2": val_s2_total,
        "total_solver_s2": solver_s2_total,
    }


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "exports/schedule.json"
    verify_schedule_s2_parity(schedule_path=target)
