from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text
from app.core.database import Base
from app.models.base import TimestampMixin


class BookingRequest(Base, TimestampMixin):
    __tablename__ = "booking_requests"

    id = Column(String(32), primary_key=True, index=True)  # BR-01, etc.
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    requester = Column(String(128), nullable=False)
    requester_user_id = Column(String(64), nullable=True, index=True)  # ID of user who submitted
    role = Column(String(32), nullable=False, index=True)  # admin, department_coordinator, faculty, club
    department = Column(String(32), nullable=True, index=True)
    requested_category = Column(String(32), nullable=False)  # institute_event, department_event, etc.
    effective_category = Column(String(32), nullable=False, index=True)  # capped by role
    title = Column(String(256), nullable=False)
    attendance = Column(Integer, nullable=False)
    duration_periods = Column(Integer, nullable=False)
    windows = Column(JSON, nullable=False)  # [{"day": "THU", "from_period": 10, "to_period": 12}]
    room_types = Column(JSON, nullable=False)
    needs = Column(JSON, default=list)
    requested_room = Column(String(32), nullable=True)
    mandatory_for_groups = Column(JSON, default=list)
    series_id = Column(String(32), nullable=True)
    raw_text = Column(Text, nullable=True)
    
    # Decision state
    status = Column(String(32), default="pending", nullable=False, index=True)  # pending, approved, rejected, alternative_offered, cancelled
    assigned_day = Column(String(8), nullable=True)
    assigned_start_period = Column(Integer, nullable=True)
    assigned_end_period = Column(Integer, nullable=True)
    assigned_room_id = Column(String(32), nullable=True)
    decision_reason = Column(String(512), nullable=True)
    decided_by_user_id = Column(String(64), nullable=True)
    decided_at = Column(DateTime, nullable=True)
