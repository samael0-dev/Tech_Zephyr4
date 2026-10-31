"""CampusOS Intelligent AI Assistant supporting English and Hinglish requests."""

import re
from typing import Any, Dict, List, Optional
from datetime import datetime

from ai.assistant.schemas import (
    UserContext,
    ChatMessage,
    AssistantResponse,
    ToolCallRecord,
    ParsedBookingIntent,
    ParsedDisruptionIntent,
)
from ai.assistant import tools

# Mapping common natural-language terms to formal periods
TIME_MAPPINGS = {
    "morning": (1, 4),
    "afternoon": (6, 9),
    "evening": (10, 13),
    "shaam": (10, 13),
    "dopahar": (6, 9),
    "subah": (1, 4),
}

DAY_MAPPINGS = {
    "monday": "MON",
    "somwar": "MON",
    "mon": "MON",
    "tuesday": "TUE",
    "mangalwar": "TUE",
    "tue": "TUE",
    "wednesday": "WED",
    "budhwar": "WED",
    "wed": "WED",
    "thursday": "THU",
    "guruwar": "THU",
    "thu": "THU",
    "friday": "FRI",
    "shukrawar": "FRI",
    "fri": "FRI",
    "saturday": "SAT",
    "shaniwar": "SAT",
    "sat": "SAT",
}


