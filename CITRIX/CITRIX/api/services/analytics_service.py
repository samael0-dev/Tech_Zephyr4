"""Campus analytics and operational monitoring service for CITRIX.

Computes room and building utilization, space efficiency metrics,
and scheduling statistics directly from Neon PostgreSQL.
"""

from typing import Any, Dict, List, Optional
from api.database import execute_query


class AnalyticsService:
    """Service for computing campus operational utilization and demand analytics."""

    TEACHING_SLOTS_PER_WEEK = 45  # 5 days (MON-FRI) * 9 teaching periods (P1-P9)

    @staticmethod
    def get_room_utilisation(schedule_id: str = "cit-baseline-schedule") -> List[Dict[str, Any]]:
        """Compute weekly utilization percentage for all 27 campus rooms."""
        clean_sched = schedule_id.replace("'", "''")
        sql = f"""
        WITH room_usage AS (
            SELECT te.room_id,
                   COUNT(te.id) as sessions_count,
                   SUM(te.end_period - te.start_period + 1) as occupied_periods
            FROM timetable_entries te
            WHERE te.schedule_id = '{clean_sched}'
            GROUP BY te.room_id
        )
        SELECT r.id as room_id,
               r.name as room_name,
               r.type as room_type,
               r.capacity,
               b.name as building_name,
               COALESCE(ru.sessions_count, 0) as session_count,
               COALESCE(ru.occupied_periods, 0) as occupied_slots,
               {AnalyticsService.TEACHING_SLOTS_PER_WEEK} as total_slots,
               ROUND((COALESCE(ru.occupied_periods, 0)::numeric / {AnalyticsService.TEACHING_SLOTS_PER_WEEK}) * 100, 2) as utilisation_pct
        FROM rooms r
        JOIN buildings b ON b.id = r.building_id
        LEFT JOIN room_usage ru ON ru.room_id = r.id
        ORDER BY utilisation_pct DESC, r.capacity DESC;
        """
        return execute_query(sql)

    @staticmethod
    def get_building_utilisation(schedule_id: str = "cit-baseline-schedule") -> List[Dict[str, Any]]:
        """Compute aggregate weekly utilization ranked by building."""
        clean_sched = schedule_id.replace("'", "''")
        sql = f"""
        WITH room_usage AS (
            SELECT te.room_id,
                   SUM(te.end_period - te.start_period + 1) as occupied_periods
            FROM timetable_entries te
            WHERE te.schedule_id = '{clean_sched}'
            GROUP BY te.room_id
        ),
        building_stats AS (
            SELECT b.id as building_id,
                   b.name as building_name,
                   b.has_lift,
                   COUNT(r.id) as room_count,
                   SUM(r.capacity) as total_capacity,
                   COUNT(r.id) * {AnalyticsService.TEACHING_SLOTS_PER_WEEK} as building_total_slots,
                   SUM(COALESCE(ru.occupied_periods, 0)) as building_occupied_slots
            FROM buildings b
            JOIN rooms r ON r.building_id = b.id
            LEFT JOIN room_usage ru ON ru.room_id = r.id
            GROUP BY b.id, b.name, b.has_lift
        )
        SELECT building_id,
               building_name,
               has_lift,
               room_count,
               total_capacity,
               building_occupied_slots as occupied_slots,
               building_total_slots as total_slots,
               ROUND((building_occupied_slots::numeric / NULLIF(building_total_slots, 0)) * 100, 2) as utilisation_pct
        FROM building_stats
        ORDER BY utilisation_pct DESC;
        """
        return execute_query(sql)

    @staticmethod
    def get_scheduling_summary(schedule_id: str = "cit-baseline-schedule") -> Dict[str, Any]:
        """Get high-level operational statistics for the active schedule."""
        clean_sched = schedule_id.replace("'", "''")
        sql = f"""
        SELECT s.id, s.name, s.status, s.hard_violations_count, s.soft_penalty_total,
               s.solver_runtime_seconds,
               (SELECT COUNT(*) FROM timetable_entries WHERE schedule_id = s.id) as scheduled_sessions,
               (SELECT COUNT(*) FROM timetable_entries WHERE schedule_id = s.id AND is_overridden_for_fest = TRUE) as fest_overridden_sessions,
               (SELECT COUNT(*) FROM booking_requests WHERE status = 'approved') as approved_bookings,
               (SELECT COUNT(*) FROM exams WHERE scheduled_day IS NOT NULL) as scheduled_exams
        FROM schedules s
        WHERE s.id = '{clean_sched}';
        """
        rows = execute_query(sql)
        return rows[0] if rows else {}
