from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_scenario_a_room_booking_workflow(client: TestClient):
    """
    Scenario A — End-to-End Room Booking Workflow:
    1. Understand the booking request.
    2. Extract date, time, capacity and room requirements.
    3. Check availability using backend tools.
    4. Present suitable options.
    5. Ask for confirmation.
    6. Submit the booking request.
    7. Report the actual backend result.
    """
    club_token = get_token(client, "coding@cit.edu")

    # Step 1-4: Check availability and submit booking intent
    avail_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Is CS-LAB-1 free on Thursday from period 6 to 9?"},
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert avail_resp.status_code == 200
    avail_data = avail_resp.json()["data"]
    assert avail_data["intent"] == "room_search"
    assert avail_data["tool_result"]["found"] is True

    # Step 5: User asks to book the venue
    book_intent_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Please book CS-LAB-1 on Thursday from period 6 to 9 for 45 students for our Web Dev Workshop"},
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert book_intent_resp.status_code == 200
    book_data = book_intent_resp.json()["data"]
    assert book_data["requires_confirmation"] is True
    proposal = book_data["action_proposal"]
    assert proposal["requested_room"] == "CS-LAB-1"
    assert proposal["attendance"] == 45
    assert proposal["day"] == "THU"

    # Step 6: User confirms action
    confirm_resp = client.post(
        "/api/v1/assistant/confirm-action",
        json={
            "action_type": "create_booking",
            "proposal": proposal,
            "confirmed": True,
        },
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()["data"]
    assert confirm_data["status"] == "created"
    new_booking_id = confirm_data["booking_id"]

    # Step 7: Verify actual backend result
    inspect_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": f"What is the status of booking {new_booking_id}?"},
        headers={"Authorization": f"Bearer {club_token}"},
    )
    assert inspect_resp.status_code == 200
    inspect_data = inspect_resp.json()["data"]
    assert new_booking_id in inspect_data["reply"]
    assert inspect_data["tool_result"]["status"] == "pending"


def test_scenario_b_timetable_explanation_workflow(client: TestClient):
    """
    Scenario B — Timetable & Scheduling Explanation Workflow:
    1. Retrieve the relevant timetable.
    2. Identify the requested session.
    3. Retrieve applicable scheduling constraints.
    4. Explain why the session was assigned to that slot.
    5. Reference actual schedule information.
    """
    admin_token = get_token(client, "dean@cit.edu")

    # Ask why a course is assigned to its slot
    explain_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Explain why CS201 is scheduled in this slot and what constraints apply?"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert explain_resp.status_code == 200
    data = explain_resp.json()["data"]
    reply = data["reply"]

    # Verify constraint grounding
    assert "CS201" in reply
    assert "Faculty" in reply or "H11" in reply
    assert "hard constraints" in reply.lower()
    assert len(data["citations"]) > 0


def test_scenario_c_scheduling_disruption_workflow(client: TestClient):
    """
    Scenario C — Scheduling Disruption Workflow:
    1. Understand the disruption.
    2. Retrieve the affected sessions.
    3. Request rescheduling proposal through the backend.
    4. Present disruption proposal requiring confirmation.
    5. Submit confirmation.
    6. Admin approves disruption and confirms validator check.
    """
    faculty_token = get_token(client, "f01@cit.edu")
    admin_token = get_token(client, "dean@cit.edu")

    # 1-3: Faculty asks assistant about disruption for colleague F07
    disrupt_intent_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Faculty F07 is on emergency sick leave next Monday. What sessions are affected and propose rescheduling?"},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert disrupt_intent_resp.status_code == 200
    disrupt_data = disrupt_intent_resp.json()["data"]
    assert disrupt_data["requires_confirmation"] is True
    proposal = disrupt_data["action_proposal"]
    assert proposal["faculty_id"] == "F07"

    # 4-5: Faculty confirms submission
    confirm_resp = client.post(
        "/api/v1/assistant/confirm-action",
        json={
            "action_type": "apply_disruption",
            "proposal": proposal,
            "confirmed": True,
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()["data"]
    assert confirm_data["status"] == "pending_approval"
    disruption_id = confirm_data["disruption_id"]

    # 6: Admin approves disruption in backend
    approve_resp = client.post(
        f"/api/v1/reschedule/{disruption_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "approved"
