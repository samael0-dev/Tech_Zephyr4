"""Domain models for CampusOS scheduling intelligence."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Room(BaseModel):
    id: str
    name: str
    building: str
    type: str
    capacity: int
    features: List[str] = Field(default_factory=list)
    accessible: bool = False
    allowed_uses: List[str] = Field(default_factory=list)


class RoomUnavailability(BaseModel):
    room_id: str
    day: str
    periods: List[int]
    reason: Optional[str] = ""


class FacultyPreference(BaseModel):
    type: str = "avoid"
    days: Optional[List[str]] = None
    periods: List[int] = Field(default_factory=list)
    note: Optional[str] = ""


class FacultyUnavailable(BaseModel):
    day: str
    periods: List[int]
    reason: Optional[str] = ""


class Faculty(BaseModel):
    id: str
    name: str
    department: str
    max_hours_per_day: int = 4
    needs_accessible: bool = False
    unavailable: List[FacultyUnavailable] = Field(default_factory=list)
    preferences: List[FacultyPreference] = Field(default_factory=list)


class StudentGroup(BaseModel):
    id: str
    name: str
    year: int
    department: str
    size: int
    needs_accessible: bool = False


class Course(BaseModel):
    id: str
    title: str = ""
    department: str = ""
    lecture_hours: int = 0
    tutorial_hours: int = 0
    lab_blocks: int = 0


class FixedSlot(BaseModel):
    day: str
    start_period: int


class Session(BaseModel):
    id: str
    course_id: str
    kind: str  # lecture | tutorial | lab
    groups: List[str]
    faculty_id: str
    size: int
    duration: int
    room_types: List[str]
    needs_accessible: bool = False
    basket_slot: Optional[str] = None
    fixed_slot: Optional[FixedSlot] = None


class BookingWindow(BaseModel):
    day: str
    from_period: int
    to_period: int


class BookingRequest(BaseModel):
    id: str
    submitted_at: str
    requester: str
    role: str  # admin | department_coordinator | faculty | club
    requested_category: str
    title: str
    attendance: int
    duration_periods: int
    windows: List[BookingWindow]
    room_types: List[str]
    needs: List[str] = Field(default_factory=list)
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = Field(default_factory=list)
    series_id: Optional[str] = None
    raw_text: Optional[str] = ""


class Cancellation(BaseModel):
    request_id: str
    cancelled_at: str
    reason: Optional[str] = ""


class Exam(BaseModel):
    id: str
    course_ids: List[str]
    groups: List[str]
    size: int
    duration_hours: int = 2


class CalendarPeriod(BaseModel):
    id: int
    start: str
    end: str
    teaching: bool = True


class LunchConfig(BaseModel):
    after_period: int = 5
    start: str = "13:00"
    end: str = "14:00"


class ExamSessionSlot(BaseModel):
    id: str  # AM | PM
    start: str
    end: str


class ExamWeekConfig(BaseModel):
    days: List[str] = Field(default_factory=lambda: ["MON", "TUE", "WED", "THU", "FRI", "SAT"])
    sessions: List[ExamSessionSlot] = Field(default_factory=list)


class CalendarConfig(BaseModel):
    days: List[str] = Field(default_factory=lambda: ["MON", "TUE", "WED", "THU", "FRI"])
    periods: List[CalendarPeriod] = Field(default_factory=list)
    lunch: LunchConfig = Field(default_factory=LunchConfig)
    lab_start_periods: List[int] = Field(default_factory=lambda: [2, 6])
    event_only_periods: List[int] = Field(default_factory=lambda: [10, 11, 12, 13])
    fest_week: Optional[str] = None
    exam_week: Optional[ExamWeekConfig] = None


class Dataset(BaseModel):
    dataset_id: str
    institute: Optional[str] = "Chilika Institute of Technology"
    calendar: CalendarConfig
    priority_order: List[str]
    role_category_cap: Dict[str, str]
    rooms: List[Room]
    room_unavailability: List[RoomUnavailability] = Field(default_factory=list)
    faculty: List[Faculty]
    student_groups: List[StudentGroup]
    courses: List[Course]
    sessions: List[Session]
    booking_requests: List[BookingRequest] = Field(default_factory=list)
    cancellations: List[Cancellation] = Field(default_factory=list)
    exams: List[Exam] = Field(default_factory=list)


class SessionAssignment(BaseModel):
    session_id: str
    day: str
    start_period: int
    room_id: str


class BookingDecision(BaseModel):
    request_id: str
    status: str  # approved | rejected | alternative_offered
    day: Optional[str] = None
    start_period: Optional[int] = None
    end_period: Optional[int] = None
    room_id: Optional[str] = None
    reason: Optional[str] = None


class SessionOverride(BaseModel):
    session_id: str
    day: str
    start_period: int
    room_id: str
    displaced_by: str


class FestWeekSchedule(BaseModel):
    bookings: List[BookingDecision] = Field(default_factory=list)
    session_overrides: List[SessionOverride] = Field(default_factory=list)


class ExamAssignment(BaseModel):
    exam_id: str
    day: str
    session: str  # AM | PM
    rooms: List[str]


class FullSchedule(BaseModel):
    team: str = "CampusOS Intelligence"
    dataset_id: str
    sessions: List[SessionAssignment]
    fest_week: Optional[FestWeekSchedule] = None
    exams: Optional[List[ExamAssignment]] = None
