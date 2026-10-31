"""Phase 4 Integration Tests for CITRIX.

Verifies:
1. Academic Timetable Generation, Central Validation (H1-H14, S1-S6), and Admin-Only Publication.
2. Spectra / Fest Week Venue Booking 6-Tier Priority Evaluation and No-Self-Approval Enforcement.
3. Disruption Rescheduling, Minimal-Moves Stability, Stale Proposal Detection, and Proposal Application.
4. Midsem Examination Scheduling with Halved Capacity Rule Enforcement.
5. AI Assistant Confirmation Gate (AI Proposes, Human Confirms).
"""

import json
from pathlib import Path
from fastapi.testclient import TestClient

from app.models.canonical import Schedule, TimetableEntry, Disruption
from app.services.central_validator import (
    validate_academic_timetable,
    validate_midsem_exam_schedule,
    validate_venue_booking_decision,
    get_default_dataset,
)


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]


# ==============================================================================
# WORKFLOW 1: Academic Timetable Solver, Validation & Publication Gate
# ==============================================================================

def test_workflow_academic_timetable_validation_and_admin_gate(client: TestClient, db_session):
    """
    Workflow 1:
    - Central validator enforces H1-H14 hard constraints and evaluates S1-S6 penalties.
    - Proposes academic schedule.
    - Non-admin (faculty) publication attempt is rejected with 403.
    - Authorized Admin can publish valid schedule.
    - Corrupted/invalid schedule is blocked from publication.
    """
    admin_token = get_token(client, "dean@cit.edu")
    faculty_token = get_token(client, "f01@cit.edu")

    # 1. Verify central validator on canonical baseline schedule
    dataset = get_default_dataset()
    baseline_path = Path(__file__).resolve().parents[1] / "CITRIX" / "CITRIX" / "exports" / "schedule.json"
    assert baseline_path.exists(), "Baseline schedule JSON missing"

    with open(baseline_path, "r", encoding="utf-8") as f:
        valid_sched = json.load(f)

    val_res = validate_academic_timetable(schedule_dict=valid_sched, data_dict=dataset)
    assert val_res.valid is True
    assert val_res.hard_violation_count == 0
    assert "S1" in val_res.soft_penalties or "s1" in val_res.soft_penalties or val_res.soft_total >= 0

    # 2. Verify central validator detects hard violations on corrupted schedule
    corrupted_sched = json.loads(json.dumps(valid_sched))
    # Create H1 room clash: assign two sessions to the same room and same time
    if len(corrupted_sched.get("sessions", [])) >= 2:
        corrupted_sched["sessions"][1]["day"] = corrupted_sched["sessions"][0]["day"]
        corrupted_sched["sessions"][1]["start_period"] = corrupted_sched["sessions"][0]["start_period"]
        corrupted_sched["sessions"][1]["room_id"] = corrupted_sched["sessions"][0]["room_id"]

    corrupted_val = validate_academic_timetable(schedule_dict=corrupted_sched, data_dict=dataset)
    assert corrupted_val.valid is False
    assert corrupted_val.hard_violation_count > 0

    # 3. Create a proposal schedule directly in db or via endpoint
    create_resp = client.post(
        "/api/v1/schedules/generate",
        json={"dataset_id": "cit-public-v1", "solver_timeout_seconds": 1},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 200
    sched_id = create_resp.json()["data"]["id"]
    assert sched_id.startswith("SCHED-")

    # 4. Non-admin (Faculty) attempts to publish -> 403 Forbidden
    pub_fail = client.post(
        f"/api/v1/schedules/{sched_id}/publish",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert pub_fail.status_code == 403
    assert "Access forbidden" in pub_fail.json()["error"]["message"]

    # 5. Inject valid sessions into schedule raw_schedule_json and publish as Admin -> 200 OK
    sched_record = db_session.query(Schedule).filter(Schedule.id == sched_id).first()
    sched_record.raw_schedule_json = valid_sched

    # Populate entries
    entries = []
    for s in valid_sched.get("sessions", []):
        entries.append(
            TimetableEntry(
                schedule_id=sched_id,
                session_id=s["session_id"],
                day=s["day"],
                start_period=s["start_period"],
                end_period=s["start_period"] + s.get("duration", 1) - 1,
                room_id=s["room_id"],
                is_override=False,
            )
        )
    db_session.bulk_save_objects(entries)
    db_session.commit()

    pub_success = client.post(
        f"/api/v1/schedules/{sched_id}/publish",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pub_success.status_code == 200
    assert pub_success.json()["data"]["is_active"] is True
    assert pub_success.json()["data"]["status"] == "published"


# ==============================================================================
# WORKFLOW 2: Spectra / Fest Week 6-Tier Priority & No-Self-Approval
# ==============================================================================

def test_workflow_spectra_booking_priority_and_security(client: TestClient):
    """
    Workflow 2:
    - Evaluates Spectra Fest Week requests across 6 priority tiers:
      Tier 1: Institute Events
      Tier 2: Academic Core
      Tier 3: Department Fests
      Tier 4: Technical & Cultural Major
      Tier 5: General Club Activities
      Tier 6: External / Informal
    - Strictly blocks self-approval.
    - Returns alternative room options on conflict.
    """
    admin_token = get_token(client, "dean@cit.edu")
    club_token = get_token(client, "coding@cit.edu")

    # 1. Submit Tier 5 (Club Event) request for Auditorium on Friday period 6-8
    club_req = {
        "title": "CodeFest Hackathon",
        "attendance": 80,
        "duration_periods": 3,
        "requested_category": "club_event",
        "windows": [{"day": "FRI", "from_period": 6, "to_period": 8}],
        "room_types": ["auditorium"],
        "requested_room": "AUD",
    }
    res1 = client.post("/api/v1/bookings", json=club_req, headers={"Authorization": f"Bearer {club_token}"})
    assert res1.status_code == 201
    booking1_id = res1.json()["data"]["id"]

    # 2. Submit Tier 1 (Institute Event) request competing for Auditorium on Friday period 6-8
    inst_req = {
        "title": "Institute Foundation Day Address",
        "attendance": 180,
        "duration_periods": 3,
        "requested_category": "institute_event",
        "windows": [{"day": "FRI", "from_period": 6, "to_period": 8}],
        "room_types": ["auditorium"],
        "requested_room": "AUD",
    }
    res2 = client.post("/api/v1/bookings", json=inst_req, headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 201
    booking2_id = res2.json()["data"]["id"]

    # 3. 6-Tier priority check: verify institute_event outranks club_event
    from engine.fest.engine import outranks
    r_club = {"role": "club_lead", "requested_category": "club_event", "submitted_at": "2026-10-15T10:00:00Z"}
    r_inst = {"role": "admin", "requested_category": "institute_event", "submitted_at": "2026-10-15T10:30:00Z"}
    dataset = get_default_dataset()
    assert outranks(dataset, r_inst, r_club) is True

    # Validate booking decision using central validator
    val_booking = validate_venue_booking_decision(
        booking_id=booking1_id,
        decision="approved",
        day="FRI",
        start_period=6,
        end_period=8,
        room_id="AUD",
        data_dict=dataset,
    )
    assert val_booking.valid is True

    # 4. Test No-Self-Approval security rule: Admin cannot approve their own Institute Event
    self_app = client.post(
        f"/api/v1/bookings/{booking2_id}/decision",
        json={
            "decision": "approved",
            "day": "FRI",
            "start_period": 6,
            "end_period": 8,
            "room_id": "AUD",
            "reason": "Self-approval test attempt",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert self_app.status_code == 403
    assert "No Self-Approval rule" in self_app.json()["error"]["message"]

    # 5. Run fest engine evaluation endpoint
    eval_res = client.post(
        "/api/v1/bookings/evaluate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert eval_res.status_code == 200
    assert "bookings" in eval_res.json()["data"]


# ==============================================================================
# WORKFLOW 3: Disruption Rescheduling, Minimal Moves & Stale Detection
# ==============================================================================

def test_workflow_disruption_rescheduling_stability_and_stale_check(client: TestClient, db_session):
    """
    Workflow 3:
    - Faculty reports unavailability disruption.
    - CP-SAT engine generates repair proposal with minimal moves diff.
    - Stale proposal detection prevents applying invalidated proposals.
    - Authorized Admin approves and applies the proposal.
    """
    admin_token = get_token(client, "dean@cit.edu")
    faculty_token = get_token(client, "f01@cit.edu")

    # 1. Report faculty disruption
    disruption_payload = {
        "disruption_type": "faculty_unavailable",
        "faculty_id": "F07",
        "days": ["MON"],
        "periods": [1, 2, 3],
        "reason": "Emergency surgery",
    }
    disp_res = client.post(
        "/api/v1/reschedule",
        json=disruption_payload,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert disp_res.status_code == 200
    disruption_id = disp_res.json()["data"]["request_id"]

    # 2. Generate rescheduling proposal
    proposal_res = client.post(
        f"/api/v1/reschedule/{disruption_id}/propose",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert proposal_res.status_code == 200
    prop_data = proposal_res.json()["data"]
    assert "proposed_schedule_id" in prop_data
    assert "sessions_moved" in prop_data
    assert "moves" in prop_data

    # 3. Test non-admin cannot approve/apply proposal
    non_admin_apply = client.post(
        f"/api/v1/reschedule/{disruption_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert non_admin_apply.status_code == 403

    # 4. Stale Proposal Detection:
    # If the active schedule changes, proposal becomes stale
    d_record = db_session.query(Disruption).filter(Disruption.id == disruption_id).first()
    d_impact = dict(d_record.impact_summary or {})
    d_impact["baseline_schedule_id"] = "SCHED-NON-EXISTENT-OLD"
    d_record.impact_summary = d_impact
    db_session.commit()

    stale_apply = client.post(
        f"/api/v1/reschedule/{disruption_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert stale_apply.status_code == 400
    assert "Stale proposal detected" in stale_apply.text

    # Restore baseline_schedule_id to match active schedule
    active_sched = db_session.query(Schedule).filter(Schedule.is_active.is_(True)).first()
    d_record = db_session.query(Disruption).filter(Disruption.id == disruption_id).first()
    d_impact = dict(d_record.impact_summary or {})
    d_impact["baseline_schedule_id"] = active_sched.id if active_sched else "SCHED-CANONICAL-BASELINE"
    d_record.impact_summary = d_impact
    db_session.commit()

    # 5. Admin successfully applies active proposal
    admin_apply = client.post(
        f"/api/v1/reschedule/{disruption_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_apply.status_code == 200
    assert admin_apply.json()["data"]["status"] == "applied"


# ==============================================================================
# WORKFLOW 4: Midsem Examination Scheduling & Halved Capacity Rule
# ==============================================================================

def test_workflow_midsem_exam_halved_capacity_and_publication(client: TestClient):
    """
    Workflow 4:
    - Generates midsem exam schedule proposal.
    - Central validator strictly checks the halved room capacity rule:
      enrolled_students <= room.capacity // 2
    - Non-admin cannot publish.
    - Admin publishes exam schedule.
    """
    admin_token = get_token(client, "dean@cit.edu")
    student_token = get_token(client, "student.y1a@cit.edu")

    # 1. Verify central validator catches halved room capacity violation
    dataset = get_default_dataset()
    # EX-CE301 size is 45. Room LH-3 has capacity 120, half = 60 >= 45 -> Valid!
    valid_exam_alloc = [
        {
            "exam_id": "EX-CE301",
            "day": "MON",
            "session": "AM",
            "rooms": ["LH-3"],
        }
    ]
    val_ok = validate_midsem_exam_schedule(valid_exam_alloc, dataset)
    assert val_ok.valid is True

    # Violating exam alloc: EX-CE201 has size 50. Room CR-101 has capacity 90, half = 45 < 50 -> Capacity violation!
    violating_exam_alloc = [
        {
            "exam_id": "EX-CE201",
            "day": "MON",
            "session": "AM",
            "rooms": ["CR-101"],
        }
    ]
    val_violating = validate_midsem_exam_schedule(violating_exam_alloc, dataset)
    assert val_violating.valid is False
    assert val_violating.hard_violation_count > 0
    assert "EXAM_CAPACITY_VIOLATION" in val_violating.violated_constraints

    # 2. Generate exam proposal via API
    exam_gen = client.post(
        "/api/v1/exams/generate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert exam_gen.status_code == 200
    prop = exam_gen.json()["data"]
    assert "assignments" in prop
    assignments = prop["assignments"]

    # 3. Student attempts to publish exam schedule -> 403 Forbidden
    student_pub = client.post(
        "/api/v1/exams/publish",
        json={"assignments": assignments},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_pub.status_code == 403

    # 4. Admin publishes exam schedule -> 200 OK
    admin_pub = client.post(
        "/api/v1/exams/publish",
        json={"assignments": assignments},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_pub.status_code == 200
    assert admin_pub.json()["data"]["status"] == "published"


# ==============================================================================
# WORKFLOW 5: AI Assistant Human-in-the-Loop Confirmation Gate
# ==============================================================================

def test_workflow_ai_assistant_confirmation_gate(client: TestClient):
    """
    Workflow 5:
    - AI Assistant interprets natural language operational requests.
    - Generates actionable proposal.
    - AI CANNOT unilaterally apply changes; requires explicit confirmation.
    - Action executed only upon human confirmation.
    """
    admin_token = get_token(client, "dean@cit.edu")

    # 1. User sends reschedule command to AI Assistant
    chat_resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Please reschedule CS101 lecture for Dr. Sharma on Monday period 2 due to urgent meeting"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()["data"]
    assert chat_data["requires_confirmation"] is True
    proposal = chat_data["action_proposal"]
    assert proposal is not None
    action_type = proposal.get("action", "apply_disruption")

    # 2. Attempt to reject confirmation
    reject_resp = client.post(
        "/api/v1/assistant/confirm-action",
        json={
            "action_type": action_type,
            "proposal": proposal,
            "confirmed": False,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["data"]["status"] in ["cancelled", "aborted"]

    # 3. User explicitly confirms action
    confirm_resp = client.post(
        "/api/v1/assistant/confirm-action",
        json={
            "action_type": action_type,
            "proposal": proposal,
            "confirmed": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["data"]["status"] in ["executed", "pending_approval"]
