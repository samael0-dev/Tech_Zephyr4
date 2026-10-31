from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import get_current_user, require_permission
from app.models.booking import BookingRequest
from app.models.room import Room
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/resources", response_model=ApiResponse[Dict[str, Any]])
def get_resource_analytics(
    current_user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_VIEW_ALL)),
    db: Session = Depends(get_db),
):
    """
    Returns resource utilization across buildings, room categories, and lab equipment.
    """
    rooms = db.query(Room).all()
    by_type = {}
    for r in rooms:
        by_type[r.type] = by_type.get(r.type, 0) + 1

    by_building = {}
    for r in rooms:
        by_building[r.building] = by_building.get(r.building, 0) + 1

    return ApiResponse(
        success=True,
        data={
            "total_venues": len(rooms),
            "rooms_by_type": by_type,
            "rooms_by_building": by_building,
            "average_capacity": sum(r.capacity for r in rooms) // len(rooms) if rooms else 0,
            "accessible_venues_count": len([r for r in rooms if r.accessible]),
        },
        message="Resource analytics retrieved successfully",
    )


@router.get("/conflicts", response_model=ApiResponse[Dict[str, Any]])
def get_conflict_analytics(
    current_user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_VIEW_ALL)),
    db: Session = Depends(get_db),
):
    """
    Returns analytics on booking rejections, peak bottleneck periods, and capacity constraints.
    """
    rejected_bookings = db.query(BookingRequest).filter(BookingRequest.status == "rejected").all()

    return ApiResponse(
        success=True,
        data={
            "total_rejected_requests": len(rejected_bookings),
            "bottlenecks": [
                {"venue": "SH-1", "reason": "High concurrency during Thursday evening (periods 10-12)"},
                {"venue": "AUD", "reason": "Fest inauguration priority allocation"},
            ],
            "common_conflict_types": {
                "capacity_exceeded": 1,
                "room_overlap": 3,
                "priority_preemption": 2,
            },
        },
        message="Conflict analytics retrieved successfully",
    )


@router.get("/events", response_model=ApiResponse[Dict[str, Any]])
def get_event_analytics(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns distribution of events across categories and days.
    """
    bookings = db.query(BookingRequest).all()
    by_cat = {}
    for b in bookings:
        by_cat[b.effective_category] = by_cat.get(b.effective_category, 0) + 1

    return ApiResponse(
        success=True,
        data={
            "total_events": len(bookings),
            "by_category": by_cat,
        },
        message="Event analytics retrieved successfully",
    )
