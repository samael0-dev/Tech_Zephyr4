"""Application alignment and auth extension migration

Revision ID: 002_application_alignment
Revises: 001_initial_citrix_schema
Create Date: 2026-10-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_application_alignment'
down_revision: Union[str, None] = '001_initial_citrix_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DDL_STATEMENTS = [
    # 1. Identity & Auth Extension on users table
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(64);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(256);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);",

    # 2. Decision Audit & Anti-Self-Approval Extension on booking_requests table
    "ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS requester_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;",
    "ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS decided_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;",
    "ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;",
    "CREATE INDEX IF NOT EXISTS ix_booking_requests_requester_user ON booking_requests (requester_user_id);",
    "CREATE INDEX IF NOT EXISTS ix_booking_requests_decided_by ON booking_requests (decided_by_user_id);",

    # 3. Disruption Staging Workflow Table
    """CREATE TABLE IF NOT EXISTS disruptions (
        id SERIAL PRIMARY KEY,
        submitted_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        disruption_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        impact_summary JSONB DEFAULT '{}'::jsonb,
        proposed_schedule_id VARCHAR(64) REFERENCES schedules(id) ON DELETE SET NULL,
        approved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );""",
    "CREATE INDEX IF NOT EXISTS ix_disruptions_status ON disruptions (status);",
    "CREATE INDEX IF NOT EXISTS ix_disruptions_submitted_by ON disruptions (submitted_by_user_id);",

    # 4. Audit Log Enrichment
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(32);",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'SUCCESS';",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);",

    # 5. Knowledge Documents Extension
    "ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS access_role_minimum VARCHAR(32) DEFAULT 'student';",
    "ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS raw_content TEXT;"
]

DOWN_DDL_STATEMENTS = [
    "DROP TABLE IF EXISTS disruptions CASCADE;",
    "ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS raw_content;",
    "ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS access_role_minimum;",
    "ALTER TABLE audit_logs DROP COLUMN IF EXISTS ip_address;",
    "ALTER TABLE audit_logs DROP COLUMN IF EXISTS status;",
    "ALTER TABLE audit_logs DROP COLUMN IF EXISTS actor_role;",
    "DROP INDEX IF EXISTS ix_booking_requests_decided_by;",
    "DROP INDEX IF EXISTS ix_booking_requests_requester_user;",
    "ALTER TABLE booking_requests DROP COLUMN IF EXISTS decided_at;",
    "ALTER TABLE booking_requests DROP COLUMN IF EXISTS decided_by_user_id;",
    "ALTER TABLE booking_requests DROP COLUMN IF EXISTS requester_user_id;",
    "DROP INDEX IF EXISTS ix_users_username;",
    "ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;",
    "ALTER TABLE users DROP COLUMN IF EXISTS hashed_password;",
    "ALTER TABLE users DROP COLUMN IF EXISTS username;"
]


def upgrade() -> None:
    for stmt in DDL_STATEMENTS:
        op.execute(stmt)


def downgrade() -> None:
    for stmt in DOWN_DDL_STATEMENTS:
        op.execute(stmt)
