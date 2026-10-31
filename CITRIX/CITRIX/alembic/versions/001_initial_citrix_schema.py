"""Initial CITRIX relational schema

Revision ID: 001_initial_citrix_schema
Revises: None
Create Date: 2026-10-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_citrix_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DDL_STATEMENTS = [
    'CREATE TABLE IF NOT EXISTS academic_periods (\n\tperiod_number INTEGER NOT NULL, \n\tstart_time TIME WITHOUT TIME ZONE NOT NULL, \n\tend_time TIME WITHOUT TIME ZONE NOT NULL, \n\tis_teaching BOOLEAN NOT NULL, \n\tis_event_only BOOLEAN NOT NULL, \n\tlabel VARCHAR(32) NOT NULL, \n\tPRIMARY KEY (period_number)\n)',
    'CREATE TABLE IF NOT EXISTS academic_terms (\n\tid VARCHAR(32) NOT NULL, \n\tname VARCHAR(64) NOT NULL, \n\tis_current BOOLEAN NOT NULL, \n\tstart_date DATE, \n\tend_date DATE, \n\tfest_week_number INTEGER NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS audit_logs (\n\tid SERIAL NOT NULL, \n\tuser_id VARCHAR(64), \n\taction VARCHAR(64) NOT NULL, \n\tentity_type VARCHAR(64) NOT NULL, \n\tentity_id VARCHAR(64), \n\tdetails JSONB, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS buildings (\n\tid VARCHAR(64) NOT NULL, \n\tname VARCHAR(128) NOT NULL, \n\tcode VARCHAR(32), \n\thas_lift BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS event_categories (\n\tcode VARCHAR(32) NOT NULL, \n\tname VARCHAR(64) NOT NULL, \n\tweight INTEGER NOT NULL, \n\tpriority_rank INTEGER NOT NULL, \n\tPRIMARY KEY (code)\n)',
    'CREATE TABLE IF NOT EXISTS exam_sessions (\n\tid VARCHAR(16) NOT NULL, \n\tname VARCHAR(32) NOT NULL, \n\tstart_time TIME WITHOUT TIME ZONE NOT NULL, \n\tend_time TIME WITHOUT TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS knowledge_documents (\n\tid VARCHAR(64) NOT NULL, \n\ttitle VARCHAR(256) NOT NULL, \n\tsource_file VARCHAR(256) NOT NULL, \n\tdocument_type VARCHAR(64) NOT NULL, \n\tsummary TEXT, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS notifications (\n\tid SERIAL NOT NULL, \n\tuser_id VARCHAR(64), \n\trole_target VARCHAR(32), \n\ttitle VARCHAR(256) NOT NULL, \n\tmessage TEXT NOT NULL, \n\tis_read BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)',
    'CREATE TABLE IF NOT EXISTS roles (\n\tid VARCHAR(32) NOT NULL, \n\tname VARCHAR(64) NOT NULL, \n\tdescription TEXT, \n\tcategory_cap VARCHAR(32), \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (name)\n)',
    'CREATE TABLE IF NOT EXISTS departments (\n\tcode VARCHAR(16) NOT NULL, \n\tname VARCHAR(128) NOT NULL, \n\tbuilding_id VARCHAR(64), \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (code), \n\tFOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE SET NULL\n)',
    'CREATE TABLE IF NOT EXISTS document_chunks (\n\tid VARCHAR(64) NOT NULL, \n\tdocument_id VARCHAR(64) NOT NULL, \n\tchunk_index INTEGER NOT NULL, \n\tsection_title VARCHAR(256) NOT NULL, \n\tcontent TEXT NOT NULL, \n\tkeywords JSONB NOT NULL, \n\tmetadata_json JSONB, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(document_id) REFERENCES knowledge_documents (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS exams (\n\tid VARCHAR(32) NOT NULL, \n\tterm_id VARCHAR(32), \n\tsize INTEGER NOT NULL, \n\tduration_hours INTEGER NOT NULL, \n\tcourse_ids JSONB NOT NULL, \n\tgroups JSONB NOT NULL, \n\tscheduled_day VARCHAR(4), \n\tscheduled_session VARCHAR(16), \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(term_id) REFERENCES academic_terms (id) ON DELETE SET NULL, \n\tFOREIGN KEY(scheduled_session) REFERENCES exam_sessions (id) ON DELETE SET NULL\n)',
    'CREATE TABLE IF NOT EXISTS rooms (\n\tid VARCHAR(32) NOT NULL, \n\tname VARCHAR(128) NOT NULL, \n\tbuilding_id VARCHAR(64) NOT NULL, \n\ttype VARCHAR(32) NOT NULL, \n\tcapacity INTEGER NOT NULL, \n\texam_capacity INTEGER NOT NULL, \n\taccessible BOOLEAN NOT NULL, \n\tfeatures JSONB NOT NULL, \n\tallowed_uses JSONB NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS schedules (\n\tid VARCHAR(64) NOT NULL, \n\tname VARCHAR(128) NOT NULL, \n\tdataset_id VARCHAR(64) NOT NULL, \n\tterm_id VARCHAR(32), \n\tis_active BOOLEAN NOT NULL, \n\tis_baseline BOOLEAN NOT NULL, \n\tstatus VARCHAR(32) NOT NULL, \n\thard_violations_count INTEGER NOT NULL, \n\tsoft_penalty_total INTEGER NOT NULL, \n\tsolver_runtime_seconds FLOAT, \n\traw_schedule_json JSONB, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tcreated_by VARCHAR(64), \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(term_id) REFERENCES academic_terms (id) ON DELETE SET NULL\n)',
    'CREATE TABLE IF NOT EXISTS booking_requests (\n\tid VARCHAR(32) NOT NULL, \n\tsubmitted_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\trequester VARCHAR(128) NOT NULL, \n\trole VARCHAR(32) NOT NULL, \n\tdepartment_code VARCHAR(16), \n\trequested_category VARCHAR(32) NOT NULL, \n\teffective_category VARCHAR(32) NOT NULL, \n\ttitle VARCHAR(256) NOT NULL, \n\tattendance INTEGER NOT NULL, \n\tduration_periods INTEGER NOT NULL, \n\twindows JSONB NOT NULL, \n\troom_types JSONB NOT NULL, \n\tneeds JSONB NOT NULL, \n\trequested_room VARCHAR(32), \n\tmandatory_for_groups JSONB NOT NULL, \n\tseries_id VARCHAR(32), \n\traw_text TEXT, \n\tstatus VARCHAR(32) NOT NULL, \n\tassigned_room_id VARCHAR(32), \n\tassigned_day VARCHAR(4), \n\tassigned_start_period INTEGER, \n\tassigned_end_period INTEGER, \n\tdecision_reason TEXT, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(role) REFERENCES roles (id) ON DELETE RESTRICT, \n\tFOREIGN KEY(department_code) REFERENCES departments (code) ON DELETE SET NULL, \n\tFOREIGN KEY(requested_category) REFERENCES event_categories (code) ON DELETE RESTRICT, \n\tFOREIGN KEY(effective_category) REFERENCES event_categories (code) ON DELETE RESTRICT, \n\tFOREIGN KEY(requested_room) REFERENCES rooms (id) ON DELETE SET NULL, \n\tFOREIGN KEY(assigned_room_id) REFERENCES rooms (id) ON DELETE SET NULL\n)',
    'CREATE TABLE IF NOT EXISTS courses (\n\tid VARCHAR(32) NOT NULL, \n\ttitle VARCHAR(128) NOT NULL, \n\tdepartment_code VARCHAR(16) NOT NULL, \n\tyear INTEGER, \n\tlecture_hours INTEGER NOT NULL, \n\ttutorial_hours INTEGER NOT NULL, \n\tlab_blocks INTEGER NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(department_code) REFERENCES departments (code) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS exam_room_allocations (\n\tid SERIAL NOT NULL, \n\texam_id VARCHAR(32) NOT NULL, \n\troom_id VARCHAR(32) NOT NULL, \n\tallocated_seats INTEGER NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_exam_room_allocation UNIQUE (exam_id, room_id), \n\tFOREIGN KEY(exam_id) REFERENCES exams (id) ON DELETE CASCADE, \n\tFOREIGN KEY(room_id) REFERENCES rooms (id) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS room_unavailabilities (\n\tid SERIAL NOT NULL, \n\troom_id VARCHAR(32) NOT NULL, \n\tday VARCHAR(4) NOT NULL, \n\tperiod INTEGER NOT NULL, \n\treason TEXT, \n\tis_permanent BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_room_unavailability_slot UNIQUE (room_id, day, period), \n\tFOREIGN KEY(room_id) REFERENCES rooms (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS schedule_versions (\n\tid SERIAL NOT NULL, \n\tschedule_id VARCHAR(64) NOT NULL, \n\tversion_number INTEGER NOT NULL, \n\tchange_summary TEXT, \n\tdisruption_payload JSONB, \n\tvalidation_report JSONB, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_schedule_version UNIQUE (schedule_id, version_number), \n\tFOREIGN KEY(schedule_id) REFERENCES schedules (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS scheduling_conflicts (\n\tid SERIAL NOT NULL, \n\tschedule_id VARCHAR(64) NOT NULL, \n\trule_code VARCHAR(16) NOT NULL, \n\twhere_context VARCHAR(64) NOT NULL, \n\tdetail TEXT NOT NULL, \n\tresolved BOOLEAN NOT NULL, \n\tdetected_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(schedule_id) REFERENCES schedules (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS student_groups (\n\tid VARCHAR(32) NOT NULL, \n\tname VARCHAR(128) NOT NULL, \n\tyear INTEGER NOT NULL, \n\tdepartment_code VARCHAR(16) NOT NULL, \n\tsize INTEGER NOT NULL, \n\tneeds_accessible BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(department_code) REFERENCES departments (code) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS users (\n\tid VARCHAR(64) NOT NULL, \n\temail VARCHAR(128), \n\tfull_name VARCHAR(128) NOT NULL, \n\tdepartment_code VARCHAR(16), \n\tis_active BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(department_code) REFERENCES departments (code) ON DELETE SET NULL\n)',
    'CREATE TABLE IF NOT EXISTS utilisation_snapshots (\n\tid SERIAL NOT NULL, \n\tschedule_id VARCHAR(64), \n\tsnapshot_date DATE NOT NULL, \n\tbuilding_id VARCHAR(64) NOT NULL, \n\troom_id VARCHAR(32), \n\ttotal_slots INTEGER NOT NULL, \n\toccupied_slots INTEGER NOT NULL, \n\tutilisation_pct FLOAT NOT NULL, \n\tmetrics JSONB, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(schedule_id) REFERENCES schedules (id) ON DELETE SET NULL, \n\tFOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE CASCADE, \n\tFOREIGN KEY(room_id) REFERENCES rooms (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS booking_cancellations (\n\trequest_id VARCHAR(32) NOT NULL, \n\tcancelled_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tcancelled_by VARCHAR(128) NOT NULL, \n\treason TEXT, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (request_id), \n\tFOREIGN KEY(request_id) REFERENCES booking_requests (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS faculty_profiles (\n\tid VARCHAR(32) NOT NULL, \n\tuser_id VARCHAR(64), \n\tname VARCHAR(128) NOT NULL, \n\tdepartment_code VARCHAR(16) NOT NULL, \n\tmax_hours_per_day INTEGER NOT NULL, \n\tneeds_accessible BOOLEAN NOT NULL, \n\tpreferences JSONB NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL, \n\tFOREIGN KEY(department_code) REFERENCES departments (code) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS user_roles (\n\tuser_id VARCHAR(64) NOT NULL, \n\trole_id VARCHAR(32) NOT NULL, \n\tgranted_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (user_id, role_id), \n\tFOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, \n\tFOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS faculty_unavailabilities (\n\tid SERIAL NOT NULL, \n\tfaculty_id VARCHAR(32) NOT NULL, \n\tday VARCHAR(4) NOT NULL, \n\tperiod INTEGER NOT NULL, \n\treason TEXT, \n\tis_permanent BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_faculty_unavailability_slot UNIQUE (faculty_id, day, period), \n\tFOREIGN KEY(faculty_id) REFERENCES faculty_profiles (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS sessions (\n\tid VARCHAR(64) NOT NULL, \n\tcourse_id VARCHAR(32) NOT NULL, \n\tkind VARCHAR(16) NOT NULL, \n\tfaculty_id VARCHAR(32) NOT NULL, \n\tsize INTEGER NOT NULL, \n\tduration INTEGER NOT NULL, \n\troom_types JSONB NOT NULL, \n\tneeds_accessible BOOLEAN NOT NULL, \n\tbasket_slot VARCHAR(32), \n\tfixed_slot_day VARCHAR(4), \n\tfixed_slot_period INTEGER, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(course_id) REFERENCES courses (id) ON DELETE RESTRICT, \n\tFOREIGN KEY(faculty_id) REFERENCES faculty_profiles (id) ON DELETE RESTRICT\n)',
    'CREATE TABLE IF NOT EXISTS session_groups (\n\tsession_id VARCHAR(64) NOT NULL, \n\tgroup_id VARCHAR(32) NOT NULL, \n\tPRIMARY KEY (session_id, group_id), \n\tFOREIGN KEY(session_id) REFERENCES sessions (id) ON DELETE CASCADE, \n\tFOREIGN KEY(group_id) REFERENCES student_groups (id) ON DELETE CASCADE\n)',
    'CREATE TABLE IF NOT EXISTS timetable_entries (\n\tid SERIAL NOT NULL, \n\tschedule_id VARCHAR(64) NOT NULL, \n\tsession_id VARCHAR(64) NOT NULL, \n\tday VARCHAR(4) NOT NULL, \n\tstart_period INTEGER NOT NULL, \n\tend_period INTEGER NOT NULL, \n\troom_id VARCHAR(32) NOT NULL, \n\tis_overridden_for_fest BOOLEAN NOT NULL, \n\toverride_displaced_by VARCHAR(32), \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCONSTRAINT uq_schedule_session UNIQUE (schedule_id, session_id), \n\tFOREIGN KEY(schedule_id) REFERENCES schedules (id) ON DELETE CASCADE, \n\tFOREIGN KEY(session_id) REFERENCES sessions (id) ON DELETE CASCADE, \n\tFOREIGN KEY(room_id) REFERENCES rooms (id) ON DELETE RESTRICT\n)',
    'CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)',
    'CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action)',
    'CREATE UNIQUE INDEX IF NOT EXISTS ix_buildings_name ON buildings (name)',
    'CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_doc_chunk_doc_idx ON document_chunks (document_id, chunk_index)',
    'CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks (document_id)',
    'CREATE INDEX IF NOT EXISTS ix_exams_scheduled_session ON exams (scheduled_session)',
    'CREATE INDEX IF NOT EXISTS ix_exams_scheduled_day ON exams (scheduled_day)',
    'CREATE INDEX IF NOT EXISTS ix_rooms_type ON rooms (type)',
    'CREATE INDEX IF NOT EXISTS ix_rooms_building_id ON rooms (building_id)',
    'CREATE INDEX IF NOT EXISTS ix_schedules_is_active ON schedules (is_active)',
    'CREATE INDEX IF NOT EXISTS ix_booking_requests_submitted_at ON booking_requests (submitted_at)',
    'CREATE INDEX IF NOT EXISTS ix_booking_requests_status ON booking_requests (status)',
    'CREATE INDEX IF NOT EXISTS ix_booking_requests_effective_category ON booking_requests (effective_category)',
    'CREATE INDEX IF NOT EXISTS ix_booking_requests_assigned_day ON booking_requests (assigned_day)',
    'CREATE INDEX IF NOT EXISTS ix_booking_requests_assigned_room_id ON booking_requests (assigned_room_id)',
    'CREATE INDEX IF NOT EXISTS ix_courses_year ON courses (year)',
    'CREATE INDEX IF NOT EXISTS ix_courses_department_code ON courses (department_code)',
    'CREATE INDEX IF NOT EXISTS ix_exam_room_allocations_room_id ON exam_room_allocations (room_id)',
    'CREATE INDEX IF NOT EXISTS ix_exam_room_allocations_exam_id ON exam_room_allocations (exam_id)',
    'CREATE INDEX IF NOT EXISTS idx_room_unavail_day_period ON room_unavailabilities (room_id, day, period)',
    'CREATE INDEX IF NOT EXISTS ix_room_unavailabilities_room_id ON room_unavailabilities (room_id)',
    'CREATE INDEX IF NOT EXISTS ix_schedule_versions_schedule_id ON schedule_versions (schedule_id)',
    'CREATE INDEX IF NOT EXISTS ix_scheduling_conflicts_rule_code ON scheduling_conflicts (rule_code)',
    'CREATE INDEX IF NOT EXISTS ix_scheduling_conflicts_schedule_id ON scheduling_conflicts (schedule_id)',
    'CREATE INDEX IF NOT EXISTS ix_student_groups_year ON student_groups (year)',
    'CREATE INDEX IF NOT EXISTS ix_student_groups_department_code ON student_groups (department_code)',
    'CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)',
    'CREATE INDEX IF NOT EXISTS ix_utilisation_snapshots_building_id ON utilisation_snapshots (building_id)',
    'CREATE INDEX IF NOT EXISTS ix_utilisation_snapshots_schedule_id ON utilisation_snapshots (schedule_id)',
    'CREATE INDEX IF NOT EXISTS ix_utilisation_snapshots_snapshot_date ON utilisation_snapshots (snapshot_date)',
    'CREATE INDEX IF NOT EXISTS ix_utilisation_snapshots_room_id ON utilisation_snapshots (room_id)',
    'CREATE INDEX IF NOT EXISTS ix_faculty_profiles_department_code ON faculty_profiles (department_code)',
    'CREATE INDEX IF NOT EXISTS idx_fac_unavail_day_period ON faculty_unavailabilities (faculty_id, day, period)',
    'CREATE INDEX IF NOT EXISTS ix_faculty_unavailabilities_faculty_id ON faculty_unavailabilities (faculty_id)',
    'CREATE INDEX IF NOT EXISTS ix_sessions_course_id ON sessions (course_id)',
    'CREATE INDEX IF NOT EXISTS ix_sessions_kind ON sessions (kind)',
    'CREATE INDEX IF NOT EXISTS ix_sessions_faculty_id ON sessions (faculty_id)',
    'CREATE INDEX IF NOT EXISTS ix_sessions_basket_slot ON sessions (basket_slot)',
    'CREATE INDEX IF NOT EXISTS idx_timetable_room_day_start ON timetable_entries (schedule_id, room_id, day, start_period)',
    'CREATE INDEX IF NOT EXISTS ix_timetable_entries_room_id ON timetable_entries (room_id)',
    'CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable_entries (schedule_id, day, start_period, end_period)',
    'CREATE INDEX IF NOT EXISTS ix_timetable_entries_day ON timetable_entries (day)',
    'CREATE INDEX IF NOT EXISTS ix_timetable_entries_start_period ON timetable_entries (start_period)',
    'CREATE INDEX IF NOT EXISTS ix_timetable_entries_schedule_id ON timetable_entries (schedule_id)',
    'CREATE INDEX IF NOT EXISTS ix_timetable_entries_session_id ON timetable_entries (session_id)',
]

DOWN_STATEMENTS = [
    "DROP TABLE IF EXISTS timetable_entries CASCADE;",
    "DROP TABLE IF EXISTS session_groups CASCADE;",
    "DROP TABLE IF EXISTS sessions CASCADE;",
    "DROP TABLE IF EXISTS faculty_unavailabilities CASCADE;",
    "DROP TABLE IF EXISTS user_roles CASCADE;",
    "DROP TABLE IF EXISTS faculty_profiles CASCADE;",
    "DROP TABLE IF EXISTS booking_cancellations CASCADE;",
    "DROP TABLE IF EXISTS utilisation_snapshots CASCADE;",
    "DROP TABLE IF EXISTS users CASCADE;",
    "DROP TABLE IF EXISTS student_groups CASCADE;",
    "DROP TABLE IF EXISTS scheduling_conflicts CASCADE;",
    "DROP TABLE IF EXISTS schedule_versions CASCADE;",
    "DROP TABLE IF EXISTS room_unavailabilities CASCADE;",
    "DROP TABLE IF EXISTS exam_room_allocations CASCADE;",
    "DROP TABLE IF EXISTS courses CASCADE;",
    "DROP TABLE IF EXISTS booking_requests CASCADE;",
    "DROP TABLE IF EXISTS schedules CASCADE;",
    "DROP TABLE IF EXISTS rooms CASCADE;",
    "DROP TABLE IF EXISTS exams CASCADE;",
    "DROP TABLE IF EXISTS document_chunks CASCADE;",
    "DROP TABLE IF EXISTS departments CASCADE;",
    "DROP TABLE IF EXISTS roles CASCADE;",
    "DROP TABLE IF EXISTS notifications CASCADE;",
    "DROP TABLE IF EXISTS knowledge_documents CASCADE;",
    "DROP TABLE IF EXISTS exam_sessions CASCADE;",
    "DROP TABLE IF EXISTS event_categories CASCADE;",
    "DROP TABLE IF EXISTS buildings CASCADE;",
    "DROP TABLE IF EXISTS audit_logs CASCADE;",
    "DROP TABLE IF EXISTS academic_terms CASCADE;",
    "DROP TABLE IF EXISTS academic_periods CASCADE;",
]

def upgrade() -> None:
    for stmt in DDL_STATEMENTS:
        op.execute(stmt)

def downgrade() -> None:
    for stmt in DOWN_STATEMENTS:
        op.execute(stmt)
