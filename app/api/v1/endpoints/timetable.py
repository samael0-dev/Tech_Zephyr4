from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse
from app.schemas.timetable import SessionResponse, TimetableQuery
from app.services.timetable_service import query_timetable_sessions

router = APIRouter(prefix="/timetable", tags=["Timetable"])


@router.get("", response_model=ApiResponse[List[SessionResponse]])
def get_timetable(
    group_id: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    room_id: Optional[str] = Query(None),
    day: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns scheduled sessions with strict server-side RBAC data isolation:
    - Admin: Can query any group, faculty, or room.
    - Department Coordinator: Restricted to sessions for their department courses/groups.
    - Faculty: Automatically restricted to their own teaching sessions.
    - Student: Automatically restricted to their own student group's timetable.
    """
    filters = TimetableQuery(
        group_id=group_id,
        faculty_id=faculty_id,
        room_id=room_id,
        day=day,
    )
    sessions = query_timetable_sessions(db, current_user, filters)

    return ApiResponse(
        success=True,
        data=[SessionResponse(**s) for s in sessions],
        message="Timetable retrieved successfully",
    )
