from fastapi.testclient import TestClient

from app.ai.agent.intent import classify_user_intent


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_intent_classification_and_hinglish_extraction():
    """
    Tests intent classification and entity parsing in English and Hinglish.
    """
    # 1. English Booking status inquiry
    res1 = classify_user_intent("Why was my booking request BR-09 rejected?")
    assert res1.intent_type == "booking_status"
    assert res1.entities.get("booking_id") == "BR-09"

    # 2. Hinglish Room Search
    res2 = classify_user_intent("Kal SH-1 khali hai kya shaam ko 6 se 8 baje tak?")
    assert res2.intent_type == "room_search"
    assert res2.entities.get("room_id") == "SH-1"
    assert res2.entities.get("day") == "TUE"  # kal -> TUE

    # 3. Timetable lookup
    res3 = classify_user_intent("Show timetable for Y1-A on Wednesday")
    assert res3.intent_type == "timetable_lookup"
    assert res3.entities.get("student_group") == "Y1-A"
    assert res3.entities.get("day") == "WED"

    # 4. Dean operational summary
    res4 = classify_user_intent("Summarise today's campus activities and underutilised venues")
    assert res4.intent_type == "dean_summary"


def test_agent_chat_room_availability(client: TestClient):
    """
    Verifies that conversational queries trigger the room availability tool and return grounded facts.
    """
    student_token = get_token(client, "student.y1a@cit.edu")

    chat_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Check availability for SH-1 on Monday"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()["data"]
    assert data["intent"] == "room_search"
    assert "SH-1" in data["reply"]
    assert data["tool_result"] is not None
    assert data["tool_result"]["room_id"] == "SH-1"


def test_agent_chat_booking_rejection_explanation(client: TestClient):
    """
    Verifies that the assistant explains why a booking request was rejected based on DB decision.
    """
    admin_token = get_token(client, "dean@cit.edu")

    # In starter pack: BR-09 is for 1200 people, rejected because no venue seats 1200
    chat_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Why was booking BR-09 rejected?"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()["data"]
    assert data["intent"] == "booking_status"
    assert "BR-09" in data["reply"]
    assert "tool_result" in data
    assert data["tool_result"]["found"] is True


def test_agent_confirmation_before_action_flow(client: TestClient):
    """
    Confirms the Human-in-the-Loop safeguard:
    Booking requests generated via AI assistant MUST return `requires_confirmation: True`,
    and cannot write to the database until explicitly confirmed by the user.
    """
    club_token = get_token(client, "dramatics@cit.edu")

    # 1. User asks assistant to book a room
    req_payload = {
        "message": "I want to book SH-1 on Thursday from period 10 to 12 for 130 people for our annual play",
        "session_id": "test-session-dramatics",
    }
    chat_resp = client.post(
        "/api/v1/assistant/chat",
        json=req_payload,
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()["data"]

    # Must require confirmation!
    assert chat_data["requires_confirmation"] is True
    assert chat_data["action_proposal"] is not None
    proposal = chat_data["action_proposal"]
    assert proposal["requested_room"] == "SH-1"
    assert proposal["attendance"] == 130

    # 2. Confirm the action via /assistant/confirm-action
    confirm_payload = {
        "action_type": "create_booking",
        "proposal": proposal,
        "confirmed": True,
    }
    confirm_resp = client.post(
        "/api/v1/assistant/confirm-action",
        json=confirm_payload,
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()["data"]
    assert confirm_data["status"] == "created"
    assert "booking_id" in confirm_data


def test_dean_ai_insights_endpoint(client: TestClient):
    """
    Tests the Dean's AI command intelligence dashboard.
    Verifies that Admin can access it and Student is blocked.
    """
    student_token = get_token(client, "student.y1a@cit.edu")
    admin_token = get_token(client, "dean@cit.edu")

    # Student blocked -> 403 Forbidden
    stud_resp = client.get(
        "/api/v1/assistant/dean-insights",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert stud_resp.status_code == 403

    # Admin allowed -> 200 OK
    admin_resp = client.get(
        "/api/v1/assistant/dean-insights",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_resp.status_code == 200
    intel = admin_resp.json()["data"]
    assert "briefing" in intel
    assert intel["briefing"]["total_campus_venues"] == 27
    assert len(intel["observations"]) > 0
    assert len(intel["alerts"]) > 0
