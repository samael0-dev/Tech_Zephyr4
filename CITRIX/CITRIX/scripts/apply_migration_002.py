"""Execute migration 002_application_alignment on Neon PostgreSQL."""
import importlib.util
import os
import sys
from dotenv import load_dotenv

load_dotenv()
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

spec = importlib.util.spec_from_file_location(
    "m002",
    os.path.join(ROOT_DIR, "alembic", "versions", "002_application_alignment.py")
)
m002 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m002)
DDL_STATEMENTS = m002.DDL_STATEMENTS
revision = m002.revision

from api.database import execute_query, test_connection

def run_migration_002():
    print("=" * 65)
    print(f"APPLYING ALEMBIC MIGRATION: {revision}")
    print("=" * 65)

    conn_info = test_connection()
    if not conn_info.get("success"):
        print(f"[ERROR] Database connection failed: {conn_info.get('error')}")
        sys.exit(1)

    print(f"[INFO] Connected via: {conn_info.get('transport')}")

    # Check current version
    v_rows = execute_query("SELECT version_num FROM alembic_version;")
    current_versions = [r["version_num"] for r in v_rows]
    print(f"[INFO] Current alembic version(s): {current_versions}")

    if revision in current_versions:
        print(f"[INFO] Revision {revision} is already marked applied!")
        return

    print(f"[INFO] Executing {len(DDL_STATEMENTS)} DDL statements for {revision}...")
    for idx, stmt in enumerate(DDL_STATEMENTS, 1):
        clean_stmt = stmt.strip()
        execute_query(clean_stmt)
        print(f"  [APPLIED {idx}/{len(DDL_STATEMENTS)}] {clean_stmt.splitlines()[0][:60]}...")

    # Update alembic_version
    execute_query("UPDATE alembic_version SET version_num = '002_application_alignment' WHERE version_num = '001_initial_citrix_schema';")
    # Verify update
    v_check = execute_query("SELECT version_num FROM alembic_version;")
    print(f"[SUCCESS] Updated alembic_version table to: {[r['version_num'] for r in v_check]}")

    # Verify total tables and new columns
    tables_res = execute_query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    print(f"\n[VERIFICATION] Public schema now has {len(tables_res)} tables (including disruptions).")
    assert any(r["table_name"] == "disruptions" for r in tables_res), "disruptions table was not found!"

    # Verify users columns
    user_cols = execute_query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
    user_col_names = {r["column_name"] for r in user_cols}
    assert "username" in user_col_names, "users.username missing!"
    assert "hashed_password" in user_col_names, "users.hashed_password missing!"
    assert "last_login_at" in user_col_names, "users.last_login_at missing!"

    # Verify booking_requests columns
    br_cols = execute_query("SELECT column_name FROM information_schema.columns WHERE table_name = 'booking_requests';")
    br_col_names = {r["column_name"] for r in br_cols}
    assert "requester_user_id" in br_col_names, "booking_requests.requester_user_id missing!"
    assert "decided_by_user_id" in br_col_names, "booking_requests.decided_by_user_id missing!"

    print("[SUCCESS] All schema additions verified successfully without altering existing data!")

if __name__ == "__main__":
    run_migration_002()
