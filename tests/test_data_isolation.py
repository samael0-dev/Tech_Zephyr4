from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_timetable_student_group_isolation(client: TestClient):
    """
    Ensures student can only view classes relevant to their own group.
    """
    student_token = get_token(client, "student.y1a@cit.edu")

    # Call /timetable
    resp = client.get("/api/v1/timetable", headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 200
    sessions = resp.json()["data"]
    assert len(sessions) > 0
    # Every session returned MUST include Y1-A in groups
    for s in sessions:
        assert "Y1-A" in s["groups"]


def test_timetable_faculty_isolation(client: TestClient):
    """
    Ensures faculty can only view classes taught by them.
    """
    faculty_token = get_token(client, "f01@cit.edu")

    resp = client.get("/api/v1/timetable", headers={"Authorization": f"Bearer {faculty_token}"})
    assert resp.status_code == 200
    sessions = resp.json()["data"]
    assert len(sessions) > 0
    for s in sessions:
        assert s["faculty_id"] == "F01"


def test_exam_student_isolation(client: TestClient):
    """
    Ensures student only sees exams for their enrolled student group.
    """
    student_token = get_token(client, "student.y1a@cit.edu")

    resp = client.get("/api/v1/exams", headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 200
    exams = resp.json()["data"]
    assert len(exams) > 0
    for ex in exams:
        assert "Y1-A" in ex["groups"]
