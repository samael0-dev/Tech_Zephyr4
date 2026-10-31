from fastapi.testclient import TestClient


def test_login_all_five_roles(client: TestClient):
    """
    Verifies that all 5 required roles can securely authenticate via JWT:
    1. Admin (Dean)
    2. Department Coordinator (CSE)
    3. Faculty (F01)
    4. Club Representative (Dramatics Society)
    5. Student (Rahul Sharma, Y1-A)
    """
    demo_credentials = [
        ("dean@cit.edu", "password123", "admin"),
        ("coordinator.cse@cit.edu", "password123", "department_coordinator"),
        ("f01@cit.edu", "password123", "faculty"),
        ("dramatics@cit.edu", "password123", "club"),
        ("student.y1a@cit.edu", "password123", "student"),
    ]

    for identifier, password, expected_role in demo_credentials:
        response = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": identifier, "password": password},
        )
        assert response.status_code == 200, f"Login failed for {identifier}: {response.text}"
        data = response.json()
        assert data["success"] is True
        token = data["data"]["access_token"]
        assert token is not None
        user = data["data"]["user"]
        assert user["role"] == expected_role


def test_login_invalid_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "dean@cit.edu", "password": "wrong_password"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_auth_me_endpoint(client: TestClient):
    # 1. Login as Student
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "student.y1a@cit.edu", "password": "password123"},
    )
    token = login_resp.json()["data"]["access_token"]

    # 2. Call /auth/me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    user_data = me_resp.json()["data"]
    assert user_data["username"] == "student_y1a"
    assert user_data["role"] == "student"
    assert user_data["student_group_id"] == "Y1-A"
    assert "timetable:view_group" in user_data["permissions"]
