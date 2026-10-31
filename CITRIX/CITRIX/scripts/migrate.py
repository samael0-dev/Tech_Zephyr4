"""Database migration executor for CITRIX on Neon PostgreSQL.

Applies Alembic schema migrations. Supports both standard SQLAlchemy connection
and Neon HTTPS SQL fallback (for restricted firewall / blocked port 5432 environments).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import importlib.util

spec = importlib.util.spec_from_file_location(
    "migration_001",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "alembic", "versions", "001_initial_citrix_schema.py")
)
migration_001 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration_001)

from api.database import get_engine, query_neon_http, test_connection

REVISION_ID = "001_initial_citrix_schema"


def run_migration():
    print("=" * 70)
    print("CITRIX DATABASE MIGRATION RUNNER")
    print("=" * 70)

    # 1. Test database connectivity
    conn_info = test_connection()
    if not conn_info.get("success"):
        print(f"[ERROR] Database connection failed: {conn_info.get('error')}")
        sys.exit(1)

    transport = conn_info.get("transport")
    print(f"[INFO] Connection successful via {transport}")
    print(f"[INFO] Target: {conn_info.get('masked_url')}")
    print(f"[INFO] Server: {conn_info.get('server_version')[:60]}...")

    # 2. Ensure alembic_version table exists
    create_alembic_table_sql = (
        "CREATE TABLE IF NOT EXISTS alembic_version ("
        "    version_num VARCHAR(32) NOT NULL,"
        "    PRIMARY KEY (version_num)"
        ");"
    )

    is_https = "HTTPS" in transport
    if is_https:
        query_neon_http(create_alembic_table_sql)
        version_res = query_neon_http("SELECT version_num FROM alembic_version;")
        applied_versions = [r["version_num"] for r in version_res.get("rows", [])]
    else:
        engine = get_engine()
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text(create_alembic_table_sql))
            rows = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchall()
            applied_versions = [r[0] for r in rows]

    print(f"[INFO] Currently applied migration versions: {applied_versions}")

    if REVISION_ID in applied_versions:
        print(f"[INFO] Migration {REVISION_ID} is already applied. Checking schema integrity...")
    else:
        print(f"[INFO] Applying migration revision: {REVISION_ID}...")
        total_stmts = len(migration_001.DDL_STATEMENTS)
        print(f"[INFO] Total DDL statements to execute: {total_stmts}")

        if is_https:
            for idx, stmt in enumerate(migration_001.DDL_STATEMENTS, 1):
                clean_stmt = stmt.strip()
                query_neon_http(clean_stmt)
                if idx % 10 == 0 or idx == total_stmts:
                    print(f"  -> Applied {idx}/{total_stmts} DDL statements...")

            # Record version in alembic_version
            query_neon_http(
                "INSERT INTO alembic_version (version_num) VALUES ($1) ON CONFLICT DO NOTHING;",
                [REVISION_ID],
            )
        else:
            engine = get_engine()
            from sqlalchemy import text
            with engine.begin() as conn:
                for idx, stmt in enumerate(migration_001.DDL_STATEMENTS, 1):
                    conn.execute(text(stmt))
                    if idx % 10 == 0 or idx == total_stmts:
                        print(f"  -> Applied {idx}/{total_stmts} DDL statements...")
                conn.execute(
                    text("INSERT INTO alembic_version (version_num) VALUES (:v) ON CONFLICT DO NOTHING;"),
                    {"v": REVISION_ID},
                )

        print(f"[SUCCESS] Migration {REVISION_ID} applied successfully!")

    # 3. Verify created tables in information_schema
    verify_sql = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
    """
    if is_https:
        tables_res = query_neon_http(verify_sql)
        existing_tables = [r["table_name"] for r in tables_res.get("rows", [])]
    else:
        engine = get_engine()
        from sqlalchemy import text
        with engine.connect() as conn:
            rows = conn.execute(text(verify_sql)).fetchall()
            existing_tables = [r[0] for r in rows]

    print("\n" + "=" * 70)
    print(f"MIGRATION VERIFICATION REPORT: {len(existing_tables)} tables in 'public' schema")
    print("=" * 70)
    for t in existing_tables:
        print(f"  [OK] {t}")

    from api.models import Base
    expected_tables = {table.name for table in Base.metadata.sorted_tables}
    missing_tables = expected_tables - set(existing_tables)
    if missing_tables:
        print(f"\n[WARNING] Missing tables detected: {missing_tables}")
        sys.exit(1)
    else:
        print(f"\n[SUCCESS] All {len(expected_tables)} expected CITRIX domain tables verified!")


if __name__ == "__main__":
    run_migration()
