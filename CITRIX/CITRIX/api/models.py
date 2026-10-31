"""SQLAlchemy declarative models for CITRIX PostgreSQL database."""

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
from sqlalchemy.orm import relationship

from api.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
    faculty_profiles = relationship("FacultyProfile", back_populates="department")
    student_groups = relationship("StudentGroup", back_populates="department")
    courses = relationship("Course", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)  # user ID or faculty ID (e.g. F01)
    email = Column(String(128), unique=True, nullable=True, index=True)
    full_name = Column(String(128), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    department = relationship("Department")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(String(32), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(String(32), primary_key=True)  # F01, F02, etc. Preserves original ID
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(128), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    max_hours_per_day = Column(Integer, default=4, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSONB, default=list, nullable=False)  # S1 avoid preferences list
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="faculty_profile")
    department = relationship("Department", back_populates="faculty_profiles")
    unavailabilities = relationship("FacultyUnavailability", back_populates="faculty", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="faculty")


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

    id = Column(String(32), primary_key=True)  # Y1-A, CSE-2, etc. Preserves original ID
    name = Column(String(128), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    size = Column(Integer, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    department = relationship("Department", back_populates="student_groups")
    sessions = relationship("SessionGroup", back_populates="group", cascade="all, delete-orphan")


# ==============================================================================
# MODULE B: Academic Structure
# ==============================================================================


class AcademicTerm(Base):
    __tablename__ = "academic_terms"

    id = Column(String(32), primary_key=True)  # e.g. 2026-2027-SEM2
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

    id = Column(String(32), primary_key=True)  # MA101, CS201, etc. Preserves original ID
    title = Column(String(128), nullable=False)
    department_code = Column(String(16), ForeignKey("departments.code", ondelete="RESTRICT"), nullable=False, index=True)
    year = Column(Integer, nullable=True, index=True)
    lecture_hours = Column(Integer, default=0, nullable=False)
    tutorial_hours = Column(Integer, default=0, nullable=False)
    lab_blocks = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    department = relationship("Department", back_populates="courses")
    sessions = relationship("Session", back_populates="course")


# ==============================================================================
# MODULE C: Campus Infrastructure
# ==============================================================================


class Building(Base):
    __tablename__ = "buildings"

    id = Column(String(64), primary_key=True)  # slug or canonical ID
    name = Column(String(128), nullable=False, unique=True, index=True)
    code = Column(String(32), nullable=True)
    has_lift = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="building")
    utilisation_snapshots = relationship("UtilisationSnapshot", back_populates="building")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(32), primary_key=True)  # LH-1, AUD, CR-101, etc. Preserves original ID
    name = Column(String(128), nullable=False)
    building_id = Column(String(64), ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False, index=True)
    type = Column(String(32), nullable=False, index=True)  # classroom, lecture_hall, auditorium, etc.
    capacity = Column(Integer, nullable=False)
    exam_capacity = Column(Integer, nullable=False)  # capacity // 2
    accessible = Column(Boolean, default=False, nullable=False)
    features = Column(JSONB, default=list, nullable=False)  # projector, stage, pa_system, etc.
    allowed_uses = Column(JSONB, default=list, nullable=False)  # lecture, tutorial, lab, exam, event
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    building = relationship("Building", back_populates="rooms")
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


# ==============================================================================
# MODULE D: Timetable and Scheduling
# ==============================================================================


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)  # MA101-AB-L1, etc. Preserves original ID
    course_id = Column(String(32), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False, index=True)
    kind = Column(String(16), nullable=False, index=True)  # lecture, tutorial, lab
    faculty_id = Column(String(32), ForeignKey("faculty_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    size = Column(Integer, nullable=False)
    duration = Column(Integer, default=1, nullable=False)  # in periods
    room_types = Column(JSONB, default=list, nullable=False)
    needs_accessible = Column(Boolean, default=False, nullable=False)
    basket_slot = Column(String(32), nullable=True, index=True)  # OEB-1, OEB-2, OEB-3
    fixed_slot_day = Column(String(4), nullable=True)
    fixed_slot_period = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    course = relationship("Course", back_populates="sessions")
    faculty = relationship("FacultyProfile", back_populates="sessions")
    groups = relationship("SessionGroup", back_populates="session", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="session", cascade="all, delete-orphan")


class SessionGroup(Base):
    __tablename__ = "session_groups"

    session_id = Column(String(64), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(String(32), ForeignKey("student_groups.id", ondelete="CASCADE"), primary_key=True)

    session = relationship("Session", back_populates="groups")
    group = relationship("StudentGroup", back_populates="sessions")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(64), primary_key=True)  # cit-baseline-schedule, etc.
    name = Column(String(128), nullable=False)
    dataset_id = Column(String(64), nullable=False)
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

    versions = relationship("ScheduleVersion", back_populates="schedule", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="schedule", cascade="all, delete-orphan")
    conflicts = relationship("SchedulingConflict", back_populates="schedule", cascade="all, delete-orphan")


class ScheduleVersion(Base):
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
    end_period = Column(Integer, nullable=False)  # start_period + duration - 1
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True)
    is_overridden_for_fest = Column(Boolean, default=False, nullable=False)
    override_displaced_by = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("schedule_id", "session_id", name="uq_schedule_session"),
        Index("idx_timetable_room_day_start", "schedule_id", "room_id", "day", "start_period"),
        Index("idx_timetable_day_period", "schedule_id", "day", "start_period", "end_period"),
    )

    schedule = relationship("Schedule", back_populates="timetable_entries")
    session = relationship("Session", back_populates="timetable_entries")
    room = relationship("Room", back_populates="timetable_entries")


