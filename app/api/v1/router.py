from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    assistant,
    audit,
    auth,
    bookings,
    dashboards,
    exams,
    rag,
    reschedule,
    rooms,
    schedules,
    timetable,
)

api_router = APIRouter()

@api_router.get("/health", tags=["Health"])
def api_v1_health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "api": "v1",
    }


api_router.include_router(auth.router)
api_router.include_router(dashboards.router)
api_router.include_router(rooms.router)
api_router.include_router(timetable.router)
api_router.include_router(schedules.router)
api_router.include_router(bookings.router)
api_router.include_router(exams.router)
api_router.include_router(reschedule.router)
api_router.include_router(assistant.router)
api_router.include_router(rag.router)
api_router.include_router(analytics.router)
api_router.include_router(audit.router)
