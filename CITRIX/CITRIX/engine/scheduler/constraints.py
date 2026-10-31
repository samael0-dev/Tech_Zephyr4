"""Hard constraint implementations for CampusOS CP-SAT scheduler."""

from collections import defaultdict
from typing import Dict, List, Set, Tuple
from ortools.sat.python import cp_model

from engine.scheduler.data_loader import ScheduleContext
from engine.scheduler.variables import ScheduleVariables


def add_hard_constraints(model: cp_model.CpModel, ctx: ScheduleContext, vars: ScheduleVariables):
    """Enforce all official hard constraints (H1 to H14)."""

    # H1: Every session scheduled exactly once
    for sid, s in ctx.sessions.items():
        vlist = vars.session_vars.get(sid, [])
        if not vlist:
            raise ValueError(f"Session {sid} has 0 valid placements! Infeasible under constraints.")
        model.AddExactlyOne(vlist)

    # Basket Slot Synchronization (H11) and Activity tracking
    baskets: Set[str] = {s.basket_slot for s in ctx.sessions.values() if s.basket_slot}
    sessions_by_basket = defaultdict(list)
    for sid, s in ctx.sessions.items():
        if s.basket_slot:
            sessions_by_basket[s.basket_slot].append(sid)

    for b, sids in sessions_by_basket.items():
        slot_dict = vars.basket_slot_vars[b]
        # Basket must choose exactly one (day, start_period) slot
        model.AddExactlyOne(list(slot_dict.values()))

        # For every session in the basket, its (day, start) must match the basket slot exactly
        for sid in sids:
            s = ctx.sessions[sid]
            for (day, start), bslot_var in slot_dict.items():
                # sum of room placements for this (sid, day, start)
                matching_vars = [
                    vars.x[(sid, day, start, r)]
                    for r in ctx.compatible_rooms[sid]
                    if (sid, day, start, r) in vars.x
                ]
                if matching_vars:
                    model.Add(sum(matching_vars) == bslot_var)
                else:
                    # If this session cannot be placed at (day, start), then bslot cannot be chosen
                    model.Add(bslot_var == 0)

        # Link basket active periods for H3
        # Basket duration is duration of its sessions (all basket sessions have duration 1)
        dur = ctx.sessions[sids[0]].duration
        for day in ctx.days:
            for p in range(1, 10):
                covering_starts = [
                    slot_dict[(day, st)]
                    for st in ctx.teaching_periods
                    if st <= p < st + dur and (day, st) in slot_dict
                ]
                if covering_starts:
                    model.Add(vars.basket_period_active[b][(day, p)] == sum(covering_starts))
                else:
                    model.Add(vars.basket_period_active[b][(day, p)] == 0)

    # Index candidates covering each (entity, day, period)
    # (room_id, day, period) -> list of x_var
    room_occupancy = defaultdict(list)
    # (faculty_id, day, period) -> list of x_var
    fac_occupancy = defaultdict(list)
    # (faculty_id, day) -> list of (x_var, duration)
    fac_day_hours = defaultdict(list)
    # (group_id, day, period) -> list of x_var (non-basket only)
    grp_non_basket_occupancy = defaultdict(list)
    # group_id -> set of basket_slots
    grp_baskets = defaultdict(set)

    for sid, candidates in vars.candidates_by_session.items():
        s = ctx.sessions[sid]
        f = s.faculty_id
        is_basket = s.basket_slot is not None

        if is_basket:
            for g in s.groups:
                grp_baskets[g].add(s.basket_slot)

        for c in candidates:
            x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
            fac_day_hours[(f, c.day)].append((x_var, c.duration))

            for p in c.periods:
                room_occupancy[(c.room_id, c.day, p)].append(x_var)
                fac_occupancy[(f, c.day, p)].append(x_var)

                if not is_basket:
                    for g in s.groups:
                        grp_non_basket_occupancy[(g, c.day, p)].append(x_var)

    # H4: No Room Clash (Room double booking prevention)
    for (rid, day, p), x_list in room_occupancy.items():
        if len(x_list) > 1:
            model.Add(sum(x_list) <= 1)

    # H2: No Faculty Clash (Faculty double booking prevention)
    for (f, day, p), x_list in fac_occupancy.items():
        if len(x_list) > 1:
            model.Add(sum(x_list) <= 1)

    # H12: Faculty Daily Teaching Hour Limit
    for (f, day), items in fac_day_hours.items():
        mx = ctx.faculty[f].max_hours_per_day
        model.Add(sum(x_var * dur for x_var, dur in items) <= mx)

    # H3: No Student Group Clash (Basket-aware)
    # Distinct sessions for group g at (day, p) <= 1, where basket sessions share 1 key
    all_groups = list(ctx.groups.keys())
    for g in all_groups:
        baskets_for_g = grp_baskets.get(g, set())
        for day in ctx.days:
            for p in range(1, 10):
                terms = list(grp_non_basket_occupancy.get((g, day, p), []))
                for b in baskets_for_g:
                    terms.append(vars.basket_period_active[b][(day, p)])
                if len(terms) > 1:
                    model.Add(sum(terms) <= 1)
