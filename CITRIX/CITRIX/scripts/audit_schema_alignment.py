"""Compare SQLAlchemy models in api.models with Alembic migration and live Neon DB."""

import importlib.util
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Base
from api.database import query_neon_http

def main():
    print("=" * 80)
    print("SCHEMA & MIGRATION ALIGNMENT AUDIT")
    print("=" * 80)

    # 1. Load Alembic migration
    spec = importlib.util.spec_from_file_location("mig", "alembic/versions/001_initial_citrix_schema.py")
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)

    model_tables = set(Base.metadata.tables.keys())
    print(f"Total tables defined in SQLAlchemy api.models: {len(model_tables)}")

    mig_tables = set()
    for stmt in mig.DDL_STATEMENTS:
        if "CREATE TABLE IF NOT EXISTS " in stmt:
            tname = stmt.split("CREATE TABLE IF NOT EXISTS ")[1].split(" (")[0].strip()
            mig_tables.add(tname)
    print(f"Total tables created in Alembic migration:     {len(mig_tables)}")

    db_tables_res = query_neon_http("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    db_tables = set(r["table_name"] for r in db_tables_res["rows"])
    print(f"Total tables present in live PostgreSQL:       {len(db_tables)}")

    diff_model_mig = model_tables - mig_tables
    diff_mig_model = mig_tables - model_tables
    diff_model_db = model_tables - db_tables
    extra_in_db = db_tables - model_tables

    print(f"\n1. Tables in api.models but NOT in migration: {diff_model_mig or 'NONE (100% matched)'}")
    print(f"2. Tables in migration but NOT in api.models: {diff_mig_model or 'NONE (100% matched)'}")
    print(f"3. Tables in api.models but NOT in PostgreSQL: {diff_model_db or 'NONE (100% matched)'}")
    print(f"4. Extra tables in PostgreSQL (e.g. metadata): {extra_in_db}")

    # 2. Check columns for all 30 model tables
    print("\n--- COLUMN ALIGNMENT FOR ALL 30 TABLES ---")
    mismatches = []
    for tname in sorted(model_tables):
        table = Base.metadata.tables[tname]
        model_cols = set(c.name for c in table.columns)
        db_cols_res = query_neon_http(f"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='{tname}';")
        db_cols = set(r["column_name"] for r in db_cols_res["rows"])
        if model_cols != db_cols:
            mismatches.append((tname, model_cols - db_cols, db_cols - model_cols))
        else:
            print(f"  [OK] {tname:<28}: all {len(model_cols)} columns matched")

    if mismatches:
        print(f"\nWARNING: Found {len(mismatches)} column mismatches:")
        for m in mismatches:
            print(f"  {m[0]}: Missing in DB: {m[1]} | Extra in DB: {m[2]}")
    else:
        print(f"\nSUCCESS: All columns in all 30 SQLAlchemy models perfectly match the live database!")

if __name__ == "__main__":
    main()
