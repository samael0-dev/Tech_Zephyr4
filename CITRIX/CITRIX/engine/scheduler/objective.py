"""Soft penalty objective modeling corresponding to official S1-S6 validator rules."""

from collections import defaultdict
from typing import Dict, List, Tuple
from ortools.sat.python import cp_model

from engine.scheduler.data_loader import ScheduleContext
from engine.scheduler.variables import ScheduleVariables


def add_soft_objectives(
    model: cp_model.CpModel,
    ctx: ScheduleContext,
    vars: ScheduleVariables,
    weights: Dict[str, int] = None,
) -> cp_model.LinearExpr:
    """Build linear objective minimizing soft penalties S1 through S6."""

    if weights is None:
        weights = {"S1": 1, "S2": 1, "S3": 1, "S4": 1, "S5": 1, "S6": 1}

    objective_terms = []

    # 1. S1 (Faculty preferences), S5 (Room utilization), S6 (Late session P9)
    # These can be precomputed directly per candidate placement variable x!
    for sid, candidates in vars.candidates_by_session.items():
        s = ctx.sessions[sid]
        f = ctx.faculty[s.faculty_id]
        prefs = f.preferences

        for c in candidates:
            x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
            r = ctx.rooms[c.room_id]
            pen_c = 0

            # S1: 2 points per hour in avoided day/period
            for pref in prefs:
                if pref.type == "avoid":
                    pref_days = pref.days if pref.days else ctx.days
                    if c.day in pref_days:
                        overlap_hours = sum(1 for p in c.periods if p in pref.periods)
                        if overlap_hours > 0:
                            pen_c += 2 * overlap_hours * weights.get("S1", 1)
                            vars.soft_penalty_terms["S1"].append((x_var, 2 * overlap_hours))

            # S5: 1 point if size / capacity < 0.4
            if r.capacity > 0 and (s.size / r.capacity) < 0.4:
                pen_c += 1 * weights.get("S5", 1)
                vars.soft_penalty_terms["S5"].append((x_var, 1))

            # S6: 1 point if period 9 is occupied
            if 9 in c.periods:
                pen_c += 1 * weights.get("S6", 1)
                vars.soft_penalty_terms["S6"].append((x_var, 1))

            if pen_c > 0:
                objective_terms.append(x_var * pen_c)

    # 2. S4: Multiple lectures of same course in one day for a group (weight 3)
    # Also basket lectures of same course twice in a day
    w_s4 = weights.get("S4", 1)
    if w_s4 > 0:
        # Group non-basket lectures by (group, day, course_id)
        grp_course_day = defaultdict(list)
        for sid, candidates in vars.candidates_by_session.items():
            s = ctx.sessions[sid]
            if s.kind == "lecture" and not s.basket_slot:
                for c in candidates:
                    x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
                    for g in s.groups:
                        grp_course_day[(g, c.day, s.course_id)].append(x_var)

        for (g, day, cid), x_list in grp_course_day.items():
            if len(x_list) > 1:
                # If sum(x_list) > 1, penalize 3 * (count - 1)
                count_var = model.NewIntVar(0, len(x_list), f"cnt_{g}_{day}_{cid}")
                model.Add(count_var == sum(x_list))
                excess = model.NewIntVar(0, len(x_list), f"ex_{g}_{day}_{cid}")
                model.Add(excess >= count_var - 1)
                model.Add(excess >= 0)
                objective_terms.append(excess * (3 * w_s4))
                vars.soft_penalty_terms["S4"].append((excess, 3))

        # Basket courses twice in a day
        basket_course_day = defaultdict(list)
        for sid, candidates in vars.candidates_by_session.items():
            s = ctx.sessions[sid]
            if s.basket_slot:
                for c in candidates:
                    x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
                    basket_course_day[(s.course_id, c.day)].append(x_var)

        for (cid, day), x_list in basket_course_day.items():
            if len(x_list) > 1:
                b_excess = model.NewIntVar(0, len(x_list), f"bex_{cid}_{day}")
                model.Add(b_excess >= sum(x_list) - 1)
                model.Add(b_excess >= 0)
                objective_terms.append(b_excess * (3 * w_s4))
                vars.soft_penalty_terms["S4"].append((b_excess, 3))

    # 3. S3: Student daily overload (> 6 hours in day, weight 3 per excess hour)
    w_s3 = weights.get("S3", 1)
    if w_s3 > 0:
        grp_day_hours = defaultdict(list)
        for sid, candidates in vars.candidates_by_session.items():
            s = ctx.sessions[sid]
            for c in candidates:
                x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
                for g in s.groups:
                    # Note: for basket sessions, all sessions in basket for a group run in parallel,
                    # so only 1 hour is counted per basket slot per day
                    # Handled simply by taking duration
                    grp_day_hours[(g, c.day)].append((x_var, s.duration, s.basket_slot))

        for (g, day), items in grp_day_hours.items():
            # Linear combination of hours
            # To avoid double-counting parallel baskets, use basket slot active vars
            terms = [x_var * dur for x_var, dur, bslot in items if not bslot]
            # Add basket active hours
            baskets_for_g = {bslot for _, _, bslot in items if bslot}
            for b in baskets_for_g:
                # basket duration is 1
                slot_vars = [vars.basket_slot_vars[b][(day, st)] for st in ctx.teaching_periods if (day, st) in vars.basket_slot_vars[b]]
                terms.extend(slot_vars)

            total_h = model.NewIntVar(0, 9, f"th_{g}_{day}")
            model.Add(total_h == sum(terms))
            h_excess = model.NewIntVar(0, 3, f"hex_{g}_{day}")
            model.Add(h_excess >= total_h - 6)
            model.Add(h_excess >= 0)
            objective_terms.append(h_excess * (3 * w_s3))
            vars.soft_penalty_terms["S3"].append((h_excess, 3))

    # 4. S2: Student group daily idle gaps (sum of empty periods between first and last class)
    w_s2 = weights.get("S2", 1)
    if w_s2 > 0:
        grp_period_terms = defaultdict(list)
        grp_baskets = defaultdict(set)

        for sid, candidates in vars.candidates_by_session.items():
            s = ctx.sessions[sid]
            if s.basket_slot:
                for g in s.groups:
                    grp_baskets[g].add(s.basket_slot)
            else:
                for c in candidates:
                    x_var = vars.x[(sid, c.day, c.start_period, c.room_id)]
                    for p in c.periods:
                        for g in s.groups:
                            grp_period_terms[(g, c.day, p)].append(x_var)

        for g in ctx.groups:
            b_list = list(grp_baskets.get(g, set()))
            for day in ctx.days:
                u = {}
                for p in range(1, 10):
                    terms = list(grp_period_terms.get((g, day, p), []))
                    for b in b_list:
                        if (day, p) in vars.basket_period_active[b]:
                            terms.append(vars.basket_period_active[b][(day, p)])

                    if not terms:
                        u_var = model.NewBoolVar(f"u_{g}_{day}_P{p}_zero")
                        model.Add(u_var == 0)
                        u[p] = u_var
                    elif len(terms) == 1:
                        u[p] = terms[0]
                    else:
                        u_var = model.NewBoolVar(f"u_{g}_{day}_P{p}")
                        model.Add(u_var == sum(terms))
                        u[p] = u_var

                # Prefix OR: pref[p] is 1 iff group has class in period 1..p
                pref = {}
                pref[1] = u[1]
                for p in range(2, 9):
                    pref_var = model.NewBoolVar(f"pref_{g}_{day}_P{p}")
                    model.AddMaxEquality(pref_var, [pref[p - 1], u[p]])
                    pref[p] = pref_var

                # Suffix OR: suff[p] is 1 iff group has class in period p..9
                suff = {}
                suff[9] = u[9]
                for p in range(8, 1, -1):
                    suff_var = model.NewBoolVar(f"suff_{g}_{day}_P{p}")
                    model.AddMaxEquality(suff_var, [suff[p + 1], u[p]])
                    suff[p] = suff_var

                # Gap indicator for periods 2..8:
                # Active iff class exists earlier, class exists later, and group is free at p
                for p in range(2, 9):
                    gap_var = model.NewBoolVar(f"gap_{g}_{day}_P{p}")
                    model.AddMinEquality(gap_var, [pref[p - 1], suff[p + 1], u[p].Not()])
                    vars.s2_gap_vars[(g, day, p)] = gap_var
                    vars.soft_penalty_terms["S2"].append((gap_var, 1))
                    objective_terms.append(gap_var * w_s2)

    total_objective = sum(objective_terms)
    model.Minimize(total_objective)
    return total_objective
