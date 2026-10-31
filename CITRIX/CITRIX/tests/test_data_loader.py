"""Tests for dataset loading, validation, and indexing."""

from pathlib import Path
from engine.scheduler.data_loader import load_dataset, ScheduleContext, apply_disruption_to_dict

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")
DISRUPTION_PATH = Path("CrunchWeek_StarterPack/examples/sample_disruption.json")


def test_load_dataset():
    dataset = load_dataset(DATA_PATH)
    assert dataset.dataset_id == "cit-public-v1"
    assert len(dataset.rooms) == 27
    assert len(dataset.faculty) == 40
    assert len(dataset.student_groups) == 14
    assert len(dataset.sessions) == 189
    assert len(dataset.exams) == 41
    assert len(dataset.booking_requests) == 25


def test_schedule_context_indexing():
    dataset = load_dataset(DATA_PATH)
    ctx = ScheduleContext(dataset)

    assert len(ctx.compatible_rooms) == 189
    for sid, rooms in ctx.compatible_rooms.items():
        assert len(rooms) > 0, f"Session {sid} must have at least one compatible room"

    # Labs must start only at P2 or P6
    for sid, s in ctx.sessions.items():
        if s.kind == "lab":
            starts = ctx.valid_start_periods[sid]
            assert set(starts).issubset({2, 6})


def test_apply_disruption():
    import json
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    with open(DISRUPTION_PATH, "r", encoding="utf-8") as f:
        dis = json.load(f)

    disrupted = apply_disruption_to_dict(data, dis)
    # Check faculty F07 has extra unavailability
    f07 = next(f for f in disrupted["faculty"] if f["id"] == "F07")
    mon_un = [u for u in f07["unavailable"] if u["day"] == "MON"]
    assert len(mon_un) > 0

    # Check added session CS202-T2
    added = next((s for s in disrupted["sessions"] if s["id"] == "CS202-T2"), None)
    assert added is not None
    assert len(disrupted["sessions"]) == len(data["sessions"]) + 1
