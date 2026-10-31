"""FastAPI service endpoints for CampusOS Scheduling Intelligence & AI."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from engine.scheduler.models import Dataset
from engine.scheduler.data_loader import load_dataset
from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.scheduler.validator_adapter import run_validator_direct
from engine.exams.engine import generate_exam_schedule
from engine.fest.engine import evaluate_fest_week
from engine.rescheduler.engine import reschedule
from ai.assistant.schemas import UserContext, ChatMessage, AssistantResponse
from ai.assistant.assistant import process_assistant_message
from ai.rag.pipeline import get_rag
from api.database import test_connection as db_test_connection
from api.services.campus_service import CampusService
from api.services.analytics_service import AnalyticsService

app = FastAPI(
    title="CampusOS Scheduling Intelligence & AI API",
    description="Deterministic CP-SAT Solver and Agentic AI Assistant for Chilika Institute of Technology",
    version="1.0.0",
)

DATA_PATH = Path("CrunchWeek_StarterPack/data/cit_public.json")
BASELINE_PATH = Path("exports/schedule.json")
REPAIRED_PATH = Path("exports/schedule_after.json")


def _read_json(path: Path) -> dict:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


class GenerateTimetableRequest(BaseModel):
    time_limit_seconds: float = 30.0
    num_workers: int = 8
    optimize_soft: bool = True


class ValidateRequest(BaseModel):
    schedule: dict
    data: Optional[dict] = None
    baseline: Optional[dict] = None
    disruption: Optional[dict] = None


class RescheduleRequest(BaseModel):
    disruption: dict
    baseline_schedule: Optional[dict] = None
    time_limit_seconds: float = 30.0


class AssistantChatRequest(BaseModel):
    message: str
    user_context: Optional[UserContext] = None
    history: Optional[List[ChatMessage]] = None


class RAGQueryRequest(BaseModel):
    query: str


@app.get("/health")
def health():
    import os
    return {
        "status": "healthy",
        "service": "CampusOS Intelligence API",
        "baseline_exists": BASELINE_PATH.exists(),
        "repaired_exists": REPAIRED_PATH.exists(),
        "database_configured": bool(os.getenv("DATABASE_URL")),
    }


@app.get("/api/db/test")
def api_test_db():
    """Test connectivity to Neon PostgreSQL and execute SELECT version()."""
    return db_test_connection()


@app.post("/api/timetable/generate")
def api_generate_timetable(req: GenerateTimetableRequest):
    data = _read_json(DATA_PATH)
    opts = SolverOptions(
        time_limit_seconds=req.time_limit_seconds,
        num_workers=req.num_workers,
        optimize_soft=req.optimize_soft,
    )
    res = generate_timetable(data, opts)
    return {
        "status": res.status,
        "is_feasible": res.is_feasible,
        "objective_value": res.objective_value,
        "wall_time_seconds": res.wall_time_seconds,
        "sessions_count": len(res.sessions),
        "schedule": res.schedule_dict,
        "diagnostics": res.diagnostics,
    }


@app.post("/api/timetable/validate")
def api_validate_timetable(req: ValidateRequest):
    data = req.data or _read_json(DATA_PATH)
    rep = run_validator_direct(
        data_dict=data,
        schedule_dict=req.schedule,
        baseline_dict=req.baseline,
        disruption_dict=req.disruption,
    )
    return rep


@app.post("/api/exams/generate")
def api_generate_exams():
    data = _read_json(DATA_PATH)
    dataset = load_dataset(data)
    res = generate_exam_schedule(dataset)
    return {
        "status": res.status,
        "is_feasible": res.is_feasible,
        "soft_penalty": res.soft_penalty,
        "wall_time_seconds": res.wall_time_seconds,
        "exams_count": len(res.assignments),
        "exams": res.assignments,
    }


@app.post("/api/bookings/evaluate")
def api_evaluate_bookings():
    data = _read_json(DATA_PATH)
    base = _read_json(BASELINE_PATH)
    sessions = base.get("sessions", [])
    res = evaluate_fest_week(data, sessions)
    return res


@app.post("/api/reschedule")
def api_reschedule(req: RescheduleRequest):
    data = _read_json(DATA_PATH)
    base = req.baseline_schedule or _read_json(BASELINE_PATH)
    res = reschedule(base, req.disruption, data, time_limit_seconds=req.time_limit_seconds)
    return {
        "status": res.status,
        "is_feasible": res.is_feasible,
        "sessions_moved": res.sessions_moved,
        "time_changed": res.time_changed,
        "room_only_changed": res.room_only_changed,
        "wall_time_seconds": res.wall_time_seconds,
        "schedule": res.schedule_dict,
        "diagnostics": res.diagnostics,
    }


@app.post("/api/assistant/chat", response_model=AssistantResponse)
def api_assistant_chat(req: AssistantChatRequest):
    return process_assistant_message(req.message, req.user_context, req.history)


@app.post("/api/rag/query")
def api_rag_query(req: RAGQueryRequest):
    rag = get_rag()
    return rag.answer_query(req.query)


@app.get("/api/schedule/baseline")
def api_get_baseline():
    return _read_json(BASELINE_PATH)


@app.get("/api/schedule/repaired")
def api_get_repaired():
    return _read_json(REPAIRED_PATH)


# ==============================================================================
# Database-Backed Campus Operations & Analytics Endpoints
# ==============================================================================


@app.get("/api/campus/buildings")
def api_get_buildings():
    """Retrieve all campus buildings with room counts and utilization."""
    return AnalyticsService.get_building_utilisation()


@app.get("/api/campus/rooms")
def api_get_rooms(
    day: Optional[str] = None,
    period: Optional[int] = None,
    room_type: Optional[str] = None,
    min_capacity: Optional[int] = None,
    needs_accessible: bool = False,
):
    """Query campus rooms with optional availability and feature filtering."""
    if day and period:
        return CampusService.get_available_rooms(
            day=day,
            period=period,
            room_type=room_type,
            min_capacity=min_capacity,
            needs_accessible=needs_accessible,
        )
    return CampusService.search_rooms(
        room_type=room_type,
        min_capacity=min_capacity,
    )


@app.get("/api/campus/rooms/{room_id}")
def api_get_room_details(room_id: str):
    """Retrieve full details of a specific room."""
    room = CampusService.get_room_details(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")
    return room


@app.get("/api/campus/timetable/faculty/{faculty_id}")
def api_get_faculty_timetable(faculty_id: str, day: Optional[str] = None):
    """Retrieve timetable for a specific faculty member."""
    return CampusService.get_faculty_timetable(faculty_id, day=day)


@app.get("/api/campus/timetable/group/{group_id}")
def api_get_group_timetable(group_id: str, day: Optional[str] = None):
    """Retrieve timetable for a student group."""
    return CampusService.get_student_group_timetable(group_id, day=day)


@app.get("/api/campus/timetable/room/{room_id}")
def api_get_room_schedule(room_id: str, day: Optional[str] = None):
    """Retrieve timetable for a specific room."""
    return CampusService.get_room_schedule(room_id, day=day)


@app.get("/api/campus/analytics/utilisation")
def api_get_utilisation():
    """Get building and room utilization rankings."""
    return {
        "buildings": AnalyticsService.get_building_utilisation(),
        "rooms": AnalyticsService.get_room_utilisation(),
    }


@app.get("/api/campus/analytics/summary")
def api_get_summary():
    """Get active schedule summary metrics."""
    return AnalyticsService.get_scheduling_summary()


@app.get("/api/campus/bookings/pending")
def api_get_pending_bookings():
    """Get all pending booking requests."""
    return CampusService.get_pending_bookings()

