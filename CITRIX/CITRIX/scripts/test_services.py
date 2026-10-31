"""Test CampusService and AnalyticsService against live Neon PostgreSQL."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.services.campus_service import CampusService
from api.services.analytics_service import AnalyticsService

def test():
    print("--- 1. Available Rooms (MON P1, min_cap=50) ---")
    avail = CampusService.get_available_rooms("MON", 1, min_capacity=50)
    print(f"Found {len(avail)} available rooms with cap>=50")
    if avail:
        print(f"Sample: {avail[0]['id']} ({avail[0]['name']}) - Cap: {avail[0]['capacity']}")

    print("\n--- 2. Faculty Timetable (F01) ---")
    fac_tt = CampusService.get_faculty_timetable("F01")
    print(f"Faculty F01 has {len(fac_tt)} scheduled sessions")
    for s in fac_tt[:3]:
        print(f"  {s['day']} P{s['start_period']}-P{s['end_period']} | {s['course_title']} in {s['room_id']}")

    print("\n--- 3. Room Schedule (LH-1) ---")
    r_sched = CampusService.get_room_schedule("LH-1", day="MON")
    print(f"Room LH-1 on MON has {len(r_sched)} sessions")
    for s in r_sched:
        print(f"  P{s['start_period']}-P{s['end_period']} | {s['course_title']} ({s['faculty_name']})")

    print("\n--- 4. Building Utilisation ---")
    b_util = AnalyticsService.get_building_utilisation()
    for b in b_util[:5]:
        print(f"  {b['building_name']}: {b['utilisation_pct']}% ({b['occupied_slots']}/{b['total_slots']} slots)")

    print("\n--- 5. Active Schedule Summary ---")
    summary = AnalyticsService.get_scheduling_summary()
    print(f"Schedule: {summary.get('name')}")
    print(f"Scheduled sessions: {summary.get('scheduled_sessions')}")
    print(f"Hard violations: {summary.get('hard_violations_count')}")
    print(f"Approved bookings: {summary.get('approved_bookings')}")

if __name__ == "__main__":
    test()
