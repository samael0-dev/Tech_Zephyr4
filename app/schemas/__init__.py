from app.schemas.auth import CurrentUser, LoginRequest, TokenResponse, UserResponse
from app.schemas.booking import (
    BookingCreateRequest,
    BookingDecisionRequest,
    BookingResponse,
    BookingTimeWindow,
)
from app.schemas.dashboard import (
    AssistantChatRequest,
    AssistantChatResponse,
    DeanDashboardMetrics,
    DeanDashboardResponse,
    DisruptionRequest,
    DisruptionResponse,
    ExamResponse,
)
from app.schemas.response import ApiErrorResponse, ApiResponse, ErrorDetail
from app.schemas.room import RoomAvailabilityResponse, RoomPeriodSlot, RoomResponse
from app.schemas.timetable import (
    ScheduleGenerateRequest,
    ScheduleResponse,
    SessionResponse,
    TimetableQuery,
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
