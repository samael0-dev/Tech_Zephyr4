"""Tests for CP-SAT timetable solver and official validator compliance."""

import json
from pathlib import Path
from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.scheduler.validator_adapter import run_validator_direct

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")


def test_generate_timetable_feasibility():
    options = SolverOptions(time_limit_seconds=30.0, num_workers=8, optimize_soft=True)
    res = generate_timetable(DATA_PATH, options)

    assert res.is_feasible, f"Solver returned status {res.status}"
    assert len(res.sessions) == 189

    # Validate sessions with validator logic (excluding exams requirement for isolated TT check)
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Temporary schedule without exams to check H1-H14
    data_no_exams = dict(data)
    data_no_exams["exams"] = []

    rep = run_validator_direct(data_no_exams, res.schedule_dict)
    assert rep["hard_violation_count"] == 0, f"Hard violations: {rep['hard_violations']}"
    assert rep["soft_penalties"]["S1"] == 0
    assert rep["soft_penalties"]["S2"] == 0
    assert rep["soft_penalties"]["S3"] == 0
