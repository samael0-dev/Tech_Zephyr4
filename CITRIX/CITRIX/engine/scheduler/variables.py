"""CP-SAT variable definitions and candidate placement indexing."""

from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Set, Tuple
from ortools.sat.python import cp_model
from engine.scheduler.data_loader import ScheduleContext


@dataclass(frozen=True)
class PlacementCandidate:
    session_id: str
    day: str
    start_period: int
    room_id: str
    duration: int

    @property
    def periods(self) -> List[int]:
        return list(range(self.start_period, self.start_period + self.duration))


class ScheduleVariables:
    """Manages CP-SAT decision variables for sessions, baskets, and auxiliary metrics."""

    def __init__(self, model: cp_model.CpModel, ctx: ScheduleContext):
        self.model = model
        self.ctx = ctx

        # session_id -> list of PlacementCandidate
        self.candidates_by_session: Dict[str, List[PlacementCandidate]] = {}
        # (session_id, day, start_period, room_id) -> BoolVar
        self.x: Dict[Tuple[str, str, int, str], cp_model.BoolVar] = {}
        # session_id -> list of BoolVar
        self.session_vars: Dict[str, List[cp_model.BoolVar]] = {}

        # basket_slot -> (day, start_period) -> BoolVar
        self.basket_slot_vars: Dict[str, Dict[Tuple[str, int], cp_model.BoolVar]] = {}
        # basket_slot -> (day, period) -> BoolVar (active at period)
        self.basket_period_active: Dict[str, Dict[Tuple[str, int], cp_model.BoolVar]] = {}

        # Metric tracking for soft objectives
        # penalty_name -> list of (variable, weight/coefficient)
        self.soft_penalty_terms: Dict[str, List[Tuple[Any, int]]] = defaultdict(list)
        # (group_id, day, period) -> BoolVar for S2 idle gaps
        self.s2_gap_vars: Dict[Tuple[str, str, int], cp_model.BoolVar] = {}

        self._build_candidates()
        self._create_decision_variables()

    def _build_candidates(self):
        """Build pruned valid candidate placements for each session."""
        for sid, s in self.ctx.sessions.items():
            candidates = []
            valid_starts = self.ctx.valid_start_periods.get(sid, [])
            comp_rooms = self.ctx.compatible_rooms.get(sid, [])
            fx = s.fixed_slot

            for day in self.ctx.days:
                if fx and fx.day != day:
                    continue

                for start in valid_starts:
                    if fx and fx.start_period != start:
                        continue

                    # Check faculty unavailability
                    pers = list(range(start, start + s.duration))
                    fac_clash = any((s.faculty_id, day, p) in self.ctx.fac_unavailable for p in pers)
                    if fac_clash:
                        continue

                    for rid in comp_rooms:
                        # Check room unavailability
                        room_clash = any((rid, day, p) in self.ctx.room_unavailable for p in pers)
                        if room_clash:
                            continue

                        cand = PlacementCandidate(
                            session_id=sid,
                            day=day,
                            start_period=start,
                            room_id=rid,
                            duration=s.duration,
                        )
                        candidates.append(cand)

            self.candidates_by_session[sid] = candidates

    def _create_decision_variables(self):
        """Create binary decision variables in the CP-SAT model."""
        for sid, candidates in self.candidates_by_session.items():
            s_vars = []
            for c in candidates:
                var = self.model.NewBoolVar(f"x_{sid}_{c.day}_P{c.start_period}_{c.room_id}")
                self.x[(sid, c.day, c.start_period, c.room_id)] = var
                s_vars.append(var)
            self.session_vars[sid] = s_vars

        # Identify all basket slots
        baskets: Set[str] = {s.basket_slot for s in self.ctx.sessions.values() if s.basket_slot}
        for b in baskets:
            self.basket_slot_vars[b] = {}
            self.basket_period_active[b] = {}
            for day in self.ctx.days:
                for start in self.ctx.teaching_periods:
                    # Basket sessions typically have duration 1, but we support arbitrary
                    self.basket_slot_vars[b][(day, start)] = self.model.NewBoolVar(f"bslot_{b}_{day}_P{start}")
                for p in range(1, 10):
                    self.basket_period_active[b][(day, p)] = self.model.NewBoolVar(f"bact_{b}_{day}_P{p}")
