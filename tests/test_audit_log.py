from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_audit_logs_recorded_and_protected(client: TestClient):
    admin_token = get_token(client, "dean@cit.edu")
    student_token = get_token(client, "student.y1a@cit.edu")

    # 1. Student cannot access audit logs
    stud_resp = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {student_token}"})
    assert stud_resp.status_code == 403

    # 2. Admin can access audit logs
    admin_resp = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200
    logs = admin_resp.json()["data"]
    assert len(logs) > 0

    # Ensure actions like auth:login_success exist
    actions = [entry["action"] for entry in logs]
    assert any("auth:login" in a for a in actions)
