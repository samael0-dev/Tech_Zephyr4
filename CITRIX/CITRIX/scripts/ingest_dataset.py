"""Repeatable and Idempotent Ingestion Pipeline for CITRIX.

Ingests the canonical starter pack (cit_public.json), schedule exports,
and campus knowledge documents into Neon PostgreSQL using batched multi-row statements.
"""

import json
import os
import re
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import get_engine, query_neon_http, test_connection

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "CrunchWeek_StarterPack", "data")
DATA_FILE = os.path.join(DATA_DIR, "cit_public.json")
EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "exports")
SCHEDULE_FILE = os.path.join(EXPORTS_DIR, "schedule.json")
REPORT_FILE = os.path.join(EXPORTS_DIR, "last_validation_report.json")
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sql_quote(val: Any) -> str:
    """Safely format values for SQL queries."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        dumped = json.dumps(val)
        escaped = dumped.replace("'", "''")
        return f"'{escaped}'::jsonb"
    if isinstance(val, datetime):
        return f"'{val.isoformat()}'::timestamptz"
    # String
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


class DatasetIngester:
    def __init__(self):
        self.stats = {
            "processed": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0,
        }
        conn_res = test_connection()
        if not conn_res.get("success"):
            raise ConnectionError(f"Cannot connect to database: {conn_res.get('error')}")
        self.transport = conn_res.get("transport", "")
        self.is_https = "HTTPS" in self.transport
        print(f"[INGESTER] Connected via {self.transport}")

    def execute_sql(self, sql: str) -> None:
        """Execute a single SQL command with error handling."""
        self.stats["processed"] += 1
        try:
            if self.is_https:
                query_neon_http(sql.strip())
            else:
                from sqlalchemy import text
                engine = get_engine()
                with engine.begin() as conn:
                    conn.execute(text(sql))
            self.stats["inserted"] += 1
        except Exception as e:
            self.stats["failed"] += 1
            print(f"[SQL ERROR] Query failed: {sql[:120]}... Error: {e}")
            raise e

    def execute_batch_insert(self, table: str, columns: List[str], rows: List[List[Any]], on_conflict: str, batch_size: int = 50) -> None:
        """Execute batched multi-row INSERTs for high performance."""
        if not rows:
            return

        col_names = ", ".join(columns)
        for i in range(0, len(rows), batch_size):
            chunk = rows[i:i + batch_size]
            val_clauses = []
            for row in chunk:
                formatted_vals = [sql_quote(v) for v in row]
                val_clauses.append(f"({', '.join(formatted_vals)})")
            
            sql = f"""
            INSERT INTO {table} ({col_names})
            VALUES
                {', '.join(val_clauses)}
            {on_conflict};
            """
            self.execute_sql(sql)

    def slugify(self, text: str) -> str:
        s = re.sub(r"[^\w\s-]", "", text).strip().lower()
        return re.sub(r"[-\s]+", "-", s)

    def run(self):
        print("=" * 70)
        print("STARTING CITRIX REPEATABLE DATASET INGESTION")
        print("=" * 70)

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            dataset = json.load(f)

        schedule_data = {}
        if os.path.exists(SCHEDULE_FILE):
            with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
                schedule_data = json.load(f)

        validation_report = {}
        if os.path.exists(REPORT_FILE):
            with open(REPORT_FILE, "r", encoding="utf-8") as f:
                validation_report = json.load(f)

        # 1. Ingest Roles
        self.ingest_roles(dataset)

        # 2. Ingest Buildings
        self.ingest_buildings(dataset)

        # 3. Ingest Departments
        self.ingest_departments(dataset)

        # 4. Ingest Users and UserRoles
        self.ingest_users(dataset)

        # 5. Ingest Faculty and Unavailabilities
        self.ingest_faculty(dataset)

        # 6. Ingest Student Groups
        self.ingest_student_groups(dataset)

        # 7. Ingest Academic Calendar (Terms & Periods)
        self.ingest_academic_calendar(dataset)

        # 8. Ingest Courses
        self.ingest_courses(dataset)

        # 9. Ingest Rooms and Unavailabilities
        self.ingest_rooms(dataset)

        # 10. Ingest Sessions and SessionGroups
        self.ingest_sessions(dataset)

        # 11. Ingest Event Categories
        self.ingest_event_categories()

        # 12. Ingest Booking Requests and Cancellations
        self.ingest_bookings(dataset, schedule_data)

        # 13. Ingest Exams, Exam Sessions, and Room Allocations
        self.ingest_exams(dataset, schedule_data)

        # 14. Ingest Master Baseline Schedule and Timetable Entries
        self.ingest_schedule(dataset, schedule_data, validation_report)

        # 15. Ingest Knowledge Documents and Chunks (RAG)
        self.ingest_knowledge_base()

        # Print Final Ingestion Summary
        self.print_summary()

    def ingest_roles(self, data: dict):
        print("[INGEST] Ingesting Roles...")
        roles = [
            ["admin", "Institute Administration", "Institute executive administration and operations", "institute_event"],
            ["faculty", "Faculty Member", "Academic teaching and research faculty", "guest_lecture"],
            ["department_coordinator", "Department Coordinator", "Departmental timetable coordinator", "department_event"],
            ["club", "Student Club / Society", "Recognized student campus club", "club_event"],
            ["dean", "Dean of Academic Affairs", "Executive academic oversight and approvals", "institute_event"],
            ["hod", "Head of Department", "Academic department head", "department_event"],
            ["student", "Student", "Undergraduate and postgraduate student", None],
        ]
        self.execute_batch_insert(
            "roles",
            ["id", "name", "description", "category_cap"],
            roles,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category_cap = EXCLUDED.category_cap"
        )

    def ingest_buildings(self, data: dict):
        print("[INGEST] Ingesting Buildings...")
        building_names = {r["building"] for r in data.get("rooms", [])}
        rows = []
        for b_name in sorted(building_names):
            b_id = self.slugify(b_name)
            has_lift = "no lift" not in b_name.lower()
            rows.append([b_id, b_name, b_id[:8].upper(), has_lift])

        self.execute_batch_insert(
            "buildings",
            ["id", "name", "code", "has_lift"],
            rows,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, has_lift = EXCLUDED.has_lift"
        )

    def ingest_departments(self, data: dict):
        print("[INGEST] Ingesting Departments...")
        dep_map = {
            "ADMIN": ("Institute Administration", "admin-block"),
            "CE": ("Civil Engineering", "civil-building"),
            "COMMON": ("First Year Common Curriculum", "academic-block-a-ground-floor"),
            "CSE": ("Computer Science & Engineering", "cse-building"),
            "ECE": ("Electronics & Communication Engineering", "ee-ece-building"),
            "EE": ("Electrical Engineering", "ee-ece-building"),
            "HSS": ("Humanities and Social Sciences", "academic-block-b-2nd-floor-no-lift"),
            "MA": ("Mathematics", "science-block"),
            "ME": ("Mechanical Engineering", "workshop-shed"),
            "PH": ("Physics", "science-block"),
        }
        rows = [[code, name, b_slug] for code, (name, b_slug) in dep_map.items()]
        self.execute_batch_insert(
            "departments",
            ["code", "name", "building_id"],
            rows,
            "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, building_id = EXCLUDED.building_id"
        )

    def ingest_users(self, data: dict):
        print("[INGEST] Ingesting Users and Roles...")
        users = []
        user_roles = []

        # Faculty users
        for f in data.get("faculty", []):
            u_id = f["id"]
            email = f"{u_id.lower()}@cit.ac.in"
            users.append([u_id, email, f["name"], f["department"], True])
            user_roles.append([u_id, "faculty"])

        # Special users
        special = [
            ("admin_spectra", "spectra@cit.ac.in", "Spectra Core Team", "ADMIN", "admin"),
            ("dean_academics", "dean.academics@cit.ac.in", "Dean of Academic Affairs", "ADMIN", "dean"),
            ("hod_cse", "hod.cse@cit.ac.in", "HOD Computer Science", "CSE", "hod"),
            ("club_robotics", "robotics.club@cit.ac.in", "Robotics Club", "COMMON", "club"),
            ("coord_ece", "coord.ece@cit.ac.in", "ECE Department Coordinator", "ECE", "department_coordinator"),
        ]
        for u_id, email, name, dep, role in special:
            users.append([u_id, email, name, dep, True])
            user_roles.append([u_id, role])

        self.execute_batch_insert(
            "users",
            ["id", "email", "full_name", "department_code", "is_active"],
            users,
            "ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, department_code = EXCLUDED.department_code"
        )
        self.execute_batch_insert(
            "user_roles",
            ["user_id", "role_id"],
            user_roles,
            "ON CONFLICT (user_id, role_id) DO NOTHING"
        )

    def ingest_faculty(self, data: dict):
        print("[INGEST] Ingesting Faculty Profiles and Unavailabilities...")
        fac_rows = []
        unavail_rows = []

        for f in data.get("faculty", []):
            f_id = f["id"]
            fac_rows.append([
                f_id, f_id, f["name"], f["department"],
                f.get("max_hours_per_day", 4),
                f.get("needs_accessible", False),
                f.get("preferences", []),
            ])
            for u in f.get("unavailable", []):
                day = u["day"]
                reason = u.get("reason", "Department Commitment")
                for period in u.get("periods", []):
                    unavail_rows.append([f_id, day, period, reason, True])

        self.execute_batch_insert(
            "faculty_profiles",
            ["id", "user_id", "name", "department_code", "max_hours_per_day", "needs_accessible", "preferences"],
            fac_rows,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, department_code = EXCLUDED.department_code, max_hours_per_day = EXCLUDED.max_hours_per_day, needs_accessible = EXCLUDED.needs_accessible, preferences = EXCLUDED.preferences, updated_at = NOW()"
        )
        self.execute_batch_insert(
            "faculty_unavailabilities",
            ["faculty_id", "day", "period", "reason", "is_permanent"],
            unavail_rows,
            "ON CONFLICT (faculty_id, day, period) DO UPDATE SET reason = EXCLUDED.reason"
        )

    def ingest_student_groups(self, data: dict):
        print("[INGEST] Ingesting Student Groups...")
        rows = [
            [g["id"], g["name"], g["year"], g["department"], g["size"], g.get("needs_accessible", False)]
            for g in data.get("student_groups", [])
        ]
        self.execute_batch_insert(
            "student_groups",
            ["id", "name", "year", "department_code", "size", "needs_accessible"],
            rows,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, year = EXCLUDED.year, department_code = EXCLUDED.department_code, size = EXCLUDED.size, needs_accessible = EXCLUDED.needs_accessible"
        )

    def ingest_academic_calendar(self, data: dict):
        print("[INGEST] Ingesting Academic Calendar...")
        cal = data.get("calendar", {})
        term_id = data.get("dataset_id", "cit-public-v1")
        fest_week_raw = cal.get("fest_week", 7)
        if isinstance(fest_week_raw, str):
            match = re.search(r"\d+", fest_week_raw)
            fest_week = int(match.group(0)) if match else 7
        else:
            fest_week = int(fest_week_raw)

        sql_term = f"""
        INSERT INTO academic_terms (id, name, is_current, fest_week_number, created_at)
        VALUES ({sql_quote(term_id)}, 'Spring Semester 2027', TRUE, {sql_quote(fest_week)}, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, fest_week_number = EXCLUDED.fest_week_number;
        """
        self.execute_sql(sql_term)

        event_only = set(cal.get("event_only_periods", [10, 11, 12, 13]))
        rows = []
        for p in cal.get("periods", []):
            p_num = p["id"]
            rows.append([
                p_num,
                p["start"] + ":00",
                p["end"] + ":00",
                p.get("teaching", True),
                p_num in event_only,
                f"Period {p_num} ({p['start']}-{p['end']})",
            ])
        self.execute_batch_insert(
            "academic_periods",
            ["period_number", "start_time", "end_time", "is_teaching", "is_event_only", "label"],
            rows,
            "ON CONFLICT (period_number) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_teaching = EXCLUDED.is_teaching, is_event_only = EXCLUDED.is_event_only, label = EXCLUDED.label"
        )

    def ingest_courses(self, data: dict):
        print("[INGEST] Ingesting Courses...")
        rows = [
            [
                c["id"], c.get("title", ""), c["department"], c.get("year"),
                c.get("lecture_hours", 0), c.get("tutorial_hours", 0), c.get("lab_blocks", 0)
            ]
            for c in data.get("courses", [])
        ]
        self.execute_batch_insert(
            "courses",
            ["id", "title", "department_code", "year", "lecture_hours", "tutorial_hours", "lab_blocks"],
            rows,
            "ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, department_code = EXCLUDED.department_code, year = EXCLUDED.year, lecture_hours = EXCLUDED.lecture_hours, tutorial_hours = EXCLUDED.tutorial_hours, lab_blocks = EXCLUDED.lab_blocks"
        )

    def ingest_rooms(self, data: dict):
        print("[INGEST] Ingesting Rooms and Unavailabilities...")
        rooms = []
        for r in data.get("rooms", []):
            cap = r["capacity"]
            rooms.append([
                r["id"], r["name"], self.slugify(r["building"]), r["type"],
                cap, cap // 2, r.get("accessible", False), r.get("features", []), r.get("allowed_uses", [])
            ])

        self.execute_batch_insert(
            "rooms",
            ["id", "name", "building_id", "type", "capacity", "exam_capacity", "accessible", "features", "allowed_uses"],
            rooms,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, building_id = EXCLUDED.building_id, type = EXCLUDED.type, capacity = EXCLUDED.capacity, exam_capacity = EXCLUDED.exam_capacity, accessible = EXCLUDED.accessible, features = EXCLUDED.features, allowed_uses = EXCLUDED.allowed_uses, updated_at = NOW()"
        )

        unavail_rows = []
        for u in data.get("room_unavailability", []):
            r_id = u["room_id"]
            day = u["day"]
            reason = u.get("reason", "Maintenance")
            for period in u.get("periods", []):
                unavail_rows.append([r_id, day, period, reason, True])

        self.execute_batch_insert(
            "room_unavailabilities",
            ["room_id", "day", "period", "reason", "is_permanent"],
            unavail_rows,
            "ON CONFLICT (room_id, day, period) DO UPDATE SET reason = EXCLUDED.reason"
        )

    def ingest_sessions(self, data: dict):
        print("[INGEST] Ingesting Sessions and Session Groups...")
        sessions = []
        session_groups = []

        for s in data.get("sessions", []):
            s_id = s["id"]
            fixed = s.get("fixed_slot")
            f_day = fixed.get("day") if fixed else None
            f_period = fixed.get("period") if fixed else None

            sessions.append([
                s_id, s["course_id"], s["kind"], s["faculty_id"],
                s["size"], s.get("duration", 1), s.get("room_types", []),
                s.get("needs_accessible", False), s.get("basket_slot"),
                f_day, f_period
            ])

            for g_id in s.get("groups", []):
                session_groups.append([s_id, g_id])

        self.execute_batch_insert(
            "sessions",
            ["id", "course_id", "kind", "faculty_id", "size", "duration", "room_types", "needs_accessible", "basket_slot", "fixed_slot_day", "fixed_slot_period"],
            sessions,
            "ON CONFLICT (id) DO UPDATE SET course_id = EXCLUDED.course_id, kind = EXCLUDED.kind, faculty_id = EXCLUDED.faculty_id, size = EXCLUDED.size, duration = EXCLUDED.duration, room_types = EXCLUDED.room_types, needs_accessible = EXCLUDED.needs_accessible, basket_slot = EXCLUDED.basket_slot, fixed_slot_day = EXCLUDED.fixed_slot_day, fixed_slot_period = EXCLUDED.fixed_slot_period"
        )
        self.execute_batch_insert(
            "session_groups",
            ["session_id", "group_id"],
            session_groups,
            "ON CONFLICT (session_id, group_id) DO NOTHING"
        )

    def ingest_event_categories(self):
        print("[INGEST] Ingesting Event Categories...")
        categories = [
            ["institute_event", "Institute Event", 5, 1],
            ["guest_lecture", "Guest Lecture", 4, 2],
            ["department_event", "Department Event", 3, 3],
            ["club_event", "Club Event", 2, 4],
        ]
        self.execute_batch_insert(
            "event_categories",
            ["code", "name", "weight", "priority_rank"],
            categories,
            "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, weight = EXCLUDED.weight, priority_rank = EXCLUDED.priority_rank"
        )

    def ingest_bookings(self, data: dict, sched: dict):
        print("[INGEST] Ingesting Booking Requests and Cancellations...")
        role_caps = data.get("role_category_cap", {})
        hierarchy = ["club_event", "department_event", "guest_lecture", "institute_event"]

        fest_bookings = {b["request_id"]: b for b in sched.get("fest_week", {}).get("bookings", [])}
        cancellations = {c["request_id"]: c for c in data.get("cancellations", [])}

        br_rows = []
        for br in data.get("booking_requests", []):
            b_id = br["id"]
            role = br["role"]
            req_cat = br["requested_category"]

            role_cap = role_caps.get(role, "club_event")
            req_rank = hierarchy.index(req_cat) if req_cat in hierarchy else 0
            cap_rank = hierarchy.index(role_cap) if role_cap in hierarchy else 0
            eff_cat = hierarchy[min(req_rank, cap_rank)]

            dur = br["duration_periods"]

            if b_id in cancellations:
                status = "cancelled"
                ass_room, ass_day, ass_start, ass_end = None, None, None, None
                reason = cancellations[b_id].get("note", "Cancelled by requester")
            elif b_id in fest_bookings:
                fb = fest_bookings[b_id]
                status = "approved"
                ass_room = fb.get("room_id")
                ass_day = fb.get("day")
                ass_start = fb.get("start_period")
                ass_end = ass_start + dur - 1 if ass_start else None
                reason = "Approved and scheduled during Fest Week"
            else:
                status = "pending"
                ass_room, ass_day, ass_start, ass_end, reason = None, None, None, None, None

            br_rows.append([
                b_id, br["submitted_at"], br["requester"], role, br.get("department"),
                req_cat, eff_cat, br["title"], br["attendance"], dur,
                br.get("windows", []), br.get("room_types", []), br.get("needs", []),
                br.get("requested_room"), br.get("mandatory_for_groups", []),
                br.get("series_id"), status, ass_room, ass_day, ass_start, ass_end, reason
            ])

        self.execute_batch_insert(
            "booking_requests",
            [
                "id", "submitted_at", "requester", "role", "department_code",
                "requested_category", "effective_category", "title", "attendance",
                "duration_periods", "windows", "room_types", "needs", "requested_room",
                "mandatory_for_groups", "series_id", "status", "assigned_room_id",
                "assigned_day", "assigned_start_period", "assigned_end_period", "decision_reason"
            ],
            br_rows,
            "ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, assigned_room_id = EXCLUDED.assigned_room_id, assigned_day = EXCLUDED.assigned_day, assigned_start_period = EXCLUDED.assigned_start_period, assigned_end_period = EXCLUDED.assigned_end_period, decision_reason = EXCLUDED.decision_reason, updated_at = NOW()"
        )

        c_rows = [
            [c["request_id"], c["cancelled_at"], c["by"], c.get("note", "")]
            for c in data.get("cancellations", [])
        ]
        self.execute_batch_insert(
            "booking_cancellations",
            ["request_id", "cancelled_at", "cancelled_by", "reason"],
            c_rows,
            "ON CONFLICT (request_id) DO UPDATE SET reason = EXCLUDED.reason"
        )

    def ingest_exams(self, data: dict, sched: dict):
        print("[INGEST] Ingesting Exams and Room Allocations...")
        exam_sessions = [
            ["AM", "Morning Examination Session", "09:00:00", "12:00:00"],
            ["PM", "Afternoon Examination Session", "14:00:00", "17:00:00"],
        ]
        self.execute_batch_insert(
            "exam_sessions",
            ["id", "name", "start_time", "end_time"],
            exam_sessions,
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time"
        )

        solved_exams = {e["exam_id"]: e for e in sched.get("exams", [])}
        exam_rows = []
        alloc_rows = []

        for ex in data.get("exams", []):
            ex_id = ex["id"]
            solved = solved_exams.get(ex_id, {})
            exam_rows.append([
                ex_id, "cit-public-v1", ex["size"], ex.get("duration_hours", 2),
                ex.get("course_ids", []), ex.get("groups", []),
                solved.get("day"), solved.get("session")
            ])
            for r_id in solved.get("rooms", []):
                alloc_rows.append([ex_id, r_id, 60])

        self.execute_batch_insert(
            "exams",
            ["id", "term_id", "size", "duration_hours", "course_ids", "groups", "scheduled_day", "scheduled_session"],
            exam_rows,
            "ON CONFLICT (id) DO UPDATE SET size = EXCLUDED.size, duration_hours = EXCLUDED.duration_hours, course_ids = EXCLUDED.course_ids, groups = EXCLUDED.groups, scheduled_day = EXCLUDED.scheduled_day, scheduled_session = EXCLUDED.scheduled_session"
        )
        self.execute_batch_insert(
            "exam_room_allocations",
            ["exam_id", "room_id", "allocated_seats"],
            alloc_rows,
            "ON CONFLICT (exam_id, room_id) DO NOTHING"
        )

    def ingest_schedule(self, data: dict, sched: dict, report: dict):
        print("[INGEST] Ingesting Baseline Schedule and Timetable Entries...")
        sched_id = "cit-baseline-schedule"
        dataset_id = data.get("dataset_id", "cit-public-v1")
        name = "CIT Master Baseline Schedule 2027"
        runtime = report.get("runtime_seconds", 3.25)
        soft_penalty = report.get("score") or report.get("total_penalty") or 0

        sql_sched = f"""
        INSERT INTO schedules (
            id, name, dataset_id, term_id, is_active, is_baseline,
            status, hard_violations_count, soft_penalty_total,
            solver_runtime_seconds, raw_schedule_json, created_at, created_by
        )
        VALUES (
            {sql_quote(sched_id)}, {sql_quote(name)}, {sql_quote(dataset_id)}, 'cit-public-v1',
            TRUE, TRUE, 'validated', 0, {sql_quote(soft_penalty)},
            {sql_quote(runtime)}, {sql_quote(sched)}, NOW(), 'CP-SAT Master Solver'
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            is_active = EXCLUDED.is_active,
            status = EXCLUDED.status,
            hard_violations_count = EXCLUDED.hard_violations_count,
            soft_penalty_total = EXCLUDED.soft_penalty_total,
            raw_schedule_json = EXCLUDED.raw_schedule_json;
        """
        self.execute_sql(sql_sched)

        sql_ver = f"""
        INSERT INTO schedule_versions (schedule_id, version_number, change_summary, disruption_payload, validation_report, created_at)
        VALUES ({sql_quote(sched_id)}, 1, 'Initial master baseline schedule generated by CP-SAT solver', NULL, {sql_quote(report)}, NOW())
        ON CONFLICT (schedule_id, version_number) DO UPDATE SET
            validation_report = EXCLUDED.validation_report;
        """
        self.execute_sql(sql_ver)

        session_durations = {s["id"]: s.get("duration", 1) for s in data.get("sessions", [])}
        overrides = {ov["session_id"]: ov for ov in sched.get("fest_week", {}).get("session_overrides", [])}

        te_rows = []
        for item in sched.get("sessions", []):
            s_id = item["session_id"]
            day = item["day"]
            start_p = item["start_period"]
            dur = session_durations.get(s_id, 1)
            end_p = start_p + dur - 1
            r_id = item["room_id"]

            is_ov = s_id in overrides
            disp_by = overrides[s_id].get("displaced_by") if is_ov else None

            te_rows.append([sched_id, s_id, day, start_p, end_p, r_id, is_ov, disp_by])

        self.execute_batch_insert(
            "timetable_entries",
            ["schedule_id", "session_id", "day", "start_period", "end_period", "room_id", "is_overridden_for_fest", "override_displaced_by"],
            te_rows,
            "ON CONFLICT (schedule_id, session_id) DO UPDATE SET day = EXCLUDED.day, start_period = EXCLUDED.start_period, end_period = EXCLUDED.end_period, room_id = EXCLUDED.room_id, is_overridden_for_fest = EXCLUDED.is_overridden_for_fest, override_displaced_by = EXCLUDED.override_displaced_by",
            batch_size=50
        )

    def ingest_knowledge_base(self):
        print("[INGEST] Ingesting Campus Knowledge Base (Markdown -> Documents & Chunks)...")
        docs_to_index = [
            ("doc_readme", "Campus Operations Master README", os.path.join(WORKSPACE_DIR, "CrunchWeek_StarterPack", "README.md"), "guide"),
            ("doc_scheduling_rules", "Official Scheduling Constraint Rules & Penalties", os.path.join(WORKSPACE_DIR, "docs", "scheduling-rules.md"), "regulation"),
            ("doc_sample_requests", "Sample Natural Language Campus Requests", os.path.join(WORKSPACE_DIR, "CrunchWeek_StarterPack", "examples", "sample_requests.md"), "catalog"),
        ]

        doc_rows = []
        chunk_rows = []

        for doc_id, title, file_path, doc_type in docs_to_index:
            if not os.path.exists(file_path):
                continue
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            rel_path = os.path.relpath(file_path, WORKSPACE_DIR)
            doc_rows.append([doc_id, title, rel_path, doc_type, title])

            sections = re.split(r"\n(?=#{1,3}\s+)", content)
            for idx, sec in enumerate(sections):
                sec = sec.strip()
                if not sec:
                    continue
                header_match = re.match(r"^#{1,3}\s+(.+)$", sec, re.MULTILINE)
                section_title = header_match.group(1).strip() if header_match else f"Section {idx}"
                chunk_id = f"{doc_id}_{idx}"

                words = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", sec.lower())
                keywords = list(set(words[:30]))

                chunk_rows.append([chunk_id, doc_id, idx, section_title, sec, keywords, {"length": len(sec)}])

        self.execute_batch_insert(
            "knowledge_documents",
            ["id", "title", "source_file", "document_type", "summary"],
            doc_rows,
            "ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, updated_at = NOW()"
        )
        self.execute_batch_insert(
            "document_chunks",
            ["id", "document_id", "chunk_index", "section_title", "content", "keywords", "metadata_json"],
            chunk_rows,
            "ON CONFLICT (id) DO UPDATE SET section_title = EXCLUDED.section_title, content = EXCLUDED.content, keywords = EXCLUDED.keywords",
            batch_size=20
        )

    def print_summary(self):
        print("\n" + "=" * 70)
        print("CITRIX INGESTION AUDIT SUMMARY")
        print("=" * 70)
        print(f"  Total SQL operations processed: {self.stats['processed']}")
        print(f"  Successfully applied:           {self.stats['inserted']}")
        print(f"  Failed operations:              {self.stats['failed']}")
        print("=" * 70)


if __name__ == "__main__":
    ingester = DatasetIngester()
    ingester.run()
