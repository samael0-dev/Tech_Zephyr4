"""Tests for disruption repair and stability."""

import json
from pathlib import Path
from engine.rescheduler.engine import reschedule
from engine.scheduler.validator_adapter import run_validator_direct

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")
DISRUPTION_PATH = Path("CrunchWeek_StarterPack/examples/sample_disruption.json")
BASELINE_PATH = Path("exports/schedule.json")


def test_disruption_rescheduling():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    with open(DISRUPTION_PATH, "r", encoding="utf-8") as f:
        dis = json.load(f)
    with open(BASELINE_PATH, "r", encoding="utf-8") as f:
        base = json.load(f)

    res = reschedule(base, dis, data, time_limit_seconds=20.0)

    assert res.is_feasible
    assert res.sessions_moved <= 12  # Strict stability threshold
    assert res.time_changed <= 3

    # Validate against official validator logic
    rep = run_validator_direct(
        data_dict=data,
        schedule_dict=res.schedule_dict,
        baseline_dict=base,
        disruption_dict=dis,
    )
    assert rep["hard_violation_count"] == 0
    assert rep["stability"]["sessions_moved"] == res.sessions_moved
