"""Regression tests for S2 (Student Daily Idle Gaps) formulation against official validator.py.

Tests cover:
1. A group with no classes on a day (empty day).
2. A group with consecutive classes (0 gaps).
3. A group with idle gaps between classes.
4. A multi-period lab (duration 3, blocks P2-P4).
5. A combined lecture involving multiple student groups.
6. Elective basket sessions (parallel slots).
7. Classes around the lunch break (P5, lunch after P5, P6).
8. Multiple sessions occupying the same group/day/period where semantics allow alternatives.
"""

import pytest
from collections import defaultdict
from ortools.sat.python import cp_model
from CrunchWeek_StarterPack.validator import soft_score, Ctx


def create_minimal_test_context(student_groups, sessions, rooms=None):
    """Construct a minimal valid dataset dict compatible with validator.py Ctx."""
    if rooms is None:
        rooms = [
            {"id": "CR-101", "type": "classroom", "capacity": 100, "accessible": True},
            {"id": "CR-102", "type": "classroom", "capacity": 100, "accessible": True},
            {"id": "LAB-1", "type": "lab", "capacity": 50, "accessible": True},
        ]

    data = {
        "dataset_id": "test-s2-dataset",
        "calendar": {
            "days": ["MON", "TUE", "WED", "THU", "FRI"],
            "periods": [
                {"id": p, "start": f"{7+p:02d}:00", "end": f"{8+p:02d}:00", "teaching": True}
                for p in range(1, 10)
            ],
            "lunch": {"after_period": 5, "start": "13:00", "end": "14:00"},
            "lab_start_periods": [2, 6],
            "event_only_periods": [],
        },
        "student_groups": [{"id": g, "name": g, "size": 30} for g in student_groups],
        "rooms": rooms,
        "faculty": [{"id": f"F_{i}", "name": f"Faculty {i}", "preferences": []} for i in range(1, 10)],
        "courses": [{"id": f"C_{i}", "name": f"Course {i}"} for i in range(1, 10)],
        "sessions": sessions,
        "booking_requests": [],
        "cancellations": [],
        "priority_order": ["institutional_event", "academic_workshop", "club_event", "guest_lecture"],
        "role_category_cap": {},
    }
    return data


def solve_s2_standalone(periods_occupied):
    """Standalone mathematical formulation of S2 matching CP-SAT."""
    # periods_occupied: dict of (group, day) -> set of occupied period ints (1..9)
    total_gaps = 0
    gaps_by_group_day = {}

    for (g, day), ps in periods_occupied.items():
        if not ps:
            gaps_by_group_day[(g, day)] = 0
            continue

        u = {p: (1 if p in ps else 0) for p in range(1, 10)}

        # Prefix OR
        pref = {}
        curr = 0
        for p in range(1, 10):
            curr = curr or u[p]
            pref[p] = curr

        # Suffix OR
        suff = {}
        curr = 0
        for p in range(9, 0, -1):
            curr = curr or u[p]
            suff[p] = curr

        # Gap indicator
        day_gaps = 0
        for p in range(2, 9):
            has_before = pref[p - 1]
            has_after = suff[p + 1]
            if has_before and has_after and not u[p]:
                day_gaps += 1

        gaps_by_group_day[(g, day)] = day_gaps
        total_gaps += day_gaps

    return total_gaps, gaps_by_group_day


