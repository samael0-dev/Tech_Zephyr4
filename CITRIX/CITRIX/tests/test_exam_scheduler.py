"""Tests for CP-SAT exam scheduler."""

import json
from pathlib import Path
from engine.scheduler.data_loader import load_dataset
from engine.exams.engine import generate_exam_schedule

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")


def test_exam_scheduler_feasibility():
    dataset = load_dataset(DATA_PATH)
    res = generate_exam_schedule(dataset, time_limit=15.0)

    assert res.is_feasible, f"Exam solver failed with status {res.status}"
    assert len(res.assignments) == 41

    # Verify seats for each exam
    rooms_map = {r.id: (r.capacity // 2) for r in dataset.rooms}
    exams_map = {e.id: e for e in dataset.exams}

    for a in res.assignments:
        e = exams_map[a["exam_id"]]
        total_seats = sum(rooms_map[rid] for rid in a["rooms"])
        assert total_seats >= e.size, f"Exam {e.id} size {e.size} > allocated seats {total_seats}"

    # Verify soft penalty is zero or minimal
    assert res.soft_penalty == 0
