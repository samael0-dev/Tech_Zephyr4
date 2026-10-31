import re
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import get_current_user, require_permission
from app.models.room import Room
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import AssistantChatRequest, AssistantChatResponse
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=ApiResponse[AssistantChatResponse])
def chat_with_assistant(
    chat_req: AssistantChatRequest,
    current_user: CurrentUser = Depends(require_permission(Permission.ASSISTANT_CHAT)),
    db: Session = Depends(get_db),
):
    """
    AI Assistant endpoint for faculty and staff.
    Parses plain English or Hinglish venue requests into structured proposals.
    Notice: All suggestions are proposals and MUST undergo server validation and approval.
    """
    prompt = chat_req.prompt.lower()

    # Rule-based intelligent fallback / parser for English and Hinglish
    detected_room = None
    if "sh-1" in prompt or "seminar hall 1" in prompt or "seminar hall" in prompt:
        detected_room = "SH-1"
    elif "auditorium" in prompt or "aud" in prompt:
        detected_room = "AUD"
    elif "cs-lab" in prompt or "computer lab" in prompt:
        detected_room = "CS-LAB-1"

    # Detect capacity / attendance
    attendance_match = re.search(r"(\d+)\s*(students|people|participants|pax)?", prompt)
    attendance = int(attendance_match.group(1)) if attendance_match else 50

    # Detect day
    day = "WED"
    for d, code in [("monday", "MON"), ("tuesday", "TUE"), ("wednesday", "WED"), ("thursday", "THU"), ("friday", "FRI")]:
        if d in prompt or code.lower() in prompt:
            day = code
            break

    # Structured request proposal
    structured_proposal = {
        "title": "Proposed Event / Booking",
        "attendance": attendance,
        "duration_periods": 2,
        "requested_category": "guest_lecture" if current_user.role == "faculty" else "club_event",
        "windows": [{"day": day, "from_period": 10, "to_period": 11}],
        "room_types": ["seminar_hall"] if detected_room == "SH-1" else ["auditorium"],
        "requested_room": detected_room,
        "needs": ["pa_system"] if "audio" in prompt or "sound" in prompt else [],
    }

    # Deterministic validation check
    conflicts = []
    if detected_room:
        room_obj = db.query(Room).filter(Room.id == detected_room).first()
        if room_obj and room_obj.capacity < attendance:
            conflicts.append(f"Room {detected_room} capacity ({room_obj.capacity}) is below requested attendance ({attendance})")

    is_valid = len(conflicts) == 0

    reply_msg = (
        f"I have parsed your request for {day}. "
        f"Proposed venue is {detected_room or 'a suitable seminar hall'} for {attendance} people. "
        "Please review the structured form before official submission."
    )
    if not is_valid:
        reply_msg += f" Warning: {'; '.join(conflicts)}"

    return ApiResponse(
        success=True,
        data=AssistantChatResponse(
            reply=reply_msg,
            structured_request=structured_proposal,
            validation_preview={"is_valid": is_valid, "conflicts": conflicts},
        ),
        message="Assistant response generated successfully",
    )
