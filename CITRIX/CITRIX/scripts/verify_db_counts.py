"""Verify row counts across all CITRIX database tables."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import query_neon_http

tables = [
    "roles", "buildings", "departments", "users", "user_roles",
    "faculty_profiles", "faculty_unavailabilities", "student_groups",
    "academic_terms", "academic_periods", "courses", "rooms",
    "room_unavailabilities", "sessions", "session_groups",
    "event_categories", "booking_requests", "booking_cancellations",
    "exam_sessions", "exams", "exam_room_allocations",
    "schedules", "schedule_versions", "timetable_entries",
    "knowledge_documents", "document_chunks"
]

def main():
    print("=" * 45)
    print(f"{'Table Name':<28} | {'Rows':<8}")
    print("=" * 45)
    total_rows = 0
    for t in tables:
        res = query_neon_http(f"SELECT count(*) as c FROM {t};")
        cnt = int(res["rows"][0]["c"])
        total_rows += cnt
        print(f"{t:<28} | {cnt:<8}")
    print("=" * 45)
    print(f"{'TOTAL ROWS ACROSS ALL TABLES':<28} | {total_rows:<8}")
    print("=" * 45)

if __name__ == "__main__":
    main()
