"""Canonical SQLAlchemy declarative models for CITRIX PostgreSQL database."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import relationship, synonym

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False
    )


# ==============================================================================
# MODULE A: Identity and Access Management (IAM)
# ==============================================================================


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(32), primary_key=True)  # admin, faculty, hod, dean, coordinator, club, student
    name = Column(String(64), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    category_cap = Column(String(32), nullable=True)  # institute_event, guest_lecture, department_event, club_event
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    users = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    code = Column(String(16), primary_key=True)  # CSE, ECE, EE, ME, CE, HSS, MA, PH, ADMIN, COMMON
    name = Column(String(128), nullable=False)
    building_id = Column(String(64), ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    building = relationship("Building", back_populates="departments")
    faculty_profiles = relationship("FacultyProfile", back_populates="department_rel")
    student_groups = relationship("StudentGroup", back_populates="department_rel")
    courses = relationship("Course", back_populates="department_rel")


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)  # user ID (usr-admin-01) or faculty ID (F01)
    username = Column(String(64), unique=True, nullable=True, index=True)
    email = Column(String(128), unique=True, nullable=True, index=True)
    full_name = Column(String(128), nullable=False)
    hashed_password = Column(String(256), nullable=True)
    role = Column(String(32), nullable=True, index=True)  # admin, department_coordinator, faculty, club, student
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="SET NULL"), nullable=True, index=True)
    faculty_id = Column(String(32), nullable=True, index=True)
    student_group_id = Column(String(32), nullable=True, index=True)
    club_name = Column(String(64), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Synonyms for seamless application compatibility
    name = synonym("full_name")
    department = synonym("department_code")

    department_rel = relationship("Department")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "name": self.full_name,
            "role": self.role,
            "department": self.department_code,
            "faculty_id": self.faculty_id,
            "student_group_id": self.student_group_id,
            "club_name": self.club_name,
            "is_active": self.is_active,
        }


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(String(32), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(String(32), primary_key=True, index=True)  # F01, F02, etc. Preserves original ID
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(128), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    max_hours_per_day = Column(Integer, default=4, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSONB, default=list, nullable=False)  # S1 avoid preferences list
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    department = synonym("department_code")

    user = relationship("User", back_populates="faculty_profile")
    department_rel = relationship("Department", back_populates="faculty_profiles")
    unavailabilities = relationship("FacultyUnavailability", back_populates="faculty", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="faculty")

    @property
    def unavailable(self):
        """Returns structured unavailability list matching application convention."""
        res = []
        for u in self.unavailabilities:
            res.append({"day": u.day, "periods": [u.period], "reason": u.reason})
        return res

    @unavailable.setter
    def unavailable(self, items):
        if not items:
            return
        for item in items:
            day = item.get("day")
            reason = item.get("reason")
            for p in item.get("periods", []):
                self.unavailabilities.append(
                    FacultyUnavailability(day=day, period=p, reason=reason)
                )


class FacultyUnavailability(Base):
    __tablename__ = "faculty_unavailabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    faculty_id = Column(String(32), ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    day = Column(String(4), nullable=False)  # MON, TUE, WED, THU, FRI
    period = Column(Integer, nullable=False)  # 1-9
    reason = Column(Text, nullable=True)
    is_permanent = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("faculty_id", "day", "period", name="uq_faculty_unavailability_slot"),
        Index("idx_fac_unavail_day_period", "faculty_id", "day", "period"),
    )

    faculty = relationship("FacultyProfile", back_populates="unavailabilities")


class StudentGroup(Base):
    __tablename__ = "student_groups"

    id = Column(String(32), primary_key=True, index=True)  # Y1-A, CSE-2, etc. Preserves original ID
    name = Column(String(128), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    size = Column(Integer, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    department = synonym("department_code")

    department_rel = relationship("Department", back_populates="student_groups")
    sessions = relationship("SessionGroup", back_populates="group", cascade="all, delete-orphan")


# ==============================================================================
# MODULE B: Academic Structure
# ==============================================================================


class AcademicTerm(Base):
    __tablename__ = "academic_terms"

    id = Column(String(32), primary_key=True)  # e.g. cit-public-v1
    name = Column(String(64), nullable=False)
    is_current = Column(Boolean, default=True, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    fest_week_number = Column(Integer, default=7, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class AcademicPeriod(Base):
    __tablename__ = "academic_periods"

    period_number = Column(Integer, primary_key=True, autoincrement=False)  # 1 through 13
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_teaching = Column(Boolean, default=True, nullable=False)
    is_event_only = Column(Boolean, default=False, nullable=False)
    label = Column(String(32), nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(32), primary_key=True, index=True)  # MA101, CS201, etc.
    title = Column(String(128), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    year = Column(Integer, nullable=True, index=True)
    lecture_hours = Column(Integer, default=0, nullable=False)
    tutorial_hours = Column(Integer, default=0, nullable=False)
    lab_blocks = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    name = synonym("title")
    department = synonym("department_code")

    department_rel = relationship("Department", back_populates="courses")
    sessions = relationship("Session", back_populates="course")


# ==============================================================================
# MODULE C: Campus Infrastructure
# ==============================================================================


class Building(Base):
    __tablename__ = "buildings"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False, unique=True, index=True)
    code = Column(String(32), nullable=True)
    has_lift = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    rooms = relationship("Room", back_populates="building_rel", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="building")
    utilisation_snapshots = relationship("UtilisationSnapshot", back_populates="building")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(32), primary_key=True, index=True)  # LH-1, AUD, CR-101, etc.
    name = Column(String(128), nullable=False)
    building_id = Column(String(64), ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False, index=True)
    type = Column(String(32), nullable=False, index=True)  # classroom, lecture_hall, auditorium, etc.
    capacity = Column(Integer, nullable=False)
    exam_capacity = Column(Integer, nullable=True)  # capacity // 2
    accessible = Column(Boolean, default=False, nullable=False)
    features = Column(JSONB, default=list, nullable=False)
    allowed_uses = Column(JSONB, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    def __init__(self, **kwargs):
        if "exam_capacity" not in kwargs and "capacity" in kwargs:
            kwargs["exam_capacity"] = kwargs["capacity"] // 2
        super().__init__(**kwargs)

    building = synonym("building_id")

    building_rel = relationship("Building", back_populates="rooms")
    unavailabilities = relationship("RoomUnavailability", back_populates="room", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="room")
    exam_allocations = relationship("ExamRoomAllocation", back_populates="room")


class RoomUnavailability(Base):
    __tablename__ = "room_unavailabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    day = Column(String(4), nullable=False)  # MON, TUE, WED, THU, FRI
    period = Column(Integer, nullable=False)  # 1-13
    reason = Column(Text, nullable=True)
    is_permanent = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("room_id", "day", "period", name="uq_room_unavailability_slot"),
        Index("idx_room_unavail_day_period", "room_id", "day", "period"),
    )

    room = relationship("Room", back_populates="unavailabilities")

    @property
    def periods(self):
        return [self.period] if self.period is not None else []

    @periods.setter
    def periods(self, val):
        if isinstance(val, (list, tuple)) and len(val) > 0:
            self.period = val[0]
        elif isinstance(val, int):
            self.period = val


# ==============================================================================
# MODULE D: Timetable and Scheduling
# ==============================================================================


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, index=True)  # MA101-AB-L1, etc.
    course_id = Column(String(32), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False, index=True)
    kind = Column(String(16), nullable=False, index=True)  # lecture, tutorial, lab
    faculty_id = Column(String(32), ForeignKey("faculty_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    size = Column(Integer, nullable=False)
    duration = Column(Integer, default=1, nullable=False)
    room_types = Column(JSONB, default=list, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    basket_slot = Column(String(32), nullable=True, index=True)  # OEB-1, OEB-2, OEB-3
    fixed_slot_day = Column(String(4), nullable=True)
    fixed_slot_period = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    course = relationship("Course", back_populates="sessions")
    faculty = relationship("FacultyProfile", back_populates="sessions")
    session_groups = relationship("SessionGroup", back_populates="session", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="session", cascade="all, delete-orphan")

    @property
    def groups(self):
        return [sg.group_id for sg in self.session_groups]

    @groups.setter
    def groups(self, group_list):
        if not group_list:
            return
        for g_id in group_list:
            self.session_groups.append(SessionGroup(group_id=g_id))

    @property
    def fixed_slot(self):
        if self.fixed_slot_day and self.fixed_slot_period:
            return {"day": self.fixed_slot_day, "start_period": self.fixed_slot_period}
        return None

    @fixed_slot.setter
    def fixed_slot(self, slot_dict):
        if slot_dict:
            self.fixed_slot_day = slot_dict.get("day")
            self.fixed_slot_period = slot_dict.get("start_period") or slot_dict.get("period")


class SessionGroup(Base):
    __tablename__ = "session_groups"

    session_id = Column(String(64), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(String(32), ForeignKey("student_groups.id", ondelete="CASCADE"), primary_key=True)

    session = relationship("Session", back_populates="session_groups")
    group = relationship("StudentGroup", back_populates="sessions")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    dataset_id = Column(String(64), nullable=False, default="cit-public-v1")
    term_id = Column(String(32), ForeignKey("academic_terms.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    is_baseline = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="validated", nullable=False)  # draft, validated, active, superseded
    hard_violations_count = Column(Integer, default=0, nullable=False)
    soft_penalty_total = Column(Integer, default=0, nullable=False)
    solver_runtime_seconds = Column(Float, nullable=True)
    raw_schedule_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_by = Column(String(64), nullable=True)

    version_name = synonym("name")
    soft_penalty_score = synonym("soft_penalty_total")
    created_by_user_id = synonym("created_by")

    @property
    def solver_status(self):
        return "OPTIMAL" if self.status in ("active", "validated") else (self.status.upper() if self.status else "UNKNOWN")

    @property
    def solver_metrics(self):
        return {
            "hard_violations": self.hard_violations_count,
            "soft_penalty": self.soft_penalty_total,
            "runtime_seconds": self.solver_runtime_seconds or 0.0,
        }
    versions = relationship("ScheduleVersionRecord", back_populates="schedule", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="schedule", cascade="all, delete-orphan")
    conflicts = relationship("SchedulingConflict", back_populates="schedule", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        if "version_name" in kwargs and "name" not in kwargs:
            kwargs["name"] = kwargs.pop("version_name")
        elif "version_name" in kwargs:
            kwargs.pop("version_name")
        if "soft_penalty_score" in kwargs and "soft_penalty_total" not in kwargs:
            kwargs["soft_penalty_total"] = int(kwargs.pop("soft_penalty_score"))
        elif "soft_penalty_score" in kwargs:
            kwargs.pop("soft_penalty_score")
        if "created_by_user_id" in kwargs and "created_by" not in kwargs:
            kwargs["created_by"] = kwargs.pop("created_by_user_id")
        elif "created_by_user_id" in kwargs:
            kwargs.pop("created_by_user_id")
        kwargs.pop("solver_status", None)
        kwargs.pop("solver_metrics", None)
        super().__init__(**kwargs)


class ScheduleVersionRecord(Base):
    __tablename__ = "schedule_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    change_summary = Column(Text, nullable=True)
    disruption_payload = Column(JSONB, nullable=True)
    validation_report = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("schedule_id", "version_number", name="uq_schedule_version"),
    )

    schedule = relationship("Schedule", back_populates="versions")


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    day = Column(String(4), nullable=False, index=True)  # MON, TUE, WED, THU, FRI
    start_period = Column(Integer, nullable=False, index=True)  # 1-9
    end_period = Column(Integer, nullable=False, default=1)
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True)
    is_overridden_for_fest = Column(Boolean, default=False, nullable=False)
    override_displaced_by = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    is_override = synonym("is_overridden_for_fest")
    displaced_by = synonym("override_displaced_by")

    __table_args__ = (
        UniqueConstraint("schedule_id", "session_id", name="uq_schedule_session"),
        Index("idx_timetable_room_day_start", "schedule_id", "room_id", "day", "start_period"),
        Index("idx_timetable_day_period", "schedule_id", "day", "start_period", "end_period"),
    )

    schedule = relationship("Schedule", back_populates="timetable_entries")
    session = relationship("Session", back_populates="timetable_entries")
    room = relationship("Room", back_populates="timetable_entries")

    def __init__(self, **kwargs):
        if "is_override" in kwargs and "is_overridden_for_fest" not in kwargs:
            kwargs["is_overridden_for_fest"] = kwargs.pop("is_override")
        if "displaced_by" in kwargs and "override_displaced_by" not in kwargs:
            kwargs["override_displaced_by"] = kwargs.pop("displaced_by")
        if "end_period" not in kwargs and "start_period" in kwargs:
            kwargs["end_period"] = kwargs["start_period"]
        super().__init__(**kwargs)


# ==============================================================================
# MODULE E: Bookings and Campus Events
# ==============================================================================


class EventCategory(Base):
    __tablename__ = "event_categories"

    code = Column(String(32), primary_key=True)
    name = Column(String(64), nullable=False)
    weight = Column(Integer, nullable=False)  # 5, 4, 3, 2
    priority_rank = Column(Integer, nullable=False)


class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id = Column(String(32), primary_key=True, index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False, index=True)
    requester = Column(String(128), nullable=False)
    requester_user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    role = Column(String(32), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="SET NULL"), nullable=True)
    requested_category = Column(String(32), ForeignKey("event_categories.code", ondelete="RESTRICT"), nullable=False)
    effective_category = Column(String(32), ForeignKey("event_categories.code", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    attendance = Column(Integer, nullable=False)
    duration_periods = Column(Integer, nullable=False)
    windows = Column(JSONB, default=list, nullable=False)
    room_types = Column(JSONB, default=list, nullable=False)
    needs = Column(JSONB, default=list, nullable=False)
    requested_room = Column(String(32), nullable=True)
    mandatory_for_groups = Column(JSONB, default=list, nullable=False)
    series_id = Column(String(32), nullable=True)
    raw_text = Column(Text, nullable=True)

    status = Column(String(32), default="pending", nullable=False, index=True)
    assigned_room_id = Column(String(32), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_day = Column(String(4), nullable=True, index=True)
    assigned_start_period = Column(Integer, nullable=True)
    assigned_end_period = Column(Integer, nullable=True)
    decision_reason = Column(Text, nullable=True)
    decided_by_user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    department = synonym("department_code")

    role_rel = relationship("Role")
    assigned_room = relationship("Room", foreign_keys=[assigned_room_id])
    cancellation = relationship("BookingCancellation", back_populates="request", uselist=False, cascade="all, delete-orphan")


class BookingCancellation(Base):
    __tablename__ = "booking_cancellations"

    request_id = Column(String(32), ForeignKey("booking_requests.id", ondelete="CASCADE"), primary_key=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=False)
    cancelled_by = Column(String(128), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    request = relationship("BookingRequest", back_populates="cancellation")


# ==============================================================================
# MODULE F: Examinations
# ==============================================================================


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String(16), primary_key=True)  # AM, PM
    name = Column(String(32), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(32), primary_key=True, index=True)
    term_id = Column(String(32), ForeignKey("academic_terms.id", ondelete="SET NULL"), nullable=True)
    size = Column(Integer, nullable=False)
    duration_hours = Column(Integer, default=2, nullable=False)
    course_ids = Column(JSONB, default=list, nullable=False)
    groups = Column(JSONB, default=list, nullable=False)

    scheduled_day = Column(String(4), nullable=True, index=True)
    scheduled_session = Column(String(16), ForeignKey("exam_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    day = synonym("scheduled_day")
    session = synonym("scheduled_session")

    allocations = relationship("ExamRoomAllocation", back_populates="exam", cascade="all, delete-orphan")

    @property
    def rooms(self):
        return [alloc.room_id for alloc in self.allocations]


class ExamRoomAllocation(Base):
    __tablename__ = "exam_room_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(String(32), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_seats = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("exam_id", "room_id", name="uq_exam_room_allocation"),
    )

    exam = relationship("Exam", back_populates="allocations")
    room = relationship("Room", back_populates="exam_allocations")


# ==============================================================================
# MODULE G: Operational Monitoring and Analytics
# ==============================================================================


class Disruption(Base):
    __tablename__ = "disruptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submitted_by_user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    disruption_type = Column(String(64), nullable=False)
    payload = Column(JSONB, nullable=False)
    status = Column(String(32), default="pending", nullable=False, index=True)
    impact_summary = Column(JSONB, default=dict)
    proposed_schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)
    approved_by_user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    actor_role = Column(String(32), nullable=True)
    action = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(64), nullable=True, index=True)
    entity_id = Column(String(64), nullable=True)
    status = Column(String(32), default="SUCCESS", nullable=False)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    actor_id = synonym("user_id")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    role_target = Column(String(32), nullable=True)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), default="info")
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


class SchedulingConflict(Base):
    __tablename__ = "scheduling_conflicts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_code = Column(String(16), nullable=False, index=True)
    where_context = Column(String(64), nullable=False)
    detail = Column(Text, nullable=False)
    resolved = Column(Boolean, default=False, nullable=False)
    detected_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    schedule = relationship("Schedule", back_populates="conflicts")


class UtilisationSnapshot(Base):
    __tablename__ = "utilisation_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    building_id = Column(String(64), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True, index=True)
    total_slots = Column(Integer, nullable=False)
    occupied_slots = Column(Integer, nullable=False)
    utilisation_pct = Column(Float, nullable=False)
    metrics = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    building = relationship("Building", back_populates="utilisation_snapshots")
    room = relationship("Room")


# ==============================================================================
# MODULE H: Knowledge & RAG Documents
# ==============================================================================


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    source_file = Column(String(256), nullable=True, default="builtin")
    document_type = Column(String(64), nullable=True, default="policy")
    summary = Column(Text, nullable=True)
    department = Column(String(32), nullable=True)
    file_type = Column(String(32), nullable=True, default="text/plain")
    uploaded_by_user_id = Column(String(64), nullable=True)
    page_count = Column(Integer, default=1, nullable=True)
    chunk_count = Column(Integer, default=1, nullable=True)
    source_identifier = Column(String(256), nullable=True)
    access_role_minimum = Column(String(32), default="student", nullable=False)
    raw_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    category = synonym("document_type")

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        if "category" in kwargs and "document_type" not in kwargs:
            kwargs["document_type"] = kwargs.pop("category")
        if "source_identifier" in kwargs and "source_file" not in kwargs:
            kwargs["source_file"] = kwargs.get("source_identifier")
        super().__init__(**kwargs)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True)
    document_id = Column(String(64), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    section_title = Column(String(256), nullable=False)
    content = Column(Text, nullable=False)
    keywords = Column(JSONB, default=list, nullable=False)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        Index("idx_doc_chunk_doc_idx", "document_id", "chunk_index"),
    )

    document = relationship("KnowledgeDocument", back_populates="chunks")


# Compatibility Aliases for Application
Faculty = FacultyProfile
SessionEntity = Session
ScheduledSession = TimetableEntry
ScheduleVersion = Schedule
