"""CP-SAT Exam Scheduling Engine for Chilika Institute of Technology."""

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from ortools.sat.python import cp_model

from engine.scheduler.models import Dataset


@dataclass
class ExamSlot:
    index: int
    day: str
    session: str  # AM | PM


@dataclass
class ExamScheduleResult:
    status: str
    is_feasible: bool
    soft_penalty: int
    wall_time_seconds: float
    assignments: List[Dict[str, Any]] = field(default_factory=list)


class ExamScheduler:
    """Schedules midterm exams across the 6-day exam calendar respecting half-capacity rules."""

    def __init__(self, dataset: Dataset):
        self.dataset = dataset
        self.exams = dataset.exams
        self.cal = dataset.calendar.exam_week
        self.days = self.cal.days  # MON to SAT
        self.sessions = [s.id for s in self.cal.sessions]  # AM, PM

        # Build list of 12 slots (6 days x 2 sessions)
        self.slots: List[ExamSlot] = []
        idx = 0
        for d in self.days:
            for s in self.sessions:
                self.slots.append(ExamSlot(index=idx, day=d, session=s))
                idx += 1

        # Exam-capable rooms with half-capacity
        self.exam_rooms = {
            r.id: (r.capacity // 2)
            for r in dataset.rooms
            if "exam" in r.allowed_uses and (r.capacity // 2) > 0
        }

    def solve(self, time_limit_seconds: float = 15.0) -> ExamScheduleResult:
        model = cp_model.CpModel()

        # Decision variables:
        # x[e_id, slot_idx] in {0, 1}
        x: Dict[Tuple[str, int], cp_model.BoolVar] = {}
        for e in self.exams:
            for slot in self.slots:
                x[(e.id, slot.index)] = model.NewBoolVar(f"x_exam_{e.id}_s{slot.index}")

        # y[e_id, slot_idx, room_id] in {0, 1}
        y: Dict[Tuple[str, int, str], cp_model.BoolVar] = {}
        for e in self.exams:
            for slot in self.slots:
                for rid in self.exam_rooms:
                    y[(e.id, slot.index, rid)] = model.NewBoolVar(f"y_exam_{e.id}_s{slot.index}_{rid}")

        # 1. Each exam scheduled exactly once
        for e in self.exams:
            model.AddExactlyOne([x[(e.id, slot.index)] for slot in self.slots])

        # 2. Room linking & capacity constraint:
        # y[e, slot, r] <= x[e, slot]
        for e in self.exams:
            for slot in self.slots:
                x_var = x[(e.id, slot.index)]
                # Seats when scheduled at this slot
                seat_terms = []
                for rid, cap in self.exam_rooms.items():
                    y_var = y[(e.id, slot.index, rid)]
                    model.Add(y_var <= x_var)
                    seat_terms.append(y_var * cap)

                # sum of seats >= size(e) * x_var
                model.Add(sum(seat_terms) >= e.size * x_var)

        # 3. Room clash prevention (H4): at most 1 exam per room per slot
        for slot in self.slots:
            for rid in self.exam_rooms:
                room_vars = [y[(e.id, slot.index, rid)] for e in self.exams]
                model.Add(sum(room_vars) <= 1)

        # 4. Student group clash prevention (H3): at most 1 exam per group per slot
        group_exams = defaultdict(list)
        for e in self.exams:
            for g in e.groups:
                group_exams[g].append(e)

        for g, elist in group_exams.items():
            for slot in self.slots:
                g_slot_vars = [x[(e.id, slot.index)] for e in elist]
                if len(g_slot_vars) > 1:
                    model.Add(sum(g_slot_vars) <= 1)

        # 5. Soft penalty: group with > 1 exam on the same day (+5 per extra exam)
        penalty_terms = []
        for g, elist in group_exams.items():
            for day in self.days:
                # Slot indices for this day (AM and PM)
                day_slot_indices = [slot.index for slot in self.slots if slot.day == day]
                day_vars = [x[(e.id, s_idx)] for e in elist for s_idx in day_slot_indices]
                if len(day_vars) > 1:
                    excess = model.NewIntVar(0, len(day_vars), f"excess_{g}_{day}")
                    model.Add(excess >= sum(day_vars) - 1)
                    model.Add(excess >= 0)
                    penalty_terms.append(excess * 5)

        # Also add a slight room parsimony term so exams don't claim unnecessarily many rooms
        parsimony_terms = list(y.values())

        model.Minimize(sum(penalty_terms) * 100 + sum(parsimony_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.num_workers = 8

        import time
        t0 = time.time()
        st = solver.Solve(model)
        elapsed = time.time() - t0

        if st not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return ExamScheduleResult(
                status=solver.StatusName(st),
                is_feasible=False,
                soft_penalty=999,
                wall_time_seconds=elapsed,
                assignments=[],
            )

        # Extract assignments
        assignments = []
        for e in self.exams:
            for slot in self.slots:
                if solver.BooleanValue(x[(e.id, slot.index)]):
                    chosen_rooms = [
                        rid
                        for rid in self.exam_rooms
                        if solver.BooleanValue(y[(e.id, slot.index, rid)])
                    ]
                    assignments.append({
                        "exam_id": e.id,
                        "day": slot.day,
                        "session": slot.session,
                        "rooms": sorted(chosen_rooms),
                    })
                    break

        pen_val = sum(solver.Value(t) for t in penalty_terms)
        return ExamScheduleResult(
            status=solver.StatusName(st),
            is_feasible=True,
            soft_penalty=pen_val,
            wall_time_seconds=elapsed,
            assignments=sorted(assignments, key=lambda a: a["exam_id"]),
        )


def generate_exam_schedule(dataset: Dataset, time_limit: float = 15.0) -> ExamScheduleResult:
    """Convenience entry point for exam scheduling."""
    scheduler = ExamScheduler(dataset)
    return scheduler.solve(time_limit_seconds=time_limit)
