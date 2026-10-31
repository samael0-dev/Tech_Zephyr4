import json
import os
from datetime import datetime
from typing import Dict

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, engine
from app.core.permissions import RoleEnum
from app.core.security import hash_password
from app.models.booking import BookingRequest
from app.models.exam import Exam
from app.models.faculty import Course, Faculty, StudentGroup
from app.models.room import Room, RoomUnavailability
from app.models.session import SessionEntity
from app.models.user import User


def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)


def load_starter_pack_data(db: Session, force_reload: bool = False) -> Dict[str, int]:
    """
    Parses cit_public.json and populates Rooms, Faculty, StudentGroups, Courses, Sessions,
    BookingRequests, Cancellations, Exams, and User demo accounts for all 5 roles.
    """
    init_db()

    # If already loaded and not force_reload, skip loading
    existing_rooms_count = db.query(Room).count()
    if existing_rooms_count > 0 and not force_reload:
        return {"status": "already_loaded", "rooms": existing_rooms_count}

    if force_reload:
        # Clear existing entities cleanly
        for model in [
            BookingRequest,
            Exam,
            SessionEntity,
            Course,
            StudentGroup,
            Faculty,
            RoomUnavailability,
            Room,
            User,
        ]:
            db.query(model).delete()
        db.commit()

    dataset_path = settings.DATASET_PATH
    if not os.path.isabs(dataset_path):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        dataset_path = os.path.join(base_dir, settings.DATASET_PATH)

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset file not found at: {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Rooms
    for r in data.get("rooms", []):
        room_obj = Room(
            id=r["id"],
            name=r["name"],
            building=r["building"],
            type=r["type"],
            capacity=r["capacity"],
            features=r.get("features", []),
            accessible=r.get("accessible", False),
            allowed_uses=r.get("allowed_uses", []),
        )
        db.add(room_obj)

    # 2. Room Unavailability
    for un in data.get("room_unavailability", []):
        db.add(
            RoomUnavailability(
                room_id=un["room_id"],
                day=un["day"],
                periods=un["periods"],
                reason=un.get("reason"),
            )
        )

    # 3. Faculty
    for f in data.get("faculty", []):
        db.add(
            Faculty(
                id=f["id"],
                name=f["name"],
                department=f["department"],
                max_hours_per_day=f.get("max_hours_per_day", 4),
                needs_accessible=f.get("needs_accessible", False),
                unavailable=f.get("unavailable", []),
                preferences=f.get("preferences", []),
            )
        )

    # 4. Student Groups
    for sg in data.get("student_groups", []):
        db.add(
            StudentGroup(
                id=sg["id"],
                name=sg["name"],
                year=sg["year"],
                department=sg["department"],
                size=sg["size"],
                needs_accessible=sg.get("needs_accessible", False),
            )
        )

    # 5. Courses
    for c in data.get("courses", []):
        db.add(
            Course(
                id=c["id"],
                name=c.get("name", c["id"]),
                department=c.get("department"),
                lecture_hours=c.get("lecture_hours", 0),
                tutorial_hours=c.get("tutorial_hours", 0),
                lab_blocks=c.get("lab_blocks", 0),
            )
        )

    # 6. Sessions
    for s in data.get("sessions", []):
        db.add(
            SessionEntity(
                id=s["id"],
                course_id=s["course_id"],
                kind=s["kind"],
                groups=s["groups"],
                faculty_id=s["faculty_id"],
                size=s["size"],
                duration=s["duration"],
                room_types=s["room_types"],
                needs_accessible=s.get("needs_accessible", False),
                basket_slot=s.get("basket_slot"),
                fixed_slot=s.get("fixed_slot"),
            )
        )

    # 7. Cancellations set
    cancelled_ids = {
        c["request_id"] if isinstance(c, dict) else c
        for c in data.get("cancellations", [])
    }

    # 8. Booking Requests
    for br in data.get("booking_requests", []):
        raw_submitted_at = br.get("submitted_at")
        try:
            submitted_at = datetime.fromisoformat(raw_submitted_at)
        except Exception:
            submitted_at = datetime.utcnow()

        role = br.get("role", "club")
        # Ensure role exists in cap
        role_enum = RoleEnum(role) if role in [r.value for r in RoleEnum] else RoleEnum.CLUB
        effective_cat = br.get("requested_category", "club_event")
        # Cap logic: if club asks for institute_event, cap to club_event
        if role_enum == RoleEnum.CLUB:
            effective_cat = "club_event"

        initial_status = "cancelled" if br["id"] in cancelled_ids else "pending"

        db.add(
            BookingRequest(
                id=br["id"],
                submitted_at=submitted_at,
                requester=br["requester"],
                requester_user_id=None,  # will link below
                role=role,
                department=br.get("department"),
                requested_category=br.get("requested_category", "club_event"),
                effective_category=effective_cat,
                title=br["title"],
                attendance=br["attendance"],
                duration_periods=br["duration_periods"],
                windows=br.get("windows", []),
                room_types=br.get("room_types", []),
                needs=br.get("needs", []),
                requested_room=br.get("requested_room"),
                mandatory_for_groups=br.get("mandatory_for_groups", []),
                series_id=br.get("series_id"),
                raw_text=br.get("raw_text"),
                status=initial_status,
            )
        )

    # 9. Exams
    for ex in data.get("exams", []):
        db.add(
            Exam(
                id=ex["id"],
                course_ids=ex["course_ids"],
                groups=ex["groups"],
                size=ex["size"],
                duration_hours=ex.get("duration_hours", 2),
            )
        )

    db.commit()

    # 10. Seed Default Accounts across all 5 roles
    seed_demo_users(db)

    return {
        "status": "loaded",
        "rooms": len(data.get("rooms", [])),
        "faculty": len(data.get("faculty", [])),
        "student_groups": len(data.get("student_groups", [])),
        "courses": len(data.get("courses", [])),
        "sessions": len(data.get("sessions", [])),
        "booking_requests": len(data.get("booking_requests", [])),
        "exams": len(data.get("exams", [])),
    }


def seed_demo_users(db: Session):
    """
    Seeds demo accounts for all five roles:
    1. Admin (Dean's office)
    2. Department Coordinators (CSE, ECE, ME, EE, CE)
    3. Faculty (F01 to F40)
    4. Club Representatives (Dramatics, Coding, Robotics, etc.)
    5. Students (Student groups Y1-A, Y2-CSE, etc.)
    """
    default_password_hash = hash_password("password123")

    users_to_create = [
        # 1. Admin
        User(
            id="usr-admin-01",
            username="dean",
            email="dean@cit.edu",
            hashed_password=default_password_hash,
            name="Prof. R. K. Jena (Dean of Academics)",
            role=RoleEnum.ADMIN.value,
            department="ADMIN",
            is_active=True,
        ),
        # 2. Department Coordinators
        User(
            id="usr-coord-cse",
            username="coord_cse",
            email="coordinator.cse@cit.edu",
            hashed_password=default_password_hash,
            name="CSE Dept Coordinator",
            role=RoleEnum.DEPARTMENT_COORDINATOR.value,
            department="CSE",
            is_active=True,
        ),
        User(
            id="usr-coord-ece",
            username="coord_ece",
            email="coordinator.ece@cit.edu",
            hashed_password=default_password_hash,
            name="ECE Dept Coordinator",
            role=RoleEnum.DEPARTMENT_COORDINATOR.value,
            department="ECE",
            is_active=True,
        ),
        User(
            id="usr-coord-me",
            username="coord_me",
            email="coordinator.me@cit.edu",
            hashed_password=default_password_hash,
            name="ME Dept Coordinator",
            role=RoleEnum.DEPARTMENT_COORDINATOR.value,
            department="ME",
            is_active=True,
        ),
        User(
            id="usr-coord-ee",
            username="coord_ee",
            email="coordinator.ee@cit.edu",
            hashed_password=default_password_hash,
            name="EE Dept Coordinator",
            role=RoleEnum.DEPARTMENT_COORDINATOR.value,
            department="EE",
            is_active=True,
        ),
        User(
            id="usr-coord-ce",
            username="coord_ce",
            email="coordinator.ce@cit.edu",
            hashed_password=default_password_hash,
            name="CE Dept Coordinator",
            role=RoleEnum.DEPARTMENT_COORDINATOR.value,
            department="CE",
            is_active=True,
        ),
        # 4. Club Representatives
        User(
            id="usr-club-dramatics",
            username="dramatics",
            email="dramatics@cit.edu",
            hashed_password=default_password_hash,
            name="Dramatics Society Rep",
            role=RoleEnum.CLUB.value,
            club_name="Dramatics Society",
            is_active=True,
        ),
        User(
            id="usr-club-coding",
            username="coding",
            email="coding@cit.edu",
            hashed_password=default_password_hash,
            name="Coding Club Rep",
            role=RoleEnum.CLUB.value,
            club_name="Coding Club",
            is_active=True,
        ),
        User(
            id="usr-club-robotics",
            username="robotics",
            email="robotics@cit.edu",
            hashed_password=default_password_hash,
            name="Robotics Club Rep",
            role=RoleEnum.CLUB.value,
            club_name="Robotics Club",
            is_active=True,
        ),
        # 5. Student Accounts (5th Role)
        User(
            id="usr-student-y1a",
            username="student_y1a",
            email="student.y1a@cit.edu",
            hashed_password=default_password_hash,
            name="Rahul Sharma (Y1 Section A)",
            role=RoleEnum.STUDENT.value,
            student_group_id="Y1-A",
            department="COMMON",
            is_active=True,
        ),
        User(
            id="usr-student-y2cse",
            username="student_y2cse",
            email="student.y2cse@cit.edu",
            hashed_password=default_password_hash,
            name="Sneha Patel (Y2 CSE)",
            role=RoleEnum.STUDENT.value,
            student_group_id="Y2-CSE",
            department="CSE",
            is_active=True,
        ),
    ]

    # 3. Faculty Accounts for all faculty in database
    all_faculty = db.query(Faculty).all()
    for fac in all_faculty:
        fac_username = fac.id.lower()
        users_to_create.append(
            User(
                id=f"usr-fac-{fac.id.lower()}",
                username=fac_username,
                email=f"{fac_username}@cit.edu",
                hashed_password=default_password_hash,
                name=fac.name,
                role=RoleEnum.FACULTY.value,
                department=fac.department,
                faculty_id=fac.id,
                is_active=True,
            )
        )

    for user in users_to_create:
        existing = db.query(User).filter(User.username == user.username).first()
        if not existing:
            db.add(user)

    db.commit()

    # Link some booking requests to their user IDs for authentic No Self-Approval tests
    dramatics_user = db.query(User).filter(User.username == "dramatics").first()
    if dramatics_user:
        db.query(BookingRequest).filter(
            BookingRequest.requester == "Dramatics Society"
        ).update({"requester_user_id": dramatics_user.id})

    coding_user = db.query(User).filter(User.username == "coding").first()
    if coding_user:
        db.query(BookingRequest).filter(
            BookingRequest.requester == "Coding Club"
        ).update({"requester_user_id": coding_user.id})

    coord_cse = db.query(User).filter(User.username == "coord_cse").first()
    if coord_cse:
        db.query(BookingRequest).filter(
            BookingRequest.requester == "CSE Department"
        ).update({"requester_user_id": coord_cse.id})

    db.commit()
