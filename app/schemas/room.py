from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    building: str
    type: str
    capacity: int
    features: List[str] = []
    accessible: bool = False
    allowed_uses: List[str] = []


class RoomPeriodSlot(BaseModel):
    period: int
    is_occupied: bool
    occupied_by_type: Optional[str] = None  # session, booking, maintenance
    title: Optional[str] = None
    group: Optional[str] = None
    faculty: Optional[str] = None


class RoomAvailabilityResponse(BaseModel):
    room_id: str
    room_name: str
    day: str
    slots: List[RoomPeriodSlot]
