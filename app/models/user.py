from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String
from app.core.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    name = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False, index=True)  # admin, department_coordinator, faculty, club, student
    
    # Scoping and Data Isolation fields
    department = Column(String(32), nullable=True, index=True)  # e.g. CSE, ECE, ME
    faculty_id = Column(String(32), nullable=True, index=True)  # e.g. F01
    student_group_id = Column(String(32), nullable=True, index=True)  # e.g. Y1-A, Y2-CSE
    club_name = Column(String(64), nullable=True, index=True)  # e.g. Coding Club
    
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "department": self.department,
            "faculty_id": self.faculty_id,
            "student_group_id": self.student_group_id,
            "club_name": self.club_name,
            "is_active": self.is_active,
        }
