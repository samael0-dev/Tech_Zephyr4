"""Integration tests for live Neon PostgreSQL database and query services."""

import pytest
from api.database import test_connection as run_test_connection, execute_query
from api.services.campus_service import CampusService
from api.services.analytics_service import AnalyticsService
from ai.rag.pipeline import CampusRAG


def test_database_connectivity():
    """Verify live database connectivity to Neon PostgreSQL."""
    res = run_test_connection()
    assert res.get("success") is True
    assert "server_version" in res
    assert "PostgreSQL" in res["server_version"]


def test_all_expected_tables_exist():
    """Verify all 30 CITRIX relational domain tables are present in the public schema."""
    sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    rows = execute_query(sql)
    existing = {r["table_name"] for r in rows}

    expected = {
        "roles", "buildings", "departments", "users", "user_roles",
        "faculty_profiles", "faculty_unavailabilities", "student_groups",
        "academic_terms", "academic_periods", "courses", "rooms",
        "room_unavailabilities", "sessions", "session_groups",
        "event_categories", "booking_requests", "booking_cancellations",
        "exam_sessions", "exams", "exam_room_allocations",
        "schedules", "schedule_versions", "timetable_entries",
        "knowledge_documents", "document_chunks"
    }

    missing = expected - existing
    assert not missing, f"Missing tables in PostgreSQL: {missing}"


def test_room_queries_and_details():
    """Verify room details lookup and feature inspection."""
    room = CampusService.get_room_details("LH-1")
    assert room is not None
    assert room["id"] == "LH-1"
    assert room["capacity"] == 200
    assert room["exam_capacity"] == 100
    assert "Lecture Hall Complex" in room["building_name"]
    assert "projector" in room["features"]


def test_available_rooms_query():
    """Verify available rooms filter for Monday Period 1."""
    available = CampusService.get_available_rooms("MON", 1, min_capacity=50)
    assert len(available) > 0
    # Every returned room must satisfy capacity >= 50
    for r in available:
        assert r["capacity"] >= 50


def test_faculty_timetable_query():
    """Verify timetable retrieval for faculty member F01."""
    sessions = CampusService.get_faculty_timetable("F01")
    assert len(sessions) > 0
    for s in sessions:
        assert s["faculty_id"] == "F01"
        assert s["day"] in ["MON", "TUE", "WED", "THU", "FRI"]
        assert 1 <= s["start_period"] <= 9


def test_student_group_timetable():
    """Verify timetable retrieval for student cohort Y1-A."""
    sessions = CampusService.get_student_group_timetable("Y1-A")
    assert len(sessions) > 0
    for s in sessions:
        assert 1 <= s["start_period"] <= 9


def test_room_schedule_query():
    """Verify room schedule retrieval for lecture hall LH-1."""
    sessions = CampusService.get_room_schedule("LH-1")
    assert len(sessions) > 0
    for s in sessions:
        assert s["room_id"] == "LH-1"


def test_exam_schedule_query():
    """Verify exam schedule query for calculus course MA101."""
    exams = CampusService.get_exam_schedule(course_id="MA101")
    assert len(exams) > 0
    assert "MA101" in exams[0]["course_ids"]
    assert exams[0]["scheduled_day"] is not None
    assert exams[0]["scheduled_session"] in ["AM", "PM"]


def test_room_utilisation_analytics():
    """Verify room utilization percentage computation."""
    room_util = AnalyticsService.get_room_utilisation()
    assert len(room_util) == 27
    for ru in room_util:
        assert 0.0 <= float(ru["utilisation_pct"]) <= 100.0


def test_building_utilisation_analytics():
    """Verify building aggregate utilization ranking."""
    b_util = AnalyticsService.get_building_utilisation()
    assert len(b_util) > 0
    for bu in b_util:
        assert 0.0 <= float(bu["utilisation_pct"]) <= 100.0


def test_scheduling_summary_metrics():
    """Verify master baseline schedule high-level metrics."""
    summary = AnalyticsService.get_scheduling_summary()
    assert int(summary["hard_violations_count"]) == 0
    assert int(summary["scheduled_sessions"]) == 189
    assert int(summary["approved_bookings"]) == 24


def test_rag_database_chunk_retrieval():
    """Verify RAG system loads chunks from PostgreSQL and performs grounded retrieval."""
    rag = CampusRAG()
    assert len(rag.chunks) > 0
    res = rag.answer_query("When are teaching periods scheduled?")
    assert res["grounded"] is True
    assert len(res["sources"]) > 0
