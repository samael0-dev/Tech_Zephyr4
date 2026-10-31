"""Tests for Spectra week booking scheduler and priority enforcement."""

import json
from pathlib import Path
from engine.fest.engine import evaluate_fest_week

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")
BASELINE_PATH = Path("exports/schedule.json")


def test_fest_week_bookings():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    with open(BASELINE_PATH, "r", encoding="utf-8") as f:
        base = json.load(f)

    res = evaluate_fest_week(data, base.get("sessions", []))
    bookings = res["bookings"]

    assert len(bookings) == 25

    # BR-04 was cancelled -> must be rejected
    br04 = next(b for b in bookings if b["request_id"] == "BR-04")
    assert br04["status"] == "rejected"
    assert "cancelled" in br04["reason"].lower()

    # All decisions must have non-empty reason
    for b in bookings:
        assert b.get("reason"), f"Booking {b['request_id']} has empty reason"
