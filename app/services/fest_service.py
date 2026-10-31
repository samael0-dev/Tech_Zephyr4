"""Fest Week & Venue Booking Service for CITRIX.

Integrates FestWeekEngine with canonical Neon database to evaluate Spectra Week booking requests.
Enforces:
- 6-tier priority order: Exams > Classes > Institute Events > Guest Lectures > Dept Events > Club Events.
- No self-approval security.
- Clash detection with academic classes, maintenance closures, and approved bookings.
- Alternative venue/time recommendations for rejected requests.
"""

from datetime import datetime, timezone
import os
import sys
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CITRIX_DIR = os.path.join(BASE_DIR, "CITRIX", "CITRIX")
if CITRIX_DIR not in sys.path:
    sys.path.insert(0, CITRIX_DIR)

from engine.fest.engine import FestWeekEngine, evaluate_fest_week, get_effective_category

from app.core.audit import log_audit_event
from app.core.rbac import check_booking_approval_authority
from app.models.canonical import BookingRequest, Room, TimetableEntry, Schedule
from app.schemas.auth import CurrentUser
from app.services.central_validator import validate_venue_booking_decision, get_default_dataset


def evaluate_campus_fest_bookings(
    db: Session,
    user: CurrentUser,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates all pending and active booking requests using the CP-SAT FestWeekEngine.
    Returns ranked assignments, alternative offerings, and session displacements.
    """
    raw_data = get_default_dataset()

    # Load active timetable sessions
    active_sched = db.query(Schedule).filter(Schedule.is_active.is_(True)).first()
    timetable_sessions = []
    if active_sched:
        entries = db.query(TimetableEntry).filter(TimetableEntry.schedule_id == active_sched.id).all()
        for e in entries:
            timetable_sessions.append({
                "session_id": e.session_id,
                "day": e.day,
                "start_period": e.start_period,
                "room_id": e.room_id,
            })

    engine = FestWeekEngine(raw_data, timetable_sessions)
    eval_result = engine.solve()

    log_audit_event(
        db=db,
        actor=user,
        action="booking:engine:evaluate",
        entity_type="fest_week",
        entity_id="all",
        status="SUCCESS",
        details={
            "approved_count": len(eval_result.get("approved", [])),
            "rejected_count": len(eval_result.get("rejected", [])),
            "score": eval_result.get("score", 0),
        },
        ip_address=client_ip,
    )

    return eval_result


def decide_single_booking(
    db: Session,
    user: CurrentUser,
    booking_id: str,
    decision: str,  # approved | rejected | alternative_offered
    day: Optional[str] = None,
    start_period: Optional[int] = None,
    end_period: Optional[int] = None,
    room_id: Optional[str] = None,
    reason: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Decides a venue booking request while enforcing:
    1. Role authority (Admin globally or Coordinator for own department labs).
    2. NO SELF-APPROVAL: Nobody can approve their own request!
    3. Central validation against room capacity, academic timetable, and maintenance unavailabilities.
    4. Immutable audit logging.
    """
    booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not booking:
        raise ValueError(f"Booking request '{booking_id}' not found.")

    if booking.status == "cancelled":
        raise ValueError("Cannot decide a cancelled booking request.")

    target_room_id = room_id or booking.requested_room
    target_room = db.query(Room).filter(Room.id == target_room_id).first() if target_room_id else None

    # 1. Enforce Approval Authority & No Self-Approval
    check_booking_approval_authority(user, booking, target_room)

    # 2. Central Validation
    if decision in ["approved", "alternative_offered"]:
        # Fetch active timetable sessions to check class clash
        active_sched = db.query(Schedule).filter(Schedule.is_active.is_(True)).first()
        active_entries = []
        if active_sched:
            for te in db.query(TimetableEntry).filter(TimetableEntry.schedule_id == active_sched.id).all():
                active_entries.append({
                    "session_id": te.session_id,
                    "day": te.day,
                    "start_period": te.start_period,
                    "room_id": te.room_id,
                })

        existing_approved = []
        for eb in db.query(BookingRequest).filter(BookingRequest.status.in_(["approved", "alternative_offered"])).all():
            existing_approved.append({
                "id": eb.id,
                "day": eb.assigned_day,
                "room_id": eb.assigned_room_id,
                "start_period": eb.assigned_start_period,
                "end_period": eb.assigned_end_period,
            })

        val_res = validate_venue_booking_decision(
            booking_id=booking.id,
            decision=decision,
            day=day,
            start_period=start_period,
            end_period=end_period,
            room_id=target_room_id,
            timetable_sessions=active_entries,
            existing_bookings=existing_approved,
        )

        if not val_res.valid:
            raise ValueError(f"Booking decision constraint violation: {'; '.join(val_res.errors)}")

    # 3. Apply Decision
    booking.status = decision
    booking.decision_reason = reason or ("Approved according to priority policy" if decision == "approved" else "Rejected")
    booking.decided_by_user_id = user.id
    booking.decided_at = datetime.now(timezone.utc)

    if decision in ["approved", "alternative_offered"]:
        booking.assigned_day = day
        booking.assigned_start_period = start_period
        booking.assigned_end_period = end_period
        booking.assigned_room_id = target_room_id

    db.commit()

    log_audit_event(
        db=db,
        actor=user,
        action=f"booking:{decision}",
        entity_type="booking",
        entity_id=booking.id,
        status="SUCCESS",
        details={
            "decision": decision,
            "room_id": target_room_id,
            "day": day,
            "periods": f"{start_period}-{end_period}",
            "reason": reason,
        },
        ip_address=client_ip,
    )

    return {
        "booking_id": booking.id,
        "status": booking.status,
        "day": booking.assigned_day,
        "room_id": booking.assigned_room_id,
        "start_period": booking.assigned_start_period,
        "end_period": booking.assigned_end_period,
        "decided_by": user.id,
        "reason": booking.decision_reason,
        "message": f"Booking request '{booking.id}' marked as {decision}.",
    }
