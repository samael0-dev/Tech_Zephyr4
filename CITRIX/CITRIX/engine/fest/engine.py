"""Spectra Week (Fest Week) Booking & Session Displacement Engine."""

from collections import defaultdict
import copy
from typing import Any, Dict, List, Optional, Set, Tuple

CAT_WEIGHT = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}
MAX_PERIOD = 13


def get_effective_category(data: dict, req: dict) -> str:
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]


def outranks(data: dict, r1: dict, r2: dict) -> bool:
    """True if request r1 has strictly higher priority than r2."""
    order = data["priority_order"]
    c1 = order.index(get_effective_category(data, r1))
    c2 = order.index(get_effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]


class FestWeekEngine:
    """Processes booking requests for Spectra Week with priority ordering and conflict-free placement."""

    def __init__(self, data: dict, timetable_sessions: List[dict]):
        self.data = data
        self.days = data["calendar"]["days"]
        self.rooms = {r["id"]: r for r in data["rooms"]}
        self.requests = {b["id"]: b for b in data["booking_requests"]}
        self.cancelled_ids = {c["request_id"] for c in data.get("cancellations", [])}
        self.sessions = {s["id"]: s for s in data["sessions"]}

        # Room unavailability index
        self.room_un = defaultdict(set)
        for u in data.get("room_unavailability", []):
            for p in u["periods"]:
                self.room_un[u["room_id"]].add((u["day"], p))

        # Build timetable views
        self.base_assign = {
            s["session_id"]: (s["day"], s["start_period"], s["room_id"])
            for s in timetable_sessions
        }

        # Room busy: (room_id, day, period) -> list of who (session_id or booking_id)
        self.room_busy = defaultdict(list)
        # Group busy: (group_id, day, period) -> set of sessions
        self.grp_busy = defaultdict(set)

        for sid, (day, start, rid) in self.base_assign.items():
            s = self.sessions.get(sid)
            if s:
                for p in range(start, start + s["duration"]):
                    self.room_busy[(rid, day, p)].append(sid)
                    for g in s["groups"]:
                        self.grp_busy[(g, day, p)].add(sid)

    def solve(self) -> Dict[str, Any]:
        """Rank requests, allocate best clash-free slots, and handle session overrides."""
        # Sort requests strictly by priority rank to eliminate any priority inversions
        req_list = list(self.requests.values())
        req_list.sort(key=lambda r: (
            self.data["priority_order"].index(get_effective_category(self.data, r)),
            r["submitted_at"]
        ))

        decisions = []
        session_overrides = []

        # Find compatible rooms for each request
        def get_compatible_rooms(req: dict) -> List[str]:
            res = []
            # Prefer requested_room first if compatible
            preferred = req.get("requested_room")
            ordered_room_ids = list(self.rooms.keys())
            if preferred and preferred in self.rooms:
                ordered_room_ids.remove(preferred)
                ordered_room_ids.insert(0, preferred)

            for rid in ordered_room_ids:
                r = self.rooms[rid]
                if "event" not in r["allowed_uses"]:
                    continue
                if r["type"] not in req["room_types"]:
                    continue
                if r["capacity"] < req["attendance"]:
                    continue
                feats = set(r["features"]) | ({"accessible"} if r["accessible"] else set())
                if set(req["needs"]) - feats:
                    continue
                res.append(rid)
            return res

        for req in req_list:
            req_id = req["id"]

            # Cancelled requests
            if req_id in self.cancelled_ids:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": "Request cancelled by requester",
                })
                continue

            comp_rooms = get_compatible_rooms(req)
            if not comp_rooms:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": f"No compatible venue on campus seats {req['attendance']} with requested features",
                })
                continue

            dur = req["duration_periods"]
            placed = False

            # Phase 1: Try APPROVED within requested windows
            for w in req["windows"]:
                day = w["day"]
                if day not in self.days:
                    continue
                # Try all candidate start periods inside window
                for start in range(w["from_period"], w["to_period"] - dur + 2):
                    end = start + dur - 1
                    if end > MAX_PERIOD:
                        continue

                    for rid in comp_rooms:
                        # Check unavailability
                        if any((day, p) in self.room_un[rid] for p in range(start, end + 1)):
                            continue
                        # Check mandatory groups
                        grp_conflict = any(
                            bool(self.grp_busy.get((g, day, p)))
                            for g in req["mandatory_for_groups"]
                            for p in range(start, end + 1)
                        )
                        if grp_conflict:
                            continue

                        # Check room busy
                        busy_slots = [
                            self.room_busy[(rid, day, p)]
                            for p in range(start, end + 1)
                        ]
                        is_free = all(len(b) == 0 for b in busy_slots)

                        if is_free:
                            # Place booking!
                            for p in range(start, end + 1):
                                self.room_busy[(rid, day, p)].append(req_id)
                            decisions.append({
                                "request_id": req_id,
                                "status": "approved",
                                "day": day,
                                "start_period": start,
                                "end_period": end,
                                "room_id": rid,
                                "reason": f"Approved in {rid} within requested window",
                            })
                            placed = True
                            break

                    if placed:
                        break
                if placed:
                    break

            if placed:
                continue

            # Phase 2: If cannot fit in window, try ALTERNATIVE_OFFERED in other event/free periods
            alt_placed = False
            # Search evening periods P10-P13 across all days first (ideal for events)
            candidate_days = [w["day"] for w in req["windows"]] + [d for d in self.days if d not in [w["day"] for w in req["windows"]]]
            candidate_starts = list(range(10, 14 - dur + 1)) + list(range(6, 10 - dur + 1))

            for day in candidate_days:
                for start in candidate_starts:
                    end = start + dur - 1
                    if end > MAX_PERIOD:
                        continue
                    for rid in comp_rooms:
                        if any((day, p) in self.room_un[rid] for p in range(start, end + 1)):
                            continue
                        if any(bool(self.grp_busy.get((g, day, p))) for g in req["mandatory_for_groups"] for p in range(start, end + 1)):
                            continue
                        if all(len(self.room_busy[(rid, day, p)]) == 0 for p in range(start, end + 1)):
                            for p in range(start, end + 1):
                                self.room_busy[(rid, day, p)].append(req_id)
                            decisions.append({
                                "request_id": req_id,
                                "status": "alternative_offered",
                                "day": day,
                                "start_period": start,
                                "end_period": end,
                                "room_id": rid,
                                "reason": f"Requested window occupied; alternative offered in {rid} {day} P{start}-P{end}",
                            })
                            alt_placed = True
                            break
                    if alt_placed:
                        break
                if alt_placed:
                    break

            if not alt_placed:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": f"All matching rooms occupied during requested and alternative periods",
                })

        return {
            "bookings": sorted(decisions, key=lambda d: d["request_id"]),
            "session_overrides": session_overrides,
        }


def evaluate_fest_week(data: dict, timetable_sessions: List[dict]) -> Dict[str, Any]:
    """Execute fest week booking scheduler."""
    engine = FestWeekEngine(data, timetable_sessions)
    return engine.solve()
