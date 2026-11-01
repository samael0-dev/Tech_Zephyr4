import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from groq import Groq
from sqlalchemy.orm import Session

from app.models.canonical import Room

logger = logging.getLogger("citrix.nl_booking")

GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
]


def get_system_prompt() -> str:
    """Dynamically generates system prompt with live current date using datetime.now()."""
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    parso_str = (now + timedelta(days=2)).strftime("%Y-%m-%d")
    weekday_name = now.strftime("%A")

    return f"""You are an expert NLP parser for a university campus venue booking system.
Extract structured booking parameters from English or Hinglish text into a valid JSON object.
Return JSON with these exact keys:
- title: string (descriptive name of the event or class, e.g. "Physics Class", "Robotics Workshop", "Python Test")
- date: string (YYYY-MM-DD format. Today is {today_str} ({weekday_name}). "kal"/"tomorrow" is {tomorrow_str}, "parso" is {parso_str})
- start_time: string (HH:MM in 24hr format, e.g. "15:00" for 3 PM, "10:00" for 10 AM; default "09:00" if unspecified)
- end_time: string (HH:MM in 24hr format, e.g. "17:00" for 5 PM, "13:00" for 1 PM; default "10:00" if unspecified)
- capacity: integer (number of attendees, default 40 if unspecified)
- room_type: string (one of: "Classroom", "Computer Lab", "Seminar Hall", "Auditorium")
- accessible: boolean (true if accessible, wheelchair, or ground floor requested, otherwise false)
- purpose: string (brief description of purpose)

Output ONLY raw valid JSON, no markdown formatting, no code blocks."""


