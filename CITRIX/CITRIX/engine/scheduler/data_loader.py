"""Data loading, normalization, disruption application, and indexing for scheduling."""

import copy
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from engine.scheduler.models import Dataset, Session, Room, Faculty


def load_dataset(source: str | Path | dict) -> Dataset:
    """Load and validate dataset from file path or dict."""
    if isinstance(source, (str, Path)):
        with open(source, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    else:
        raw_data = source
    return Dataset.model_validate(raw_data)


def apply_disruption_to_dict(data: dict, disruption: dict) -> dict:
    """Apply disruption changes to raw dataset dictionary following official validator semantics."""
    d = copy.deepcopy(data)
    fac = {f["id"]: f for f in d["faculty"]}
    for ch in disruption.get("changes", []):
        t = ch["type"]
        if t == "faculty_unavailable":
            for day in ch["days"]:
                fac[ch["faculty_id"]]["unavailable"].append(
                    {"day": day, "periods": ch["periods"], "reason": ch.get("reason", "")}
                )
        elif t == "room_unavailable":
            for day in ch["days"]:
                d["room_unavailability"].append(
                    {"room_id": ch["room_id"], "day": day, "periods": ch["periods"], "reason": ch.get("reason", "")}
                )
        elif t == "add_faculty":
            d["faculty"].append(ch["faculty"])
            fac[ch["faculty"]["id"]] = ch["faculty"]
        elif t == "add_session":
            d["sessions"].append(ch["session"])
        elif t == "remove_session":
            d["sessions"] = [s for s in d["sessions"] if s["id"] != ch["session_id"]]
        else:
            raise ValueError(f"Unknown disruption change type: {t}")
    return d


class ScheduleContext:
    """Indexed scheduling context for fast CP-SAT modeling and validation."""

    def __init__(self, dataset: Dataset, raw_dict: Optional[dict] = None):
        self.dataset = dataset
        self.raw_dict = raw_dict or dataset.model_dump()
        self.days: List[str] = dataset.calendar.days
        self.lab_starts: Set[int] = set(dataset.calendar.lab_start_periods)
        self.lunch_after: int = dataset.calendar.lunch.after_period
        self.teaching_periods: List[int] = [p.id for p in dataset.calendar.periods if p.teaching]

        self.rooms: Dict[str, Room] = {r.id: r for r in dataset.rooms}
        self.faculty: Dict[str, Faculty] = {f.id: f for f in dataset.faculty}
        self.sessions: Dict[str, Session] = {s.id: s for s in dataset.sessions}
        self.groups: Dict[str, Any] = {g.id: g for g in dataset.student_groups}

        # Index unavailabilities as sets of (entity_id, day, period)
        self.fac_unavailable: Set[Tuple[str, str, int]] = set()
        for f in dataset.faculty:
            for u in f.unavailable:
                for p in u.periods:
                    self.fac_unavailable.add((f.id, u.day, p))

        self.room_unavailable: Set[Tuple[str, str, int]] = set()
        for u in dataset.room_unavailability:
            for p in u.periods:
                self.room_unavailable.add((u.room_id, u.day, p))

        # Precompute candidate slots & candidate rooms per session
        self.compatible_rooms: Dict[str, List[str]] = {}
        for sid, s in self.sessions.items():
            comp = []
            for rid, r in self.rooms.items():
                # H5: capacity
                if r.capacity < s.size:
                    continue
                # H6: room types
                if r.type not in s.room_types:
                    continue
                # H10: accessibility
                if s.needs_accessible and not r.accessible:
                    continue
                comp.append(rid)
            self.compatible_rooms[sid] = comp

        # Precompute valid start periods per session
        self.valid_start_periods: Dict[str, List[int]] = {}
        for sid, s in self.sessions.items():
            valid_starts = []
            for p in self.teaching_periods:
                end_p = p + s.duration - 1
                if end_p > 9:
                    continue
                # H9: Lunch crossing check (p <= lunch_after < end_p)
                if p <= self.lunch_after < end_p:
                    continue
                # H9: Lab start periods check
                if s.kind == "lab" and p not in self.lab_starts:
                    continue
                valid_starts.append(p)
            self.valid_start_periods[sid] = valid_starts
