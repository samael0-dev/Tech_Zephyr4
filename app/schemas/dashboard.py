from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_ids: List[str]
    groups: List[str]
    size: int
    duration_hours: int
    day: Optional[str] = None
    session: Optional[str] = None  # AM or PM
    rooms: List[str] = []


class DisruptionRequest(BaseModel):
    disruption_type: str  # faculty_unavailable, room_unavailable, add_session, remove_session, etc.
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None
    days: Optional[List[str]] = None
    periods: Optional[List[int]] = None
    reason: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None


class DisruptionResponse(BaseModel):
    request_id: int
    disruption_type: str
    status: str
    impact_summary: Dict[str, Any] = {}
    message: str


class DeanDashboardMetrics(BaseModel):
    total_rooms: int
    occupied_rooms: int
    available_rooms: int
    today_scheduled_sessions: int
    current_conflicts: int
    pending_approvals: int
    upcoming_events: int
    faculty_availability_rate: float
    department_utilization: Dict[str, float]
    room_period_utilization: Dict[str, float]


class DeanDashboardResponse(BaseModel):
    metrics: DeanDashboardMetrics
    pending_requests: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []


class AssistantChatRequest(BaseModel):
    prompt: str
    conversation_history: List[Dict[str, Any]] = []


class AssistantChatResponse(BaseModel):
    reply: str
    structured_request: Optional[Dict[str, Any]] = None
    validation_preview: Optional[Dict[str, Any]] = None