def test_1_empty_day():
    """Scenario 1: A group with no classes on a day contributes zero idle gap penalty."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": "S1", "course_id": "C_1", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_1", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        }
    ]
    # S1 scheduled on TUE -> MON has 0 classes for GRP_A
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {"S1": ("TUE", 2, "CR-101")}

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    # Mon has no classes
    occ = {("GRP_A", "MON"): set(), ("GRP_A", "TUE"): {2}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 0
    assert pen_dict["S2"] == 0
    assert form_tot == pen_dict["S2"]


def test_2_consecutive_classes():
    """Scenario 2: A group with consecutive classes without gaps (P2, P3, P4) contributes zero idle gaps."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": f"S{p}", "course_id": f"C_{p}", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": f"F_{p}", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        }
        for p in (2, 3, 4)
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {f"S{p}": ("MON", p, "CR-101") for p in (2, 3, 4)}

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    occ = {("GRP_A", "MON"): {2, 3, 4}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 0
    assert pen_dict["S2"] == 0
    assert form_tot == pen_dict["S2"]


def test_3_idle_gaps_between_classes():
    """Scenario 3: Classes at P2 and P5 (free at P3, P4) produce exactly 2 idle gaps."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": "S1", "course_id": "C_1", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_1", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        {
            "id": "S2", "course_id": "C_2", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_2", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {"S1": ("MON", 2, "CR-101"), "S2": ("MON", 5, "CR-101")}

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    occ = {("GRP_A", "MON"): {2, 5}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 2
    assert pen_dict["S2"] == 2
    assert form_tot == pen_dict["S2"]


def test_4_multi_period_lab():
    """Scenario 4: A 3-hour lab (P2..P4) followed by a lecture at P6 produces 1 idle gap at P5."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": "LAB_1", "course_id": "C_1", "kind": "lab", "groups": ["GRP_A"],
            "faculty_id": "F_1", "size": 30, "duration": 3, "room_types": ["lab"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        {
            "id": "LEC_1", "course_id": "C_2", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_2", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {"LAB_1": ("MON", 2, "LAB-1"), "LEC_1": ("MON", 6, "CR-101")}

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    occ = {("GRP_A", "MON"): {2, 3, 4, 6}}
    form_tot, form_dict = solve_s2_standalone(occ)

    # Between P2 and P6, periods are 2, 3, 4, 5, 6. Period 5 is missing -> 1 gap
    assert form_dict[("GRP_A", "MON")] == 1
    assert pen_dict["S2"] == 1
    assert form_tot == pen_dict["S2"]


def test_5_combined_lecture_multiple_groups():
    """Scenario 5: Combined lecture with 2 groups; each group independently evaluated for gaps."""
    groups = ["GRP_A", "GRP_B"]
    sessions = [
        # Combined lecture for GRP_A and GRP_B at P2
        {
            "id": "COMB_1", "course_id": "C_1", "kind": "lecture", "groups": ["GRP_A", "GRP_B"],
            "faculty_id": "F_1", "size": 60, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        # Separate lecture for GRP_A at P4 (gap at P3 for GRP_A)
        {
            "id": "LEC_A", "course_id": "C_2", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_2", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        # Separate lecture for GRP_B at P3 (consecutive for GRP_B -> 0 gaps)
        {
            "id": "LEC_B", "course_id": "C_3", "kind": "lecture", "groups": ["GRP_B"],
            "faculty_id": "F_3", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {
        "COMB_1": ("MON", 2, "CR-101"),
        "LEC_A": ("MON", 4, "CR-101"),
        "LEC_B": ("MON", 3, "CR-102"),
    }

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    occ = {("GRP_A", "MON"): {2, 4}, ("GRP_B", "MON"): {2, 3}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 1  # Gap at P3
    assert form_dict[("GRP_B", "MON")] == 0  # Consecutive (P2, P3)
    assert pen_dict["S2"] == 1
    assert form_tot == pen_dict["S2"]


def test_6_elective_basket_sessions():
    """Scenario 6: Multiple parallel basket sessions do not double-count periods for the group."""
    groups = ["GRP_A"]
    sessions = [
        # Two parallel basket sessions running at P3
        {
            "id": "BASKET_S1", "course_id": "C_1", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_1", "size": 15, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": "OEB-1", "fixed_slot": None
        },
        {
            "id": "BASKET_S2", "course_id": "C_2", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_2", "size": 15, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": "OEB-1", "fixed_slot": None
        },
        # Regular session at P1
        {
            "id": "REG_1", "course_id": "C_3", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_3", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {
        "BASKET_S1": ("MON", 3, "CR-101"),
        "BASKET_S2": ("MON", 3, "CR-102"),
        "REG_1": ("MON", 1, "CR-101"),
    }

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    # GRP_A has class at P1 and P3 -> 1 gap at P2
    occ = {("GRP_A", "MON"): {1, 3}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 1
    assert pen_dict["S2"] == 1
    assert form_tot == pen_dict["S2"]


def test_7_classes_around_lunch_break():
    """Scenario 7: Lunch is after P5. Classes at P4 and P6 with P5 free count as 1 idle gap."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": "S1", "course_id": "C_1", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_1", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        {
            "id": "S2", "course_id": "C_2", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_2", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ]
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {"S1": ("MON", 4, "CR-101"), "S2": ("MON", 6, "CR-101")}

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    occ = {("GRP_A", "MON"): {4, 6}}
    form_tot, form_dict = solve_s2_standalone(occ)

    # min=4, max=6. P5 is free -> 1 gap
    assert form_dict[("GRP_A", "MON")] == 1
    assert pen_dict["S2"] == 1
    assert form_tot == pen_dict["S2"]


def test_8_multiple_basket_alternatives():
    """Scenario 8: Multiple alternative elective sessions at the same slot do not distort gaps."""
    groups = ["GRP_A"]
    sessions = [
        {
            "id": f"OEB_S{i}", "course_id": f"C_{i}", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": f"F_{i}", "size": 10, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": "OEB-1", "fixed_slot": None
        }
        for i in range(1, 4)
    ]
    # Add boundary classes at P1 and P5
    sessions.extend([
        {
            "id": "BOUND_1", "course_id": "C_4", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_4", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
        {
            "id": "BOUND_2", "course_id": "C_5", "kind": "lecture", "groups": ["GRP_A"],
            "faculty_id": "F_5", "size": 30, "duration": 1, "room_types": ["classroom"],
            "needs_accessible": False, "basket_slot": None, "fixed_slot": None
        },
    ])
    raw_data = create_minimal_test_context(groups, sessions)
    assign = {
        "OEB_S1": ("MON", 3, "CR-101"),
        "OEB_S2": ("MON", 3, "CR-102"),
        "OEB_S3": ("MON", 3, "LAB-1"),
        "BOUND_1": ("MON", 1, "CR-101"),
        "BOUND_2": ("MON", 5, "CR-101"),
    }

    v_ctx = Ctx(raw_data)
    pen_dict, _ = soft_score(v_ctx, assign)

    # Occupied at 1, 3, 5 -> gaps at 2 and 4 (2 gaps)
    occ = {("GRP_A", "MON"): {1, 3, 5}}
    form_tot, form_dict = solve_s2_standalone(occ)

    assert form_dict[("GRP_A", "MON")] == 2
    assert pen_dict["S2"] == 2
    assert form_tot == pen_dict["S2"]
