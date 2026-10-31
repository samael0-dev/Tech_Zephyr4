from sqlalchemy import JSON, Boolean, Column, Float, Integer, String

from app.core.database import Base
from app.models.base import TimestampMixin


class ScheduleVersion(Base, TimestampMixin):
    __tablename__ = "schedule_versions"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), default="cit-public-v1", nullable=False)
    version_name = Column(String(128), nullable=False)
    status = Column(String(32), default="active", nullable=False)  # active, archived, draft, infeasible
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    hard_violations_count = Column(Integer, default=0)
    soft_penalty_score = Column(Float, default=0.0)
    solver_status = Column(String(32), default="OPTIMAL")
    solver_metrics = Column(JSON, default=dict)
    created_by_user_id = Column(String(64), nullable=True)


class ScheduledSession(Base, TimestampMixin):
    __tablename__ = "scheduled_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    day = Column(String(8), nullable=False, index=True)  # MON..FRI
    start_period = Column(Integer, nullable=False, index=True)  # 1..9
    room_id = Column(String(32), nullable=False, index=True)
    is_override = Column(Boolean, default=False, nullable=False)  # e.g. fest week override
    displaced_by = Column(String(64), nullable=True)  # e.g. BR-01
