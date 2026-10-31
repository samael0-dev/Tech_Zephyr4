from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class SessionResponse(BaseModel):
    id: str
    course_id: str
    kind: str
    groups: List[str]
    faculty_id: str
    size: int
    duration: int
    room_types: List[str]
    needs_accessible: bool
    basket_slot: Optional[str] = None
    fixed_slot: Optional[Dict[str, Any]] = None

    # Scheduled placement
    day: Optional[str] = None
    start_period: Optional[int] = None
    room_id: Optional[str] = None

    class Config:
        from_attributes = True


class TimetableQuery(BaseModel):
    group_id: Optional[str] = None
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None
    day: Optional[str] = None


class ScheduleGenerateRequest(BaseModel):
    dataset_id: str = "cit-public-v1"
    solver_timeout_seconds: int = 30


class ScheduleResponse(BaseModel):
    id: str
    dataset_id: str
    version_name: str
    status: str
    is_active: bool
    hard_violations_count: int
    soft_penalty_score: float
    solver_status: str
    solver_metrics: Dict[str, Any] = {}
    sessions_count: int = 0

    class Config:
        from_attributes = True