def _rule_based_fallback(text: str) -> Dict[str, Any]:
    """Robust fallback when LLM is offline, using datetime.now() dynamically."""
    lower = text.lower()
    now = datetime.now()
    
    # Title
    title = "Extracted Event"
    if "phy" in lower or "physics" in lower:
        title = "Physics Class"
    elif "robotics" in lower:
        title = "Robotics Workshop"
    elif "dance" in lower or "cultural" in lower:
        title = "Cultural Rehearsal"
    elif "python" in lower:
        title = "Python Lab Session"
    elif "workshop" in lower:
        title = "Student Workshop"
    elif "seminar" in lower:
        title = "Academic Seminar"
    
    # Dynamic Date calculation using datetime.now()
    target_date = now + timedelta(days=1)  # Default tomorrow
    if "today" in lower or "aaj" in lower:
        target_date = now
    elif "kal" in lower or "tomorrow" in lower:
        target_date = now + timedelta(days=1)
    elif "parso" in lower:
        target_date = now + timedelta(days=2)
    else:
        days_lookup = {
            "monday": 0, "somwar": 0,
            "tuesday": 1, "mangalwar": 1,
            "wednesday": 2, "budhwar": 2,
            "thursday": 3, "guruwar": 3, "veervar": 3,
            "friday": 4, "shukrawar": 4,
            "saturday": 5, "shaniwar": 5,
            "sunday": 6, "ravivar": 6,
        }
        for day_word, target_weekday in days_lookup.items():
            if day_word in lower:
                days_ahead = (target_weekday - now.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                target_date = now + timedelta(days=days_ahead)
                break
    
    date_str = target_date.strftime("%Y-%m-%d")
    
    # Time
    start_time = "09:00"
    end_time = "10:00"
    
    # Check "3 se 5" or "3 to 5"
    m_range = re.search(r"(\d{1,2})\s*(?:se|to|-)\s*(\d{1,2})", lower)
    if m_range:
        s_val = int(m_range.group(1))
        e_val = int(m_range.group(2))
        if s_val < 8:
            s_val += 12  # PM
        if e_val < 8:
            e_val += 12
        start_time = f"{s_val:02d}:00"
        end_time = f"{e_val:02d}:00"
    elif "10 am to 1 pm" in lower or "10 to 1" in lower:
        start_time = "10:00"
        end_time = "13:00"
    elif "evening" in lower:
        start_time = "17:00"
        end_time = "19:00"
        
    # Capacity
    cap = 40
    cap_match = re.search(r"(\d{2,4})\s*(?:log|people|seats|seat|students|attendees|pax|capacity)?", lower)
    if cap_match:
        cap = int(cap_match.group(1))
        
    # Room Type
    rtype = "Classroom"
    if "auditorium" in lower:
        rtype = "Auditorium"
    elif "seminar" in lower:
        rtype = "Seminar Hall"
    elif "lab" in lower or "computer" in lower or "python" in lower:
        rtype = "Computer Lab"
    elif "phy" in lower or "class" in lower:
        rtype = "Classroom"
        
    # Accessible
    accessible = any(k in lower for k in ["accessible", "wheelchair", "ground floor", "lift", "ramp"])
    
    return {
        "title": title,
        "date": date_str,
        "start_time": start_time,
        "end_time": end_time,
        "capacity": cap,
        "room_type": rtype,
        "accessible": accessible,
        "purpose": text.strip(),
    }


def parse_nl_booking(text: str, db: Session, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Parses natural language (English/Hinglish) text into structured booking parameters,
    supports multi-turn conversational context merging, detects missing info,
    generates interactive assistant replies, and fetches matching rooms from the database.
    """
    api_key = os.getenv("GROQ_API_KEY")
    parsed = None
    
    # Check if this is a follow-up with previous context
    user_prompt = text
    if context:
        user_prompt = f"Previous conversation state: {json.dumps(context)}\nUser new message: {text}"

    if api_key:
        client = Groq(api_key=api_key)
        for model_name in GROQ_MODELS:
            try:
                chat = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": get_system_prompt()},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=300,
                )
                raw = chat.choices[0].message.content.strip()
                clean = re.sub(r"^```json\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
                parsed = json.loads(clean)
                if parsed and isinstance(parsed, dict) and "date" in parsed:
                    break
            except Exception as e:
                logger.warning(f"Groq parse with {model_name} failed: {e}")
                continue

    if not parsed or not isinstance(parsed, dict) or not parsed.get("date"):
        parsed = _rule_based_fallback(text)

    # Multi-turn context merging
    if context:
        if not parsed.get("title") or parsed.get("title") == "Extracted Event":
            if context.get("title"):
                parsed["title"] = context.get("title")
        if not parsed.get("date") or parsed.get("date") == "2026-11-09":
            if context.get("date"):
                parsed["date"] = context.get("date")
        if not re.search(r"(\d{1,2})\s*(?:am|pm|baje|se|to|-|\:)", text.lower()):
            if context.get("startTime"):
                parsed["start_time"] = context.get("startTime")
            if context.get("endTime"):
                parsed["end_time"] = context.get("endTime")
        if not re.search(r"\b(\d{2,4})\b", text.lower()):
            if context.get("capacity"):
                parsed["capacity"] = context.get("capacity")
        if context.get("type") and (not parsed.get("room_type") or parsed.get("room_type") == "Classroom"):
            parsed["room_type"] = context.get("type")
        if context.get("accessible"):
            parsed["accessible"] = True

    # Standardize values using dynamic datetime.now()
    default_tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    title = parsed.get("title") or "Campus Venue Booking"
    date_val = parsed.get("date") or default_tomorrow
    start_time = parsed.get("start_time") or "09:00"
    end_time = parsed.get("end_time") or "10:00"
    capacity = int(parsed.get("capacity") or 40)
    rtype = parsed.get("room_type") or "Classroom"
    accessible = bool(parsed.get("accessible", False))
    purpose = parsed.get("purpose") or text

    # Missing fields detection
    combined_text = f"{context.get('rawText', '')} {text}".lower() if context else text.lower()
    missing_fields = []
    
    # Did user explicitly specify time?
    has_explicit_time = bool(re.search(r"(\d{1,2})\s*(?:am|pm|baje|se|to|-|\:)", combined_text))
    if not has_explicit_time and not (context and context.get("hasExplicitTime")):
        missing_fields.append("time")
        
    # Did user explicitly specify attendee count?
    has_explicit_cap = bool(re.search(r"\b(\d{2,4})\b", combined_text))
    if not has_explicit_cap and not (context and context.get("hasExplicitCap")):
        missing_fields.append("capacity")

    # Generate interactive assistant conversational reply
    is_complete = len(missing_fields) == 0
    if not is_complete:
        if "time" in missing_fields and "capacity" in missing_fields:
            reply = (
                f"Maine **'{title}'** on **{date_val}** note kar liya hai! ⏰ "
                f"Ye event kitne baje se kitne baje tak organize karna hai (e.g., 2 PM to 4 PM), "
                f"aur lagbhag kitne log attend karenge?"
            )
        elif "time" in missing_fields:
            reply = (
                f"**'{title}'** ({capacity} attendees) ke liye timing specify karein: "
                f"kis samay se kis samay tak venue chahiye (e.g. 10 AM to 1 PM ya 3 PM to 5 PM)?"
            )
        else:
            reply = (
                f"**'{title}'** on **{date_val}** ({start_time} - {end_time}) schedule karne ke liye "
                f"lagbhag kitne students/attendees aayenge?"
            )
    else:
        access_str = "♿ Wheelchair accessible required" if accessible else "Standard venue"
        reply = (
            f"✅ **Sabhi details extract ho gayi hain!**\n\n"
            f"- **Event:** {title}\n"
            f"- **Date:** {date_val}\n"
            f"- **Timing:** {start_time} - {end_time}\n"
            f"- **Expected Attendees:** {capacity}\n"
            f"- **Venue Type:** {rtype} ({access_str})\n\n"
            f"Neeche parameters check karein aur right column se available venue select karein."
        )

    # Query matching rooms from the database
    type_map = {
        "Classroom": ["classroom", "lecture_hall"],
        "Computer Lab": ["lab_cs"],
        "Seminar Hall": ["seminar_hall"],
        "Auditorium": ["auditorium"],
        "Physics Lab": ["lab_phy"],
    }
    target_db_types = type_map.get(rtype, ["classroom", "lecture_hall", "seminar_hall"])

    query = db.query(Room).filter(Room.capacity >= min(capacity, 30))
    if accessible:
        query = query.filter(Room.accessible == True)

    candidate_rooms = query.all()
    # Sort: exact type match first, then by capacity closeness
    type_matched = [r for r in candidate_rooms if r.type in target_db_types]
    ranked = type_matched if type_matched else candidate_rooms
    ranked.sort(key=lambda r: (abs(r.capacity - capacity), r.capacity))

    suggested = [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "type": r.type,
            "accessible": r.accessible,
        }
        for r in ranked[:4]
    ]

    valid_ui_types = ["Classroom", "Computer Lab", "Seminar Hall", "Auditorium"]
    ui_type = rtype if rtype in valid_ui_types else "Classroom"

    return {
        "parsed": {
            "title": title,
            "date": date_val,
            "startTime": start_time,
            "endTime": end_time,
            "capacity": capacity,
            "type": ui_type,
            "accessible": accessible,
            "purpose": purpose,
            "rawText": text,
            "hasExplicitTime": has_explicit_time or (context and context.get("hasExplicitTime")),
            "hasExplicitCap": has_explicit_cap or (context and context.get("hasExplicitCap")),
        },
        "suggestedRooms": suggested,
        "confidence": 0.94 if is_complete else 0.86,
        "missing_fields": missing_fields,
        "is_complete": is_complete,
        "reply": reply,
    }
