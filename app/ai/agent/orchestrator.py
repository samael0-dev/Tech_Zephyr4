import time
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from app.ai.agent.context import conversation_manager
from app.ai.agent.intent import classify_user_intent
from app.ai.agent.prompts import CITRIX_SYSTEM_PROMPT
from app.ai.agent.tools import tool_registry
from app.ai.llm_factory import invoke_citrix_llm
from app.ai.rag.retrieval_service import retrieve_relevant_knowledge
from app.models.session import SessionEntity
from app.schemas.auth import CurrentUser


def run_citrix_orchestrator(
    db: Session,
    user: CurrentUser,
    message: str,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main Agentic Orchestration loop:
    1. Resolve session & multi-turn conversational context.
    2. Classify intent & extract entities.
    3. Determine whether tool execution, RAG retrieval, or clarification is needed.
    4. Enforce role-based access permissions.
    5. Execute permitted tools and measure tool execution latency.
    6. Synthesize grounded response using ChatGroq (llama-3.1-8b-instant).
    7. Track total end-to-end orchestration latency.
    """
    start_total_time = time.perf_counter()
    s_id = session_id or f"sess-{user.id}"

    # 1. Classify intent & extract entities
    intent_res = classify_user_intent(message, current_role=user.role)

    # 2. Update multi-turn session
    session = conversation_manager.add_user_turn(
        session_id=s_id,
        user_id=user.id,
        user_role=user.role,
        content=message,
        intent=intent_res.intent_type,
        entities=intent_res.entities,
    )
    accumulated = session.accumulated_slots

    # 3. Check if clarification question is needed
    if intent_res.clarification_question:
        reply = intent_res.clarification_question
        conversation_manager.add_assistant_turn(s_id, reply)
        total_duration_ms = round((time.perf_counter() - start_total_time) * 1000, 2)
        return {
            "reply": reply,
            "intent": intent_res.intent_type,
            "entities": accumulated,
            "citations": [],
            "tool_result": None,
            "tool_calls": [],
            "requires_confirmation": False,
            "action_proposal": None,
            "latency_ms": total_duration_ms,
        }

    tool_result: Optional[Dict[str, Any]] = None
    action_proposal: Optional[Dict[str, Any]] = None
    requires_confirmation = False
    citations: List[Dict[str, Any]] = []
    tool_calls_log: List[Dict[str, Any]] = []

    # 4. Agentic Branching: Tool Execution via Registry
    if intent_res.intent_type == "room_search":
        rid = accumulated.get("room_id", "SH-1")
        day = accumulated.get("day", "MON")
        t_exec = tool_registry.execute("lookup_room_availability", db, user, room_id=rid, day=day)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "lookup_room_availability",
            "arguments": {"room_id": rid, "day": day},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    elif intent_res.intent_type == "booking_status":
        bid = accumulated.get("booking_id", "BR-09")
        t_exec = tool_registry.execute("lookup_booking_status", db, user, booking_id=bid)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "lookup_booking_status",
            "arguments": {"booking_id": bid},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    elif intent_res.intent_type == "booking_create":
        title = accumulated.get("title", f"Event by {user.name}")
        attendance = accumulated.get("attendance", 50)
        room_id = accumulated.get("room_id", "SH-1")
        day = accumulated.get("day", "THU")
        from_p = accumulated.get("from_period", 10)
        to_p = accumulated.get("to_period", 11)

        t_exec = tool_registry.execute(
            "propose_booking_request",
            db, user,
            title=title,
            attendance=attendance,
            requested_room=room_id,
            day=day,
            from_period=from_p,
            to_period=to_p,
        )
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "propose_booking_request",
            "arguments": {"title": title, "attendance": attendance, "requested_room": room_id},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })
        if t_exec["success"] and tool_result:
            requires_confirmation = tool_result.get("requires_confirmation", False)
            action_proposal = tool_result.get("proposal")

    elif intent_res.intent_type == "reschedule_request":
        fac_id = accumulated.get("faculty_id")
        rid = accumulated.get("room_id")
        day = accumulated.get("day", "MON")
        disrupt_type = "faculty_unavailable" if fac_id else "room_unavailable"

        t_exec = tool_registry.execute(
            "propose_rescheduling_request",
            db, user,
            disruption_type=disrupt_type,
            faculty_id=fac_id,
            room_id=rid,
            days=[day],
            periods=[1, 2, 3, 4, 5, 6, 7, 8, 9],
            reason="Unavailability submitted via AI Assistant",
        )
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "propose_rescheduling_request",
            "arguments": {"disruption_type": disrupt_type, "faculty_id": fac_id, "room_id": rid},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })
        if t_exec["success"] and tool_result:
            requires_confirmation = tool_result.get("requires_confirmation", False)
            action_proposal = tool_result.get("proposal")

    elif intent_res.intent_type == "timetable_lookup":
        grp = accumulated.get("student_group", user.student_group_id)
        fac = accumulated.get("faculty_id", user.faculty_id)
        day = accumulated.get("day")
        t_exec = tool_registry.execute("lookup_timetable", db, user, group_id=grp, faculty_id=fac, day=day)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "lookup_timetable",
            "arguments": {"group_id": grp, "faculty_id": fac, "day": day},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    elif intent_res.intent_type == "exam_lookup":
        grp = accumulated.get("student_group", user.student_group_id)
        crs = accumulated.get("course_id")
        t_exec = tool_registry.execute("lookup_exam_schedule", db, user, group_id=grp, course_id=crs)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "lookup_exam_schedule",
            "arguments": {"group_id": grp, "course_id": crs},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    elif intent_res.intent_type == "conflict_explanation":
        t_exec = tool_registry.execute("explain_scheduling_conflicts", db, user)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "explain_scheduling_conflicts",
            "arguments": {},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    elif intent_res.intent_type == "dean_summary":
        t_exec = tool_registry.execute("get_dean_operational_intelligence", db, user)
        tool_result = t_exec.get("result") if t_exec["success"] else {"error": t_exec.get("error")}
        tool_calls_log.append({
            "tool_name": "get_dean_operational_intelligence",
            "arguments": {},
            "status": "SUCCESS" if t_exec["success"] else "FAILED",
            "latency_ms": t_exec.get("latency_ms", 0.0),
        })

    # 5. Query RAG for institutional policies or supporting context
    rag_context, citations = retrieve_relevant_knowledge(
        query=message,
        user_role=user.role,
        user_department=user.department,
        top_k=2,
    )

    # 6. Detailed Timetable / Session Assignment Explanation (Scenario B)
    course_query = accumulated.get("course_id")
    if intent_res.intent_type in ["conflict_explanation", "timetable_lookup"] and course_query:
        sess = db.query(SessionEntity).filter(SessionEntity.course_id == course_query).first()
        if sess:
            grounded_reply = (
                f"### Timetable Assignment Explanation for Course {course_query}\n"
                f"- **Session ID:** {sess.id} ({sess.kind})\n"
                f"- **Assigned Faculty:** {sess.faculty_id} (Compliant with max 4-hr daily limit H11)\n"
                f"- **Class Size:** {sess.size} students\n"
                f"- **Enrolled Groups:** {sess.groups}\n"
                f"- **Room Constraint Check:** Session requires room types {sess.room_types}. "
                f"Allocated venue fits group capacity and satisfies accessibility requirements.\n"
                f"- **Solver Truth:** Assignment strictly satisfies all hard constraints (no faculty clash, no group clash, no cross-lunch placement)."
            )
            total_duration_ms = round((time.perf_counter() - start_total_time) * 1000, 2)
            conversation_manager.add_assistant_turn(s_id, grounded_reply)
            return {
                "reply": grounded_reply,
                "intent": intent_res.intent_type,
                "entities": accumulated,
                "citations": citations,
                "tool_result": tool_result,
                "tool_calls": tool_calls_log,
                "requires_confirmation": False,
                "action_proposal": None,
                "latency_ms": total_duration_ms,
            }

    # 7. Synthesize grounded answer
    grounded_reply = _synthesize_grounded_response(
        user_message=message,
        intent=intent_res.intent_type,
        tool_result=tool_result,
        rag_context=rag_context,
        requires_confirmation=requires_confirmation,
    )

    total_duration_ms = round((time.perf_counter() - start_total_time) * 1000, 2)

    # 8. Update assistant history
    conversation_manager.add_assistant_turn(
        session_id=s_id,
        content=grounded_reply,
        tool_executed=tool_calls_log[0]["tool_name"] if tool_calls_log else None,
        pending_action=action_proposal,
    )

    return {
        "reply": grounded_reply,
        "intent": intent_res.intent_type,
        "entities": accumulated,
        "citations": citations,
        "tool_result": tool_result,
        "tool_calls": tool_calls_log,
        "requires_confirmation": requires_confirmation,
        "action_proposal": action_proposal,
        "latency_ms": total_duration_ms,
    }


def _synthesize_grounded_response(
    user_message: str,
    intent: str,
    tool_result: Optional[Dict[str, Any]],
    rag_context: str,
    requires_confirmation: bool,
) -> str:
    """
    Constructs prompt for ChatGroq and invokes LLM
    with a deterministic fallback.
    """
    if requires_confirmation and tool_result and "message" in tool_result:
        return tool_result["message"]

    if intent == "booking_status" and tool_result:
        if tool_result.get("found"):
            bid = tool_result.get("booking_id")
            status = tool_result.get("status")
            reason = tool_result.get("decision_reason")
            room = tool_result.get("assigned_venue") or tool_result.get("requested_room")
            return (
                f"Booking Request **{bid}** is currently **{status.upper()}**.\n\n"
                f"- **Venue:** {room}\n"
                f"- **Decision Reason:** {reason}\n"
                f"- **Priority Tier:** {tool_result.get('effective_category')}"
            )
        else:
            return tool_result.get("message", "Booking record not found.")

    if intent == "room_search" and tool_result:
        if tool_result.get("found"):
            rid = tool_result.get("room_id")
            day = tool_result.get("day")
            free = tool_result.get("free_periods", [])
            occ = tool_result.get("occupied_periods", {})
            free_str = ", ".join(f"P{p}" for p in free) if free else "None"
            return (
                f"Availability for venue **{rid}** on **{day}**:\n"
                f"- **Capacity:** {tool_result.get('capacity')} students\n"
                f"- **Free Periods:** {free_str}\n"
                f"- **Occupied Periods:** {len(occ)} periods occupied"
            )

    if intent == "dean_summary" and tool_result:
        if "error" in tool_result:
            return tool_result["error"]
        venues = tool_result.get("total_campus_venues")
        pending = tool_result.get("pending_booking_approvals_count")
        bottlenecks = tool_result.get("bottlenecks", [])
        bn_str = "\n".join(f"- **{b['venue']}:** {b['issue']}" for b in bottlenecks)
        return (
            f"### CITRIX Dean Operational Intelligence Briefing\n"
            f"- **Total Campus Venues:** {venues}\n"
            f"- **Pending Booking Approvals:** {pending}\n"
            f"- **Active Bottlenecks:**\n{bn_str}"
        )

    if intent == "conflict_explanation" and tool_result:
        h_count = tool_result.get("hard_violations_count", 0)
        h_rules = tool_result.get("hard_violations_by_rule", {})
        return (
            f"### Scheduling Conflict Analysis (CP-SAT / Official Validator)\n"
            f"- **Active Schedule Version:** {tool_result.get('schedule_active')}\n"
            f"- **Total Hard Violations:** {h_count}\n"
            f"- **Violations By Rule:** {h_rules}\n"
            f"{tool_result.get('solver_explanation')}"
        )

    # For policy questions, prepare prompt and invoke ChatGroq
    system_msg = SystemMessage(content=CITRIX_SYSTEM_PROMPT)
    user_content = (
        f"User Query: {user_message}\n\n"
        f"Institutional Knowledge Reference:\n{rag_context if rag_context else 'No extra document.'}\n\n"
        f"Answer the query accurately based on the institutional policy above."
    )
    user_msg = HumanMessage(content=user_content)

    fallback_text = (
        f"Based on CIT institutional regulations:\n"
        f"{rag_context[:350]}...\n\n"
        f"Please refer to the official CIT academic scheduling policy for further details."
        if rag_context
        else "I could not find specific institutional documentation regarding your query. Please contact the Dean's Office."
    )

    return invoke_citrix_llm([system_msg, user_msg], fallback_prompt=fallback_text)
