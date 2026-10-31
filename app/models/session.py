from sqlalchemy import JSON, Boolean, Column, Integer, String

from app.core.database import Base
from app.models.base import TimestampMixin


class SessionEntity(Base, TimestampMixin):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, index=True)  # MA101-AB-L1
    course_id = Column(String(32), nullable=False, index=True)
    kind = Column(String(32), nullable=False, index=True)  # lecture, tutorial, lab
    groups = Column(JSON, nullable=False)  # ["Y1-A", "Y1-B"]
    faculty_id = Column(String(32), nullable=False, index=True)  # F19
    size = Column(Integer, nullable=False)
    duration = Column(Integer, default=1, nullable=False)
    room_types = Column(JSON, nullable=False)  # ["classroom", "lecture_hall"]
    needs_accessible = Column(Boolean, default=False, nullable=False)
    basket_slot = Column(String(32), nullable=True, index=True)  # e.g. OEB-1
    fixed_slot = Column(JSON, nullable=True)  # {"day": "THU", "start_period": 6}
