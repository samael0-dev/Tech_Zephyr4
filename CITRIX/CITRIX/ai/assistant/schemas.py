"""Schemas and data models for CampusOS AI Assistant."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserContext(BaseModel):
    user_id: str
    role: str  # admin | faculty | department_coordinator | club | student
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    group_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str


class ParsedBookingIntent(BaseModel):
    attendance: Optional[int] = None
    duration_periods: Optional[int] = None
    day: Optional[str] = None
    from_period: Optional[int] = None
    to_period: Optional[int] = None
    room_types: List[str] = Field(default_factory=list)
    requested_room: Optional[str] = None
    needs: List[str] = Field(default_factory=list)
    title: Optional[str] = None
    mandatory_for_groups: List[str] = Field(default_factory=list)
    missing_fields: List[str] = Field(default_factory=list)
    follow_up_question: Optional[str] = None
    is_complete: bool = False


class ParsedDisruptionIntent(BaseModel):
    faculty_id: Optional[str] = None
    days: List[str] = Field(default_factory=list)
    periods: List[int] = Field(default_factory=list)
    reason: Optional[str] = None
    room_id: Optional[str] = None
    disruption_type: str = "faculty_unavailable"
    missing_fields: List[str] = Field(default_factory=list)
    follow_up_question: Optional[str] = None
    is_complete: bool = False


class ToolCallRecord(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Any


class AssistantResponse(BaseModel):
    response_text: str
    intent: str  # booking_request | faculty_adjustment | schedule_inquiry | rag_faq | general
    parsed_data: Optional[Dict[str, Any]] = None
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    requires_confirmation: bool = False
    confirmation_payload: Optional[Dict[str, Any]] = None
