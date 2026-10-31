from app.schemas.response import ApiResponse, ApiErrorResponse, ErrorDetail
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, CurrentUser
from app.schemas.room import RoomResponse, RoomAvailabilityResponse, RoomPeriodSlot
from app.schemas.booking import (
    BookingCreateRequest,
    BookingDecisionRequest,
    BookingResponse,
    BookingTimeWindow,
)
from app.schemas.timetable import (
    SessionResponse,
    TimetableQuery,
    ScheduleGenerateRequest,
    ScheduleResponse,
)
from app.schemas.dashboard import (
    ExamResponse,
    DisruptionRequest,
    DisruptionResponse,
    DeanDashboardMetrics,
    DeanDashboardResponse,
    AssistantChatRequest,
    AssistantChatResponse,
)

__all__ = [
    "ApiResponse",
    "ApiErrorResponse",
    "ErrorDetail",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "CurrentUser",
    "RoomResponse",
    "RoomAvailabilityResponse",
    "RoomPeriodSlot",
    "BookingCreateRequest",
    "BookingDecisionRequest",
    "BookingResponse",
    "BookingTimeWindow",
    "SessionResponse",
    "TimetableQuery",
    "ScheduleGenerateRequest",
    "ScheduleResponse",
    "ExamResponse",
    "DisruptionRequest",
    "DisruptionResponse",
    "DeanDashboardMetrics",
    "DeanDashboardResponse",
    "AssistantChatRequest",
    "AssistantChatResponse",
]
