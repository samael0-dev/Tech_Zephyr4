"""Campus operational query service for CITRIX.

Provides clean, parameterized access to Neon PostgreSQL for FastAPI endpoints,
CP-SAT scheduling pipelines, and AI agent tools.
"""

import json
import re
from typing import Any, Dict, List, Optional
from api.database import execute_query


def _escape_sql_str(val: str) -> str:
    return val.replace("'", "''")


class CampusService:
    """Service providing query and transaction interfaces over CITRIX PostgreSQL database."""

    # --------------------------------------------------------------------------
    # Infrastructure: Rooms and Buildings
    # --------------------------------------------------------------------------

    @staticmethod
    def get_buildings() -> List[Dict[str, Any]]:
        """Get all campus buildings with associated room counts."""
        sql = """
        SELECT b.id, b.name, b.code, b.has_lift, COUNT(r.id) as room_count
        FROM buildings b
        LEFT JOIN rooms r ON r.building_id = b.id
        GROUP BY b.id, b.name, b.code, b.has_lift
        ORDER BY b.name;
        """
        return execute_query(sql)

    @staticmethod
    def get_room_details(room_id: str) -> Optional[Dict[str, Any]]:
        """Get full details of a specific room."""
        clean_id = _escape_sql_str(room_id.strip().upper())
        sql = f"""
        SELECT r.id, r.name, r.type, r.capacity, r.exam_capacity, r.accessible,
               r.features, r.allowed_uses, b.id as building_id, b.name as building_name, b.has_lift
        FROM rooms r
        JOIN buildings b ON b.id = r.building_id
        WHERE UPPER(r.id) = '{clean_id}' OR UPPER(r.name) = '{clean_id}';
        """
        rows = execute_query(sql)
        return rows[0] if rows else None

    @staticmethod
    def get_available_rooms(
        day: str,
        period: int,
        room_type: Optional[str] = None,
        min_capacity: Optional[int] = None,
        needs_accessible: bool = False,
        required_features: Optional[List[str]] = None,
        schedule_id: str = "cit-baseline-schedule",
    ) -> List[Dict[str, Any]]:
        """Query rooms free from timetable sessions, maintenance, and approved bookings."""
        clean_day = _escape_sql_str(day.strip().upper()[:3])
        clean_sched = _escape_sql_str(schedule_id)

        conditions = ["1=1"]
        if room_type:
            clean_type = _escape_sql_str(room_type.strip().lower())
            conditions.append(f"LOWER(r.type) = '{clean_type}'")
        if min_capacity is not None and min_capacity > 0:
            conditions.append(f"r.capacity >= {int(min_capacity)}")
        if needs_accessible:
            conditions.append("r.accessible = TRUE")
        if required_features:
            for feat in required_features:
                clean_feat = _escape_sql_str(feat.strip().lower())
                conditions.append(f"r.features::text ILIKE '%{clean_feat}%'")

        where_clause = " AND ".join(conditions)

        sql = f"""
        SELECT r.id, r.name, r.type, r.capacity, r.exam_capacity, r.accessible, r.features,
               b.name as building_name, b.has_lift
        FROM rooms r
        JOIN buildings b ON b.id = r.building_id
        WHERE {where_clause}
          -- Exclude rooms occupied by regular timetable sessions
          AND r.id NOT IN (
              SELECT te.room_id
              FROM timetable_entries te
              WHERE te.schedule_id = '{clean_sched}'
                AND te.day = '{clean_day}'
                AND {int(period)} BETWEEN te.start_period AND te.end_period
          )
          -- Exclude rooms undergoing maintenance/repair
          AND r.id NOT IN (
              SELECT ru.room_id
              FROM room_unavailabilities ru
              WHERE ru.day = '{clean_day}'
                AND ru.period = {int(period)}
          )
          -- Exclude rooms assigned to approved fest/event bookings
          AND r.id NOT IN (
              SELECT br.assigned_room_id
              FROM booking_requests br
              WHERE br.status = 'approved'
                AND br.assigned_room_id IS NOT NULL
                AND br.assigned_day = '{clean_day}'
                AND {int(period)} BETWEEN br.assigned_start_period AND br.assigned_end_period
          )
        ORDER BY r.capacity ASC, r.id ASC;
        """
        return execute_query(sql)

    @staticmethod
    def search_rooms(
        feature: Optional[str] = None,
        building_id: Optional[str] = None,
        room_type: Optional[str] = None,
        min_capacity: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Filter rooms by building, type, feature, and minimum capacity."""
        conditions = ["1=1"]
        if feature:
            clean_feat = _escape_sql_str(feature.strip().lower())
            conditions.append(f"r.features::text ILIKE '%{clean_feat}%'")
        if building_id:
            clean_b = _escape_sql_str(building_id.strip().lower())
            conditions.append(f"(LOWER(b.id) = '{clean_b}' OR LOWER(b.name) ILIKE '%{clean_b}%')")
        if room_type:
            clean_type = _escape_sql_str(room_type.strip().lower())
            conditions.append(f"LOWER(r.type) = '{clean_type}'")
        if min_capacity:
            conditions.append(f"r.capacity >= {int(min_capacity)}")

        sql = f"""
        SELECT r.id, r.name, r.type, r.capacity, r.exam_capacity, r.accessible, r.features,
               b.id as building_id, b.name as building_name
        FROM rooms r
        JOIN buildings b ON b.id = r.building_id
        WHERE {" AND ".join(conditions)}
        ORDER BY r.capacity DESC;
        """
        return execute_query(sql)

    # --------------------------------------------------------------------------
    # Timetables: Faculty, Rooms, and Student Groups
    # --------------------------------------------------------------------------

    @staticmethod
    def get_faculty_timetable(
        faculty_id: str,
        day: Optional[str] = None,
        schedule_id: str = "cit-baseline-schedule",
    ) -> List[Dict[str, Any]]:
        """Retrieve teaching schedule for a specific faculty member."""
        clean_fac = _escape_sql_str(faculty_id.strip().upper())
        clean_sched = _escape_sql_str(schedule_id)

        day_filter = ""
        if day:
            clean_day = _escape_sql_str(day.strip().upper()[:3])
            day_filter = f"AND te.day = '{clean_day}'"

        sql = f"""
        SELECT te.day, te.start_period, te.end_period, te.room_id, r.name as room_name,
               s.id as session_id, s.kind, s.size, c.id as course_id, c.title as course_title,
               fp.id as faculty_id, fp.name as faculty_name,
               ARRAY_AGG(sg.group_id ORDER BY sg.group_id) as student_groups
        FROM timetable_entries te
        JOIN sessions s ON s.id = te.session_id
        JOIN courses c ON c.id = s.course_id
        JOIN faculty_profiles fp ON fp.id = s.faculty_id
        JOIN rooms r ON r.id = te.room_id
        LEFT JOIN session_groups sg ON sg.session_id = s.id
        WHERE te.schedule_id = '{clean_sched}'
          AND (UPPER(fp.id) = '{clean_fac}' OR UPPER(fp.name) ILIKE '%{clean_fac}%')
          {day_filter}
        GROUP BY te.day, te.start_period, te.end_period, te.room_id, r.name, s.id, s.kind, s.size, c.id, c.title, fp.id, fp.name
        ORDER BY CASE te.day 
            WHEN 'MON' THEN 1 WHEN 'TUE' THEN 2 WHEN 'WED' THEN 3 WHEN 'THU' THEN 4 WHEN 'FRI' THEN 5 ELSE 6 END,
            te.start_period;
        """
        return execute_query(sql)

    @staticmethod
    def get_room_schedule(
        room_id: str,
        day: Optional[str] = None,
        schedule_id: str = "cit-baseline-schedule",
    ) -> List[Dict[str, Any]]:
        """Retrieve all scheduled classes and bookings for a specific room."""
        clean_room = _escape_sql_str(room_id.strip().upper())
        clean_sched = _escape_sql_str(schedule_id)

        day_filter = ""
        if day:
            clean_day = _escape_sql_str(day.strip().upper()[:3])
            day_filter = f"AND te.day = '{clean_day}'"

        sql = f"""
        SELECT te.day, te.start_period, te.end_period, te.room_id,
               s.id as session_id, s.kind, s.size, c.id as course_id, c.title as course_title,
               fp.id as faculty_id, fp.name as faculty_name,
               ARRAY_AGG(sg.group_id ORDER BY sg.group_id) as student_groups
        FROM timetable_entries te
        JOIN sessions s ON s.id = te.session_id
        JOIN courses c ON c.id = s.course_id
        JOIN faculty_profiles fp ON fp.id = s.faculty_id
        LEFT JOIN session_groups sg ON sg.session_id = s.id
        WHERE te.schedule_id = '{clean_sched}'
          AND UPPER(te.room_id) = '{clean_room}'
          {day_filter}
        GROUP BY te.day, te.start_period, te.end_period, te.room_id, s.id, s.kind, s.size, c.id, c.title, fp.id, fp.name
        ORDER BY CASE te.day 
            WHEN 'MON' THEN 1 WHEN 'TUE' THEN 2 WHEN 'WED' THEN 3 WHEN 'THU' THEN 4 WHEN 'FRI' THEN 5 ELSE 6 END,
            te.start_period;
        """
        return execute_query(sql)

    @staticmethod
    def get_student_group_timetable(
        group_id: str,
        day: Optional[str] = None,
        schedule_id: str = "cit-baseline-schedule",
    ) -> List[Dict[str, Any]]:
        """Retrieve all classes scheduled for a specific student cohort."""
        clean_group = _escape_sql_str(group_id.strip().upper())
        clean_sched = _escape_sql_str(schedule_id)

        day_filter = ""
        if day:
            clean_day = _escape_sql_str(day.strip().upper()[:3])
            day_filter = f"AND te.day = '{clean_day}'"

        sql = f"""
        SELECT te.day, te.start_period, te.end_period, te.room_id, r.name as room_name,
               s.id as session_id, s.kind, c.id as course_id, c.title as course_title,
               fp.id as faculty_id, fp.name as faculty_name
        FROM timetable_entries te
        JOIN sessions s ON s.id = te.session_id
        JOIN session_groups sg ON sg.session_id = s.id
        JOIN courses c ON c.id = s.course_id
        JOIN faculty_profiles fp ON fp.id = s.faculty_id
        JOIN rooms r ON r.id = te.room_id
        WHERE te.schedule_id = '{clean_sched}'
          AND UPPER(sg.group_id) = '{clean_group}'
          {day_filter}
        ORDER BY CASE te.day 
            WHEN 'MON' THEN 1 WHEN 'TUE' THEN 2 WHEN 'WED' THEN 3 WHEN 'THU' THEN 4 WHEN 'FRI' THEN 5 ELSE 6 END,
            te.start_period;
        """
        return execute_query(sql)

    # --------------------------------------------------------------------------
    # Bookings and Events
    # --------------------------------------------------------------------------

    @staticmethod
    def get_pending_bookings() -> List[Dict[str, Any]]:
        """Retrieve all booking requests currently pending administrative review."""
        sql = """
        SELECT br.id, br.title, br.requester, br.role, br.effective_category,
               br.attendance, br.duration_periods, br.windows, br.room_types, br.needs,
               br.requested_room, br.submitted_at
        FROM booking_requests br
        WHERE br.status = 'pending'
        ORDER BY br.submitted_at ASC;
        """
        return execute_query(sql)

    @staticmethod
    def get_booking_details(request_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve details of a booking request including decisions and cancellations."""
        clean_id = _escape_sql_str(request_id.strip().upper())
        sql = f"""
        SELECT br.id, br.title, br.requester, br.role, br.department_code,
               br.requested_category, br.effective_category, br.attendance,
               br.duration_periods, br.windows, br.room_types, br.needs,
               br.status, br.assigned_room_id, br.assigned_day, br.assigned_start_period,
               br.assigned_end_period, br.decision_reason,
               bc.cancelled_at, bc.cancelled_by, bc.reason as cancellation_reason
        FROM booking_requests br
        LEFT JOIN booking_cancellations bc ON bc.request_id = br.id
        WHERE UPPER(br.id) = '{clean_id}';
        """
        rows = execute_query(sql)
        return rows[0] if rows else None

    # --------------------------------------------------------------------------
    # Examinations
    # --------------------------------------------------------------------------

    @staticmethod
    def get_exam_schedule(
        course_id: Optional[str] = None,
        group_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve scheduled examination slots and room allocations."""
        conditions = ["1=1"]
        if course_id:
            clean_c = _escape_sql_str(course_id.strip().upper())
            conditions.append(f"e.course_ids::text ILIKE '%{clean_c}%'")
        if group_id:
            clean_g = _escape_sql_str(group_id.strip().upper())
            conditions.append(f"e.groups::text ILIKE '%{clean_g}%'")

        sql = f"""
        SELECT e.id, e.size, e.duration_hours, e.course_ids, e.groups,
               e.scheduled_day, e.scheduled_session, es.start_time, es.end_time,
               ARRAY_AGG(era.room_id ORDER BY era.room_id) as allocated_rooms
        FROM exams e
        LEFT JOIN exam_sessions es ON es.id = e.scheduled_session
        LEFT JOIN exam_room_allocations era ON era.exam_id = e.id
        WHERE {" AND ".join(conditions)}
        GROUP BY e.id, e.size, e.duration_hours, e.course_ids, e.groups, e.scheduled_day, e.scheduled_session, es.start_time, es.end_time
        ORDER BY CASE e.scheduled_day 
            WHEN 'MON' THEN 1 WHEN 'TUE' THEN 2 WHEN 'WED' THEN 3 WHEN 'THU' THEN 4 WHEN 'FRI' THEN 5 ELSE 6 END,
            e.scheduled_session;
        """
        return execute_query(sql)