# ==============================================================================
# MODULE E: Bookings and Campus Events
# ==============================================================================


class EventCategory(Base):
    __tablename__ = "event_categories"

    code = Column(String(32), primary_key=True)  # institute_event, guest_lecture, department_event, club_event
    name = Column(String(64), nullable=False)
    weight = Column(Integer, nullable=False)  # 5, 4, 3, 2 (validator CAT_WEIGHT)
    priority_rank = Column(Integer, nullable=False)  # 1, 2, 3, 4


class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id = Column(String(32), primary_key=True)  # BR-01, BR-02, etc. Preserves original ID
    submitted_at = Column(DateTime(timezone=True), nullable=False, index=True)
    requester = Column(String(128), nullable=False)
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
    
    # Decision state
    status = Column(String(32), default="pending", nullable=False, index=True)  # approved, rejected, alternative_offered, cancelled, pending
    assigned_room_id = Column(String(32), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_day = Column(String(4), nullable=True, index=True)
    assigned_start_period = Column(Integer, nullable=True)
    assigned_end_period = Column(Integer, nullable=True)
    decision_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

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

    id = Column(String(32), primary_key=True)  # EX-MA101, etc. Preserves original ID
    term_id = Column(String(32), ForeignKey("academic_terms.id", ondelete="SET NULL"), nullable=True)
    size = Column(Integer, nullable=False)
    duration_hours = Column(Integer, default=2, nullable=False)
    course_ids = Column(JSONB, default=list, nullable=False)
    groups = Column(JSONB, default=list, nullable=False)
    
    # Schedule assignment
    scheduled_day = Column(String(4), nullable=True, index=True)  # MON, TUE, WED, THU, FRI, SAT
    scheduled_session = Column(String(16), ForeignKey("exam_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    allocations = relationship("ExamRoomAllocation", back_populates="exam", cascade="all, delete-orphan")


class ExamRoomAllocation(Base):
    __tablename__ = "exam_room_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(String(32), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(String(32), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_seats = Column(Integer, nullable=False)  # up to room.capacity // 2

    __table_args__ = (
        UniqueConstraint("exam_id", "room_id", name="uq_exam_room_allocation"),
    )

    exam = relationship("Exam", back_populates="allocations")
    room = relationship("Room", back_populates="exam_allocations")


# ==============================================================================
# MODULE G: Operational Monitoring and Analytics
# ==============================================================================


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(64), nullable=False, index=True)  # GENERATE_TIMETABLE, RESCHEDULE, etc.
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    role_target = Column(String(32), nullable=True)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


class SchedulingConflict(Base):
    __tablename__ = "scheduling_conflicts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(String(64), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_code = Column(String(16), nullable=False, index=True)  # H1-H14, B1-B3, E1-E2
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

    id = Column(String(64), primary_key=True)  # doc_readme, doc_scheduling_rules, etc.
    title = Column(String(256), nullable=False)
    source_file = Column(String(256), nullable=False)
    document_type = Column(String(64), nullable=False)  # policy, regulation, guide, catalog
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True)  # doc_readme_0, etc.
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