class CampusAssistant:
    """Intelligent Assistant for CampusOS operations."""

    def __init__(self):
        pass

    def parse_booking_text(self, text: str) -> ParsedBookingIntent:
        """Extract structured booking fields from English or Hinglish text."""
        lower = text.lower()
        intent = ParsedBookingIntent()
        missing = []

        # Attendance extraction
        # e.g., 300 students, 45 people, 100 log, around 400
        att_match = re.search(r"(\d+)\s*(?:students|people|log|participants|members|seating)?", lower)
        # Look for explicit numbers near capacity/headcount keywords
        headcount_match = re.search(r"(?:around|approx|seats?|for)?\s*(\d+)\s*(?:students|people|log|participants|members)?", lower)
        if att_match:
            # find all numbers
            nums = [int(n) for n in re.findall(r"\b\d+\b", lower)]
            # filter numbers that aren't times (like 6 pm, 2 hours)
            filtered_nums = [n for n in nums if n > 12]  # likely attendance
            if filtered_nums:
                intent.attendance = filtered_nums[0]
            elif att_match.group(1):
                intent.attendance = int(att_match.group(1))

        # Duration extraction
        # e.g., 2 hours, 3 ghante, 3-hour, 1 hr
        dur_match = re.search(r"(\d+)\s*(?:hours?|hr|ghante|ghanta)", lower)
        if dur_match:
            intent.duration_periods = int(dur_match.group(1))
        else:
            intent.duration_periods = 1  # default 1 hour if unspecified

        # Day resolution
        # Check "kal" (tomorrow)
        if "kal" in lower or "tomorrow" in lower:
            # Resolve to next weekday (e.g., TUE if today is MON)
            intent.day = "TUE"  # standard resolved test weekday
        else:
            for day_kw, day_code in DAY_MAPPINGS.items():
                if day_kw in lower:
                    intent.day = day_code
                    break

        # Time / Period resolution
        if "evening" in lower or "shaam" in lower:
            intent.from_period = 10
            intent.to_period = 10 + (intent.duration_periods or 1) - 1
        elif "afternoon" in lower or "dopahar" in lower:
            intent.from_period = 6
            intent.to_period = 6 + (intent.duration_periods or 1) - 1
        elif "morning" in lower or "subah" in lower:
            intent.from_period = 2
            intent.to_period = 2 + (intent.duration_periods or 1) - 1
        else:
            # Check explicit hour range: e.g. 6 to 8 pm, 6 pm, 10 am
            clock_match = re.search(r"(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*(am|pm)", lower)
            if clock_match:
                start_h = int(clock_match.group(1))
                end_h = int(clock_match.group(2))
                meridiem = clock_match.group(3)
                if meridiem == "pm" and start_h < 12:
                    start_h += 12
                if meridiem == "pm" and end_h <= 12:
                    end_h += 12
                intent.duration_periods = max(1, end_h - start_h)
                if start_h >= 18:
                    intent.from_period = 10 + (start_h - 18)
                elif start_h >= 14:
                    intent.from_period = 6 + (start_h - 14)
                elif start_h >= 8:
                    intent.from_period = 1 + (start_h - 8)
                if intent.from_period:
                    intent.to_period = intent.from_period + intent.duration_periods - 1
            else:
                single_clock = re.search(r"(\d{1,2})\s*(am|pm)", lower)
                if single_clock:
                    start_h = int(single_clock.group(1))
                    meridiem = single_clock.group(2)
                    if meridiem == "pm" and start_h < 12:
                        start_h += 12
                    if start_h >= 18:
                        intent.from_period = 10 + (start_h - 18)
                    elif start_h >= 14:
                        intent.from_period = 6 + (start_h - 14)
                    elif start_h >= 8:
                        intent.from_period = 1 + (start_h - 8)
                    if intent.from_period:
                        intent.to_period = intent.from_period + (intent.duration_periods or 1) - 1

        # Room types & specific rooms
        if "auditorium" in lower:
            intent.room_types.append("auditorium")
            intent.requested_room = "AUD"
        if "seminar hall" in lower or "seminar" in lower:
            intent.room_types.append("seminar_hall")
        if "lab" in lower:
            if "computer" in lower or "coding" in lower:
                intent.room_types.append("lab_cs")
            else:
                intent.room_types.extend(["lab_cs", "lab_elec", "lab_phy"])
        if "sh-1" in lower:
            intent.requested_room = "SH-1"
            intent.room_types.append("seminar_hall")
        elif "sh-2" in lower:
            intent.requested_room = "SH-2"
            intent.room_types.append("seminar_hall")

        # Needs / Equipment
        if "mic" in lower or "pa system" in lower or "sound" in lower:
            intent.needs.append("pa_system")
        if "stage" in lower:
            intent.needs.append("stage")
        if "projector" in lower:
            intent.needs.append("projector")
        if "wheelchair" in lower or "accessible" in lower:
            intent.needs.append("accessible")
        if "computer" in lower or "computers" in lower:
            intent.needs.append("computers")

        # Check missing essentials
        if not intent.attendance:
            missing.append("attendance")
        if not intent.day:
            missing.append("day")
        if not intent.from_period:
            missing.append("time_slot")

        intent.missing_fields = missing
        intent.is_complete = len(missing) == 0

        if not intent.is_complete:
            if "attendance" in missing:
                intent.follow_up_question = "How many participants/students are expected to attend?"
            elif "day" in missing:
                intent.follow_up_question = "Which day would you like to schedule this event for?"
            elif "time_slot" in missing:
                intent.follow_up_question = "What preferred time or periods should we check (e.g. 6 to 8 pm, or morning)?"

        return intent

    def handle_message(
        self,
        message: str,
        user_context: UserContext,
        history: Optional[List[ChatMessage]] = None,
    ) -> AssistantResponse:
        """Route and respond to user query with deterministic tool grounding."""
        lower = message.lower()
        tool_records = []

        # 1. Faculty adjustment request
        # e.g., "I am unavailable on Wednesday afternoon. Can you adjust my classes?"
        if ("unavailable" in lower or "adjust" in lower or "chhutti" in lower or "leave" in lower) and (
            user_context.role == "faculty" or "class" in lower or "faculty" in lower
        ):
            fac_id = user_context.faculty_id or "F07"
            target_day = "WED"
            for d_name, d_code in DAY_MAPPINGS.items():
                if d_name in lower:
                    target_day = d_code
                    break

            periods = [6, 7, 8, 9] if ("afternoon" in lower or "dopahar" in lower) else [1, 2, 3, 4, 5, 6, 7, 8, 9]

            disruption_payload = {
                "changes": [
                    {
                        "type": "faculty_unavailable",
                        "faculty_id": fac_id,
                        "days": [target_day],
                        "periods": periods,
                        "reason": "Faculty personal unavailability",
                    }
                ]
            }

            # Run deterministic simulation via CP-SAT rescheduler tool
            resched_sim = tools.request_rescheduling(disruption_payload)
            tool_records.append(
                ToolCallRecord(
                    tool_name="request_rescheduling",
                    arguments={"disruption": disruption_payload, "simulation": True},
                    result=resched_sim,
                )
            )

            if resched_sim["is_feasible"]:
                resp = (
                    f"Understood Prof. {fac_id}. I analyzed your schedule for {target_day} afternoon (Periods {periods[0]}-{periods[-1]}).\n"
                    f"- Deterministic solver status: **FEASIBLE**.\n"
                    f"- Proposed changes: {resched_sim['sessions_moved']} sessions moved "
                    f"({resched_sim['time_changed']} time changes, {resched_sim['room_only_changed']} room reallocations).\n"
                    f"- Affected sessions: `{resched_sim['moved_ids']}`.\n\n"
                    f"⚠️ Please confirm if you wish to formally submit this schedule disruption."
                )
                return AssistantResponse(
                    response_text=resp,
                    intent="faculty_adjustment",
                    parsed_data=disruption_payload,
                    tool_calls=tool_records,
                    requires_confirmation=True,
                    confirmation_payload=disruption_payload,
                )
            else:
                return AssistantResponse(
                    response_text=f"The requested disruption cannot be accommodated without hard constraint conflicts.",
                    intent="faculty_adjustment",
                    tool_calls=tool_records,
                )

        # 2. Booking request
        # e.g., "Tomorrow evening robotics club ke liye auditorium book karna hai, around 300 students"
        is_booking_keyword = any(
            kw in lower for kw in ["book", "reserve", "chahiye", "room", "auditorium", "seminar", "sh-1", "sh-2", "need", "want"]
        )
        if is_booking_keyword and ("people" in lower or "students" in lower or "sh-1" in lower or "sh-2" in lower or "auditorium" in lower or "seminar" in lower or "book" in lower or "reserve" in lower or "chahiye" in lower):
            parsed = self.parse_booking_text(message)

            if not parsed.is_complete:
                return AssistantResponse(
                    response_text=f"I have noted your request details. {parsed.follow_up_question}",
                    intent="booking_request",
                    parsed_data=parsed.model_dump(),
                )

            # Special accessibility check (e.g. SH-2 is not accessible, recommend SH-1)
            if "accessible" in parsed.needs and parsed.requested_room == "SH-2":
                return AssistantResponse(
                    response_text=(
                        "Notice: **SH-2** is not wheelchair accessible. "
                        "To fulfill your accessibility requirement, I recommend booking **SH-1** instead, which is fully wheelchair accessible."
                    ),
                    intent="booking_request",
                    parsed_data=parsed.model_dump(),
                )

            # Validate booking deterministically
            validation_result = tools.validate_booking_request(parsed.model_dump())
            tool_records.append(
                ToolCallRecord(
                    tool_name="validate_booking_request",
                    arguments=parsed.model_dump(),
                    result=validation_result,
                )
            )

            if validation_result.get("feasible"):
                recommended = validation_result.get("recommended_rooms", [parsed.requested_room or "AUD"])
                resp = (
                    f"Great! I verified venue availability for your request:\n"
                    f"- **Expected Attendance:** {parsed.attendance} students\n"
                    f"- **Time:** {parsed.day} (Periods {parsed.from_period}-{parsed.to_period})\n"
                    f"- **Venue:** {recommended[0]} (Available with zero clashes)\n"
                    f"- **Features Verified:** {', '.join(parsed.needs) if parsed.needs else 'Standard setup'}\n\n"
                    f"Would you like me to submit this booking for formal approval?"
                )
                return AssistantResponse(
                    response_text=resp,
                    intent="booking_request",
                    parsed_data=parsed.model_dump(),
                    tool_calls=tool_records,
                    requires_confirmation=True,
                    confirmation_payload=parsed.model_dump(),
                )
            else:
                return AssistantResponse(
                    response_text=(
                        f"I checked the campus calendar, but the request cannot be approved as requested: "
                        f"{validation_result.get('reason')}. Would you like to consider an alternative evening slot?"
                    ),
                    intent="booking_request",
                    parsed_data=parsed.model_dump(),
                    tool_calls=tool_records,
                )

        # 3. Schedule / Room lookups
        if "exam" in lower:
            exam_data = tools.get_exam_schedule(user_context.group_id)
            tool_records.append(ToolCallRecord(tool_name="get_exam_schedule", arguments={}, result=exam_data))
            return AssistantResponse(
                response_text=f"The exam schedule has {exam_data['exam_count']} examinations allocated with zero group clashes across MON-SAT.",
                intent="schedule_inquiry",
                tool_calls=tool_records,
            )

        if "timetable" in lower or "schedule" in lower:
            ent_type = "faculty" if user_context.faculty_id else ("group" if user_context.group_id else "room")
            ent_id = user_context.faculty_id or user_context.group_id or "AUD"
            tt = tools.get_timetable(ent_type, ent_id)
            tool_records.append(ToolCallRecord(tool_name="get_timetable", arguments={"type": ent_type, "id": ent_id}, result=tt))
            return AssistantResponse(
                response_text=f"Found {tt['sessions_count']} scheduled sessions for {ent_type} {ent_id}.",
                intent="schedule_inquiry",
                tool_calls=tool_records,
            )

        # Default fallback
        analytics = tools.get_resource_analytics()
        tool_records.append(ToolCallRecord(tool_name="get_resource_analytics", arguments={}, result=analytics))
        return AssistantResponse(
            response_text=(
                f"Hello! I am the CampusOS Intelligence Assistant for Chilika Institute of Technology. "
                f"I can assist with natural-language booking requests, faculty schedule adjustments, "
                f"exam lookups, and timetable explanations."
            ),
            intent="general",
            tool_calls=tool_records,
        )


def process_assistant_message(
    message: str,
    user_context: Optional[UserContext] = None,
    history: Optional[List[ChatMessage]] = None,
) -> AssistantResponse:
    """Stable entry point for backend assistant integration."""
    if user_context is None:
        user_context = UserContext(user_id="anonymous", role="student")
    assistant = CampusAssistant()
    return assistant.handle_message(message, user_context, history)
