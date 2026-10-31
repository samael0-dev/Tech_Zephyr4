"""Tests for AI Assistant natural-language parsing, tool calling, and Hinglish understanding."""

from ai.assistant.schemas import UserContext
from ai.assistant.assistant import CampusAssistant, process_assistant_message


def test_parse_booking_request_1():
    asst = CampusAssistant()
    # Request 1: "Need a room for 45 people on Tuesday 6 to 8 pm, projector please."
    parsed = asst.parse_booking_text("Need a room for 45 people on Tuesday 6 to 8 pm, projector please.")
    assert parsed.attendance == 45
    assert parsed.day == "TUE"
    assert parsed.from_period == 10
    assert parsed.duration_periods == 2
    assert "projector" in parsed.needs


def test_parse_booking_request_6_hinglish():
    asst = CampusAssistant()
    # Request 6: "seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye"
    parsed = asst.parse_booking_text("seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye")
    assert parsed.attendance == 100
    assert parsed.duration_periods == 2
    assert parsed.day in ("MON", "TUE", "WED", "THU", "FRI")
    assert parsed.from_period == 10
    assert "pa_system" in parsed.needs
    assert "seminar_hall" in parsed.room_types


def test_accessibility_conflict_detection():
    # Request 7: "I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people."
    u_ctx = UserContext(user_id="user_1", role="faculty")
    resp = process_assistant_message(
        "I want SH-2 on Friday at 10 am for a wheelchair-accessible poster session, 60 people.",
        u_ctx,
    )
    # Assistant should notice SH-2 is not accessible and recommend SH-1
    assert "not wheelchair accessible" in resp.response_text or "SH-1" in resp.response_text


def test_faculty_schedule_adjustment():
    u_ctx = UserContext(user_id="F07", role="faculty", faculty_id="F07")
    resp = process_assistant_message(
        "I am unavailable on Wednesday afternoon. Can you adjust my classes?",
        u_ctx,
    )
    assert resp.intent == "faculty_adjustment"
    assert resp.requires_confirmation is True
    assert len(resp.tool_calls) > 0
