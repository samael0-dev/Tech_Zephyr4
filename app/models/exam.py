from sqlalchemy import Column, Integer, JSON, String
from app.core.database import Base
from app.models.base import TimestampMixin


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id = Column(String(32), primary_key=True, index=True)  # EX-MA101
    course_ids = Column(JSON, nullable=False)  # ["MA101"]
    groups = Column(JSON, nullable=False)  # ["Y1-A", "Y1-B"]
    size = Column(Integer, nullable=False)
    duration_hours = Column(Integer, default=2)
    day = Column(String(8), nullable=True, index=True)  # MON..SAT
    session = Column(String(8), nullable=True)  # AM or PM
    rooms = Column(JSON, default=list)  # ["AUD", "LH-1"]
