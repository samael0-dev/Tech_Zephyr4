from sqlalchemy import Boolean, Column, Integer, JSON, String
from app.core.database import Base
from app.models.base import TimestampMixin


class Room(Base, TimestampMixin):
    __tablename__ = "rooms"

    id = Column(String(32), primary_key=True, index=True)  # AUD, LH-1, CS-LAB-1, etc.
    name = Column(String(128), nullable=False)
    building = Column(String(128), nullable=False, index=True)
    type = Column(String(32), nullable=False, index=True)  # classroom, lecture_hall, auditorium, etc.
    capacity = Column(Integer, nullable=False)
    features = Column(JSON, default=list)  # ["projector", "pa_system", ...]
    accessible = Column(Boolean, default=False, nullable=False)
    allowed_uses = Column(JSON, default=list)  # ["lecture", "tutorial", "exam", "event"]


class RoomUnavailability(Base, TimestampMixin):
    __tablename__ = "room_unavailabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(String(32), nullable=False, index=True)
    day = Column(String(8), nullable=False)  # MON..FRI
    periods = Column(JSON, nullable=False)  # [1, 2, 3]
    reason = Column(String(256), nullable=True)
