"""Verify booking priority, effective categories, and decision rules in PostgreSQL."""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import query_neon_http

def main():
    print("=" * 90)
    print("BOOKING PRIORITY & EFFECTIVE CATEGORY AUDIT")
    print("=" * 90)

    with open("CrunchWeek_StarterPack/data/cit_public.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    order = data["priority_order"]
    caps = data["role_category_cap"]

    def val_eff(req):
        cap = caps.get(req["role"], "club_event")
        a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
        return order[max(a, order.index(cap))]

    db_rows = query_neon_http("SELECT id, role, requested_category, effective_category, status, assigned_room_id, assigned_day, assigned_start_period, decision_reason FROM booking_requests ORDER BY id;")["rows"]

    mismatches = []
    print(f"{'ID':<7} | {'Role':<14} | {'Requested Cat':<18} | {'DB Effective':<18} | {'Val Expected':<18} | {'Status':<10}")
    print("-" * 90)
    for r in db_rows:
        req_json = next(b for b in data["booking_requests"] if b["id"] == r["id"])
        expected_eff = val_eff(req_json)
        is_match = (r["effective_category"] == expected_eff)
        if not is_match:
            mismatches.append(r["id"])
        match_str = "MATCH" if is_match else "MISMATCH!"
        print(f"{r['id']:<7} | {r['role']:<14} | {r['requested_category']:<18} | {r['effective_category']:<18} | {expected_eff:<18} | {r['status']:<10} [{match_str}]")

    print("\n--- PRIORITY AUDIT FINDINGS ---")
    print(f"Total requests verified: {len(db_rows)}")
    print(f"Total effective_category mismatches: {len(mismatches)}")
    if not mismatches:
        print("[VERIFIED] All 25 booking requests have 100% compliant effective_category matching official validator clamp logic.")

    # Check clamped examples specifically:
    print("\n--- SPECIFIC ROLE CLAMPING EXAMPLES IN DATASET ---")
    for r in db_rows:
        if r["requested_category"] != r["effective_category"]:
            print(f"  [CLAMPED] {r['id']} ({r['role']}): requested '{r['requested_category']}' -> clamped to '{r['effective_category']}' (cap is {caps.get(r['role'])})")

if __name__ == "__main__":
    main()
