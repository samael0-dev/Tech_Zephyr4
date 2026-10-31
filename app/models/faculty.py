from sqlalchemy import Boolean, Column, Integer, JSON, String
from app.core.database import Base
from app.models.base import TimestampMixin


class Faculty(Base, TimestampMixin):
    __tablename__ = "faculty"

    id = Column(String(32), primary_key=True, index=True)  # F01, F02...
    name = Column(String(128), nullable=False)
    department = Column(String(32), nullable=False, index=True)  # CSE, ECE...
    max_hours_per_day = Column(Integer, default=4, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    unavailable = Column(JSON, default=list)  # [{"day": "WED", "periods": [6,7,8,9], "reason": "..."}]
    preferences = Column(JSON, default=list)  # [{"type": "avoid", "days": [...], "periods": [...]}]


class StudentGroup(Base, TimestampMixin):
    __tablename__ = "student_groups"

    id = Column(String(32), primary_key=True, index=True)  # Y1-A, Y2-CSE...
    name = Column(String(128), nullable=False)
    year = Column(Integer, nullable=False, index=True)  # 1, 2, 3
    department = Column(String(32), nullable=False, index=True)  # COMMON, CSE, ECE...
    size = Column(Integer, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)


class Course(Base, TimestampMixin):
    __tablename__ = "courses"

    id = Column(String(32), primary_key=True, index=True)  # MA101, CS201...
    name = Column(String(128), nullable=True)
    department = Column(String(32), nullable=True, index=True)
    lecture_hours = Column(Integer, default=0)
    tutorial_hours = Column(Integer, default=0)
    lab_blocks = Column(Integer, default=0)
