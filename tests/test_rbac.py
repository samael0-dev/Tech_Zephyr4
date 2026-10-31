from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_rbac_dashboard_protection(client: TestClient):
    admin_token = get_token(client, "dean@cit.edu")
    student_token = get_token(client, "student.y1a@cit.edu")
    faculty_token = get_token(client, "f01@cit.edu")
    coord_token = get_token(client, "coordinator.cse@cit.edu")
    club_token = get_token(client, "dramatics@cit.edu")

    # 1. Dean dashboard: Admin can access; others get 403 Forbidden
    res_admin = client.get("/api/v1/dashboard/dean", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["data"]["metrics"]["total_rooms"] == 27

    res_student_on_dean = client.get("/api/v1/dashboard/dean", headers={"Authorization": f"Bearer {student_token}"})
    assert res_student_on_dean.status_code == 403

    res_club_on_dean = client.get("/api/v1/dashboard/dean", headers={"Authorization": f"Bearer {club_token}"})
    assert res_club_on_dean.status_code == 403

    # 2. Faculty dashboard: Faculty can access; Student cannot
    res_fac = client.get("/api/v1/dashboard/faculty", headers={"Authorization": f"Bearer {faculty_token}"})
    assert res_fac.status_code == 200
    assert res_fac.json()["data"]["faculty_id"] == "F01"

    res_student_on_fac = client.get("/api/v1/dashboard/faculty", headers={"Authorization": f"Bearer {student_token}"})
    assert res_student_on_fac.status_code == 403

    # 3. Coordinator dashboard
    res_coord = client.get("/api/v1/dashboard/coordinator", headers={"Authorization": f"Bearer {coord_token}"})
    assert res_coord.status_code == 200
    assert res_coord.json()["data"]["department"] == "CSE"

    # 4. Student dashboard
    res_stud = client.get("/api/v1/dashboard/student", headers={"Authorization": f"Bearer {student_token}"})
    assert res_stud.status_code == 200
    assert res_stud.json()["data"]["student_group"] == "Y1-A"


def test_rbac_action_protection(client: TestClient):
    student_token = get_token(client, "student.y1a@cit.edu")
    admin_token = get_token(client, "dean@cit.edu")

    # Timetable generation: only admin
    stud_gen = client.post("/api/v1/schedules/generate", json={}, headers={"Authorization": f"Bearer {student_token}"})
    assert stud_gen.status_code == 403

    admin_gen = client.post("/api/v1/schedules/generate", json={}, headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_gen.status_code == 200
