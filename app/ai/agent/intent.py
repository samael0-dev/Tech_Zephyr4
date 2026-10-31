import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class IntentResult:
    intent_type: str  # policy_question, room_search, booking_create, booking_status, timetable_lookup, exam_lookup, conflict_explanation, dean_summary, reschedule_request, general_chat
    confidence: float
    entities: Dict[str, Any] = field(default_factory=dict)
    missing_slots: List[str] = field(default_factory=list)
    clarification_question: Optional[str] = None


DAY_MAP = {
    "monday": "MON", "somwar": "MON", "mon": "MON",
    "tuesday": "TUE", "mangalwar": "TUE", "tue": "TUE",
    "wednesday": "WED", "budhwar": "WED", "wed": "WED",
    "thursday": "THU", "guruwar": "THU", "veervar": "THU", "thu": "THU",
    "friday": "FRI", "shukrawar": "FRI", "fri": "FRI",
    "saturday": "SAT", "shaniwar": "SAT", "sat": "SAT",
}

ROOM_MAP = {
    "auditorium": "AUD", "aud": "AUD", "main hall": "AUD",
    "sh-1": "SH-1", "sh1": "SH-1", "seminar hall 1": "SH-1", "seminar hall": "SH-1",
    "sh-2": "SH-2", "sh2": "SH-2", "seminar hall 2": "SH-2",
    "oat": "OAT", "open air theatre": "OAT", "open-air theatre": "OAT",
    "cs-lab-1": "CS-LAB-1", "cs lab 1": "CS-LAB-1", "computer lab": "CS-LAB-1",
    "cs-lab-2": "CS-LAB-2", "cs lab 2": "CS-LAB-2",
    "elec-lab-1": "ELEC-LAB-1", "electrical lab": "ELEC-LAB-1",
    "ece-lab-1": "ECE-LAB-1", "electronics lab": "ECE-LAB-1",
    "phy-lab": "PHY-LAB", "physics lab": "PHY-LAB",
    "lh-1": "LH-1", "lh-2": "LH-2", "lh-3": "LH-3", "lh-4": "LH-4", "lh-5": "LH-5",
    "cr-101": "CR-101", "cr-102": "CR-102", "cr-103": "CR-103",
}


def extract_entities(text: str) -> Dict[str, Any]:
    """
    Extracts structured entities (rooms, days, periods, attendance, faculty, student groups)
    supporting English and Hinglish phrases.
    """
    lower = text.lower()
    entities: Dict[str, Any] = {}

    # 1. Day Extraction
    for name, code in DAY_MAP.items():
        if re.search(r"\b" + name + r"\b", lower):
            entities["day"] = code
            break
    if "today" in lower or "aaj" in lower:
        entities["day"] = "MON"
    elif "tomorrow" in lower or "kal" in lower:
        entities["day"] = "TUE"

    # 2. Room Extraction
    for alias, rid in ROOM_MAP.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", lower):
            entities["room_id"] = rid
            break

    # 3. Booking Request ID (e.g. BR-01, BR-07, BR-09)
    br_match = re.search(r"\b(BR-\d{1,2}[a-z]?)\b", text, re.IGNORECASE)
    if br_match:
        entities["booking_id"] = br_match.group(1).upper()

    # 4. Faculty ID (e.g. F01, F12, F19)
    fac_match = re.search(r"\b(F\d{2})\b", text, re.IGNORECASE)
    if fac_match:
        entities["faculty_id"] = fac_match.group(1).upper()

    # 5. Student Group (e.g. Y1-A, Y2-CSE, Y3-ECE)
    grp_match = re.search(r"\b(Y[1-3]-[A-D]|Y[2-3]-(?:CSE|ECE|ME|EE|CE))\b", text, re.IGNORECASE)
    if grp_match:
        entities["student_group"] = grp_match.group(1).upper()

    # 6. Course ID (e.g. CS201, MA101, PH101)
    crs_match = re.search(r"\b([A-Z]{2}\d{3})\b", text, re.IGNORECASE)
    if crs_match:
        entities["course_id"] = crs_match.group(1).upper()

    # 7. Attendance / Pax
    att_match = re.search(r"(\d{1,4})\s*(?:people|students|participants|pax|members|attendees|persons|log|capacity)", lower)
    if att_match:
        entities["attendance"] = int(att_match.group(1))
    else:
        # Fallback to general number check
        for match in re.finditer(r"\b(\d{2,4})\b", lower):
            val = int(match.group(1))
            if val > 15:
                entities["attendance"] = val
                break

    # 8. Period or Time Range
    # e.g., P1 to P3, period 10 to 12, P10-P12, 2 PM to 4 PM
    p_range_match = re.search(r"(?:period|p)\s*(\d{1,2})\s*(?:to|-)\s*(?:period|p)?\s*(\d{1,2})", lower)
    if p_range_match:
        p_start = int(p_range_match.group(1))
        p_end = int(p_range_match.group(2))
        if 1 <= p_start <= 13 and 1 <= p_end <= 13:
            entities["from_period"] = p_start
            entities["to_period"] = p_end
    if "from_period" not in entities:
        p_single_match = re.search(r"\b(?:period|p)\s*(\d{1,2})\b", lower)
        if p_single_match:
            p_val = int(p_single_match.group(1))
            entities["from_period"] = p_val
            entities["to_period"] = p_val

    # Time in hours: e.g. 2 pm to 4 pm -> P6 to P7 (P6=14, P7=15)
    pm_range = re.search(r"(\d{1,2})\s*(?:pm|am)?\s*(?:to|-)\s*(\d{1,2})\s*(pm|am)", lower)
    if pm_range and "from_period" not in entities:
        start_hr = int(pm_range.group(1))
        end_hr = int(pm_range.group(2))
        meridiem = pm_range.group(3)
        if meridiem == "pm" and end_hr < 12:
            end_hr += 12
        if meridiem == "pm" and start_hr < 12 and start_hr <= end_hr:
            start_hr += 12
        # Map 8:00 to P1, 14:00 to P6, 18:00 to P10
        if 8 <= start_hr <= 22:
            entities["from_period"] = max(1, min(13, start_hr - 7))
            entities["to_period"] = max(1, min(13, end_hr - 8))

    return entities


