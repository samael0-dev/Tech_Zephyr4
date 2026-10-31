"""Generate Alembic initial migration from api.models schema."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable, CreateIndex

from api.models import Base

def generate():
    dialect = postgresql.dialect()
    sorted_tables = Base.metadata.sorted_tables

    lines = []
    lines.append('"""Initial CITRIX relational schema')
    lines.append('')
    lines.append('Revision ID: 001_initial_citrix_schema')
    lines.append('Revises: None')
    lines.append('Create Date: 2026-10-31')
    lines.append('"""')
    lines.append('')
    lines.append('from typing import Sequence, Union')
    lines.append('from alembic import op')
    lines.append('import sqlalchemy as sa')
    lines.append('from sqlalchemy.dialects import postgresql')
    lines.append('')
    lines.append("revision: str = '001_initial_citrix_schema'")
    lines.append('down_revision: Union[str, None] = None')
    lines.append('branch_labels: Union[str, Sequence[str], None] = None')
    lines.append('depends_on: Union[str, Sequence[str], None] = None')
    lines.append('')
    lines.append('DDL_STATEMENTS = [')

    for table in sorted_tables:
        create_stmt = str(CreateTable(table).compile(dialect=dialect)).strip()
        create_stmt = create_stmt.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
        lines.append(f"    {repr(create_stmt)},")

    for table in sorted_tables:
        for idx in table.indexes:
            idx_stmt = str(CreateIndex(idx).compile(dialect=dialect)).strip()
            idx_stmt = idx_stmt.replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
            idx_stmt = idx_stmt.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ")
            lines.append(f"    {repr(idx_stmt)},")

    lines.append(']')
    lines.append('')
    lines.append('DOWN_STATEMENTS = [')

    for table in reversed(sorted_tables):
        lines.append(f'    "DROP TABLE IF EXISTS {table.name} CASCADE;",')

    lines.append(']')
    lines.append('')
    lines.append('def upgrade() -> None:')
    lines.append('    for stmt in DDL_STATEMENTS:')
    lines.append('        op.execute(stmt)')
    lines.append('')
    lines.append('def downgrade() -> None:')
    lines.append('    for stmt in DOWN_STATEMENTS:')
    lines.append('        op.execute(stmt)')
    lines.append('')

    target_path = os.path.join("alembic", "versions", "001_initial_citrix_schema.py")
    with open(target_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated {target_path} successfully ({len(sorted_tables)} tables, {len(lines)} lines)")

if __name__ == "__main__":
    generate()
