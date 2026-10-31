from sqlalchemy import JSON, Column, Integer, String, Text

from app.core.database import Base
from app.models.base import TimestampMixin


class Disruption(Base, TimestampMixin):
    __tablename__ = "disruptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submitted_by_user_id = Column(String(64), nullable=True)
    disruption_type = Column(String(64), nullable=False)  # faculty_unavailable, room_unavailable, add_session, etc.
    payload = Column(JSON, nullable=False)
    status = Column(String(32), default="pending", nullable=False)  # pending, approved, rejected, applied
    impact_summary = Column(JSON, default=dict)
    proposed_schedule_id = Column(String(64), nullable=True)
    approved_by_user_id = Column(String(64), nullable=True)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(64), nullable=False, index=True)
    actor_role = Column(String(32), nullable=False, index=True)
    action = Column(String(64), nullable=False, index=True)  # auth:login, booking:approve, schedule:generate, etc.
    entity_type = Column(String(64), nullable=True, index=True)  # booking, schedule, session, user, disruption
    entity_id = Column(String(64), nullable=True, index=True)
    status = Column(String(32), default="SUCCESS", nullable=False)  # SUCCESS, FORBIDDEN, FAILED
    details = Column(JSON, default=dict)
    ip_address = Column(String(64), nullable=True)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), default="info")  # info, warning, approval_needed, decision
    is_read = Column(String(8), default="false")
