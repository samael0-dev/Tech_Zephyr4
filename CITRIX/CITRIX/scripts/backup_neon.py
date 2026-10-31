"""Snapshot backup of all Neon PostgreSQL tables before applying migration 002."""
import json
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import execute_query

def backup_all_tables():
    print("=" * 60)
    print("CREATING NEON DATABASE SNAPSHOT BACKUP BEFORE MIGRATION 002")
    print("=" * 60)

    tables_res = execute_query("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [r["table_name"] for r in tables_res]
    print(f"Discovered {len(tables)} tables to back up.")

    backup_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_tables": len(tables),
        "tables": {}
    }

    total_records = 0
    for t in tables:
        rows = execute_query(f"SELECT * FROM {t};")
        backup_data["tables"][t] = rows
        total_records += len(rows)
        print(f"  [BACKUP] {t:<30}: {len(rows)} rows")

    backup_data["total_records"] = total_records
    os.makedirs("exports", exist_ok=True)
    backup_file = "exports/backup_neon_before_migration_002.json"
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, indent=2, default=str)

    print("=" * 60)
    print(f"[SUCCESS] Complete backup written to {backup_file}")
    print(f"[SUCCESS] Total records backed up: {total_records}")
    print("=" * 60)

if __name__ == "__main__":
    backup_all_tables()