def classify_user_intent(message: str, current_role: str = "student") -> IntentResult:
    """
    Classifies the user's operational intent and detects missing required slots.
    """
    lower = message.lower()
    entities = extract_entities(message)

    # 1. Booking Status / Rejection reason query
    if any(k in lower for k in ["status", "why was", "kyun reject", "rejection reason", "decision reason"]) and ("br-" in lower or "booking" in lower or "request" in lower):
        return IntentResult(
            intent_type="booking_status",
            confidence=0.95,
            entities=entities,
            missing_slots=["booking_id"] if "booking_id" not in entities else [],
            clarification_question="Which booking request ID would you like me to inspect (e.g. BR-07, BR-09)?" if "booking_id" not in entities else None,
        )

    # 2. Dean's Operational Intelligence / Summary
    if any(k in lower for k in ["summarise campus", "underutilised", "dean dashboard", "campus summary", "bottleneck", "today's campus activities", "operational briefing"]):
        return IntentResult(
            intent_type="dean_summary",
            confidence=0.92,
            entities=entities,
        )

    # 3. Conflict / Scheduling Explanation
    if any(k in lower for k in ["why is", "why was a class", "explain conflict", "hard constraint", "violation", "why cs202", "why scheduled"]):
        return IntentResult(
            intent_type="conflict_explanation",
            confidence=0.90,
            entities=entities,
        )

    # 4. Room Availability Search
    if any(k in lower for k in ["available", "find room", "free room", "khali", "free", "check availability", "room available"]):
        missing = []
        if "day" not in entities:
            missing.append("day")
        return IntentResult(
            intent_type="room_search",
            confidence=0.88,
            entities=entities,
            missing_slots=missing,
            clarification_question="Which day would you like to check room availability for (e.g., Monday, Wednesday)?" if "day" not in entities else None,
        )

    # 5. Booking Creation / Request
    if re.search(r"\b(book|reserve|chahiye|need the auditorium|need sh-1|host event)\b", lower):
        missing = []
        if "day" not in entities:
            missing.append("day")
        if "from_period" not in entities:
            missing.append("time_period")
        if "attendance" not in entities:
            missing.append("attendance")

        clarification = None
        if "day" in missing:
            clarification = "On which day of the week do you need the venue?"
        elif "time_period" in missing:
            clarification = "What time or period range do you require the venue for (e.g., 2 PM to 5 PM, or periods P10 to P12)?"
        elif "attendance" in missing:
            clarification = "How many participants are expected to attend?"

        return IntentResult(
            intent_type="booking_create",
            confidence=0.89,
            entities=entities,
            missing_slots=missing,
            clarification_question=clarification,
        )

    # 6. Rescheduling / Disruption Request
    if any(k in lower for k in ["reschedule", "disruption", "faculty leave", "faculty unavailable", "sick leave", "room closed"]):
        return IntentResult(
            intent_type="reschedule_request",
            confidence=0.88,
            entities=entities,
        )

    # 7. Timetable Lookup
    if any(k in lower for k in ["timetable", "schedule", "classes for", "when is class", "teaching schedule", "batao timetable"]):
        return IntentResult(
            intent_type="timetable_lookup",
            confidence=0.85,
            entities=entities,
        )

    # 8. Midsem Exam Lookup
    if any(k in lower for k in ["exam", "midsem", "pariksha", "exam slot"]):
        return IntentResult(
            intent_type="exam_lookup",
            confidence=0.85,
            entities=entities,
        )

    # 9. Institutional Policy / RAG Query
    if any(k in lower for k in ["policy", "rule", "regulations", "lunch", "limit", "hours", "capacity", "fest week", "spectra", "priority", "allowed"]):
        return IntentResult(
            intent_type="policy_question",
            confidence=0.82,
            entities=entities,
        )

    # Default to general policy / operational assistance
    return IntentResult(
        intent_type="policy_question",
        confidence=0.60,
        entities=entities,
    )
