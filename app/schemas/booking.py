from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BookingTimeWindow(BaseModel):
    day: str
    from_period: int
    to_period: int


class BookingCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=256)
    attendance: int = Field(..., gt=0)
    duration_periods: int = Field(..., gt=0, le=13)
    requested_category: str  # institute_event, department_event, guest_lecture, club_event
    windows: List[BookingTimeWindow]
    room_types: List[str]
    needs: List[str] = []
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = []
    series_id: Optional[str] = None
    raw_text: Optional[str] = None
    department: Optional[str] = None


class BookingDecisionRequest(BaseModel):
    decision: str  # approved, rejected, alternative_offered
    day: Optional[str] = None
    start_period: Optional[int] = None
    end_period: Optional[int] = None
    room_id: Optional[str] = None
    reason: str = Field(..., min_length=3, max_length=512)


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submitted_at: datetime
    requester: str
    requester_user_id: Optional[str] = None
    role: str
    department: Optional[str] = None
    requested_category: str
    effective_category: str
    title: str
    attendance: int
    duration_periods: int
    windows: List[Dict[str, Any]] = []
    room_types: List[str] = []
    needs: List[str] = []
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = []
    status: str
    assigned_day: Optional[str] = None
    assigned_start_period: Optional[int] = None
    assigned_end_period: Optional[int] = None
    assigned_room_id: Optional[str] = None
    decision_reason: Optional[str] = None
    decided_by_user_id: Optional[str] = None
    decided_at: Optional[datetime] = None
