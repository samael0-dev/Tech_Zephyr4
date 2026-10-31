from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_booking_role_category_cap(client: TestClient):
    """
    Ensures that when a club attempts to request an 'institute_event',
    the backend strictly caps it to 'club_event'.
    """
    club_token = get_token(client, "dramatics@cit.edu")

    payload = {
        "title": "Annual Drama Fest",
        "attendance": 100,
        "duration_periods": 3,
        "requested_category": "institute_event",  # trying to escalate category
        "windows": [{"day": "THU", "from_period": 10, "to_period": 12}],
        "room_types": ["seminar_hall"],
        "requested_room": "SH-1",
        "raw_text": "Annual Drama fest in SH-1",
    }

    resp = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {club_token}"})
    assert resp.status_code == 201
    booking_data = resp.json()["data"]
    assert booking_data["requested_category"] == "institute_event"
    assert booking_data["effective_category"] == "club_event"  # Capped!


def test_no_self_approval_security(client: TestClient):
    """
    Approval Security Requirement: 'Nobody can approve their own request.'
    Even if an Admin creates a request, they cannot approve it.
    """
    admin_token = get_token(client, "dean@cit.edu")

    # 1. Admin creates a booking request
    create_payload = {
        "title": "Dean Special Keynote",
        "attendance": 150,
        "duration_periods": 2,
        "requested_category": "institute_event",
        "windows": [{"day": "MON", "from_period": 4, "to_period": 5}],
        "room_types": ["auditorium"],
        "requested_room": "AUD",
    }
    create_resp = client.post("/api/v1/bookings", json=create_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["data"]["id"]

    # 2. Same Admin tries to approve their own request -> MUST BE BLOCKED!
    decision_payload = {
        "decision": "approved",
        "day": "MON",
        "start_period": 4,
        "end_period": 5,
        "room_id": "AUD",
        "reason": "Self-approval attempt",
    }
    decision_resp = client.post(
        f"/api/v1/bookings/{booking_id}/decision",
        json=decision_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert decision_resp.status_code == 403
    assert "No Self-Approval rule" in decision_resp.json()["error"]["message"]


def test_coordinator_lab_approval_restrictions(client: TestClient):
    """
    Department coordinators can approve bookings for their department's labs,
    but cannot approve main auditorium or non-department venues.
    """
    coord_cse_token = get_token(client, "coordinator.cse@cit.edu")
    club_token = get_token(client, "coding@cit.edu")

    # 1. Coding club creates booking for CS lab
    cs_lab_payload = {
        "title": "Python Hack Night",
        "attendance": 40,
        "duration_periods": 2,
        "requested_category": "club_event",
        "windows": [{"day": "WED", "from_period": 10, "to_period": 11}],
        "room_types": ["lab_cs"],
        "requested_room": "CS-LAB-1",
    }
    cs_resp = client.post("/api/v1/bookings", json=cs_lab_payload, headers={"Authorization": f"Bearer {club_token}"})
    assert cs_resp.status_code == 201
    booking_id = cs_resp.json()["data"]["id"]

    # CSE Coordinator approves CS-LAB-1 -> ALLOWED
    approve_resp = client.post(
        f"/api/v1/bookings/{booking_id}/decision",
        json={
            "decision": "approved",
            "day": "WED",
            "start_period": 10,
            "end_period": 11,
            "room_id": "CS-LAB-1",
            "reason": "CS Lab is available and appropriate for coding hackathon",
        },
        headers={"Authorization": f"Bearer {coord_cse_token}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "approved"

    # 2. Club creates booking for AUD (Main Auditorium)
    aud_payload = {
        "title": "General Assembly",
        "attendance": 200,
        "duration_periods": 2,
        "requested_category": "club_event",
        "windows": [{"day": "FRI", "from_period": 10, "to_period": 11}],
        "room_types": ["auditorium"],
        "requested_room": "AUD",
    }
    aud_resp = client.post("/api/v1/bookings", json=aud_payload, headers={"Authorization": f"Bearer {club_token}"})
    aud_booking_id = aud_resp.json()["data"]["id"]

    # CSE Coordinator tries to approve Auditorium -> MUST BE FORBIDDEN
    aud_approve_resp = client.post(
        f"/api/v1/bookings/{aud_booking_id}/decision",
        json={
            "decision": "approved",
            "day": "FRI",
            "start_period": 10,
            "end_period": 11,
            "room_id": "AUD",
            "reason": "Trying to approve auditorium",
        },
        headers={"Authorization": f"Bearer {coord_cse_token}"},
    )
    assert aud_approve_resp.status_code == 403
