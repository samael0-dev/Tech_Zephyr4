"""Read-only database audit script for CITRIX Neon PostgreSQL."""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import query_neon_http

def run_audit():
    print("=" * 80)
    print("CITRIX DATABASE AUDIT")
    print("=" * 80)

    # 1. List all tables in public schema
    tables_res = query_neon_http("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [r["table_name"] for r in tables_res["rows"]]
    print(f"Total tables found in 'public' schema: {len(tables)}")
    
    # 2. Exact row count for every table
    print("\n--- TABLE ROW COUNTS ---")
    counts = {}
    total_rows = 0
    for t in tables:
        cnt_res = query_neon_http(f"SELECT count(*) as cnt FROM {t};")
        c = int(cnt_res["rows"][0]["cnt"])
        counts[t] = c
        total_rows += c
        print(f"  {t:<30}: {c}")
    print(f"\nTOTAL ROWS ACROSS ALL {len(tables)} TABLES: {total_rows}")

    # 3. Primary keys
    print("\n--- PRIMARY KEYS ---")
    pk_res = query_neon_http("""
        SELECT tc.table_name, ccu.column_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, ccu.column_name;
    """)
    pks_by_table = {}
    for r in pk_res["rows"]:
        t = r["table_name"]
        pks_by_table.setdefault(t, []).append(r["column_name"])
    for t in tables:
        print(f"  {t:<30}: PK={pks_by_table.get(t, ['NONE'])}")

    # 4. Foreign Keys
    print("\n--- FOREIGN KEYS ---")
    fk_res = query_neon_http("""
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON rc.unique_constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
    """)
    print(f"Total FK constraints found: {len(fk_res['rows'])}")
    for r in fk_res["rows"][:15]:
        print(f"  {r['table_name']}.{r['column_name']} -> {r['foreign_table_name']}.{r['foreign_column_name']} (ON DELETE {r['delete_rule']})")
    if len(fk_res["rows"]) > 15:
        print(f"  ... and {len(fk_res['rows']) - 15} more foreign keys.")

    # 5. Unique Constraints
    print("\n--- UNIQUE CONSTRAINTS ---")
    uq_res = query_neon_http("""
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
    """)
    print(f"Total UNIQUE constraints: {len(uq_res['rows'])}")
    for r in uq_res["rows"]:
        print(f"  {r['table_name']}.{r['column_name']} ({r['constraint_name']})")

    # 6. Indexes
    print("\n--- SECONDARY INDEXES ---")
    idx_res = query_neon_http("""
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname;
    """)
    print(f"Total secondary indexes: {len(idx_res['rows'])}")
    for r in idx_res["rows"][:10]:
        print(f"  {r['tablename']}: {r['indexname']}")
    if len(idx_res["rows"]) > 10:
        print(f"  ... and {len(idx_res['rows']) - 10} more indexes.")

    # 7. Check for orphan records
    print("\n--- ORPHAN RECORDS AUDIT ---")
    orphan_checks = [
        ("rooms without buildings", "SELECT count(*) as c FROM rooms r LEFT JOIN buildings b ON r.building_id = b.id WHERE b.id IS NULL;"),
        ("sessions without courses", "SELECT count(*) as c FROM sessions s LEFT JOIN courses c ON s.course_id = c.id WHERE c.id IS NULL;"),
        ("sessions without faculty", "SELECT count(*) as c FROM sessions s LEFT JOIN faculty_profiles f ON s.faculty_id = f.id WHERE f.id IS NULL;"),
        ("session_groups without sessions", "SELECT count(*) as c FROM session_groups sg LEFT JOIN sessions s ON sg.session_id = s.id WHERE s.id IS NULL;"),
        ("session_groups without groups", "SELECT count(*) as c FROM session_groups sg LEFT JOIN student_groups g ON sg.group_id = g.id WHERE g.id IS NULL;"),
        ("timetable_entries without schedules", "SELECT count(*) as c FROM timetable_entries te LEFT JOIN schedules s ON te.schedule_id = s.id WHERE s.id IS NULL;"),
        ("timetable_entries without sessions", "SELECT count(*) as c FROM timetable_entries te LEFT JOIN sessions s ON te.session_id = s.id WHERE s.id IS NULL;"),
        ("timetable_entries without rooms", "SELECT count(*) as c FROM timetable_entries te LEFT JOIN rooms r ON te.room_id = r.id WHERE r.id IS NULL;"),
        ("booking_requests without categories", "SELECT count(*) as c FROM booking_requests br LEFT JOIN event_categories ec ON br.effective_category = ec.code WHERE ec.code IS NULL;"),
        ("exams without terms", "SELECT count(*) as c FROM exams e LEFT JOIN academic_terms t ON e.term_id = t.id WHERE t.id IS NULL;"),
        ("exam_room_allocations without exams", "SELECT count(*) as c FROM exam_room_allocations era LEFT JOIN exams e ON era.exam_id = e.id WHERE e.id IS NULL;"),
        ("exam_room_allocations without rooms", "SELECT count(*) as c FROM exam_room_allocations era LEFT JOIN rooms r ON era.room_id = r.id WHERE r.id IS NULL;"),
    ]
    for label, q in orphan_checks:
        res = query_neon_http(q)
        cnt = int(res["rows"][0]["c"])
        status = "PASSED (0 orphans)" if cnt == 0 else f"FAILED ({cnt} orphans!)"
        print(f"  {label:<40}: {status}")

    # 8. Preservation of Original Dataset Identifiers
    print("\n--- ORIGINAL IDENTIFIER PRESERVATION AUDIT ---")
    with open("CrunchWeek_StarterPack/data/cit_public.json", "r", encoding="utf-8") as f:
        ds = json.load(f)

    # Rooms
    db_rooms = {r["id"] for r in query_neon_http("SELECT id FROM rooms;")["rows"]}
    ds_rooms = {r["id"] for r in ds["rooms"]}
    rooms_preserved = (ds_rooms == db_rooms)
    print(f"  Rooms identifiers ({len(ds_rooms)} expected): {'100% PRESERVED' if rooms_preserved else f'MISMATCH: {ds_rooms ^ db_rooms}'}")

    # Faculty
    db_fac = {r["id"] for r in query_neon_http("SELECT id FROM faculty_profiles;")["rows"]}
    ds_fac = {f["id"] for f in ds["faculty"]}
    fac_preserved = (ds_fac == db_fac)
    print(f"  Faculty identifiers ({len(ds_fac)} expected): {'100% PRESERVED' if fac_preserved else f'MISMATCH: {ds_fac ^ db_fac}'}")

    # Student groups
    db_grp = {r["id"] for r in query_neon_http("SELECT id FROM student_groups;")["rows"]}
    ds_grp = {g["id"] for g in ds["student_groups"]}
    grp_preserved = (ds_grp == db_grp)
    print(f"  Student group identifiers ({len(ds_grp)} expected): {'100% PRESERVED' if grp_preserved else f'MISMATCH: {ds_grp ^ db_grp}'}")

    # Courses
    db_crs = {r["id"] for r in query_neon_http("SELECT id FROM courses;")["rows"]}
    ds_crs = {c["id"] for c in ds["courses"]}
    crs_preserved = (ds_crs == db_crs)
    print(f"  Course identifiers ({len(ds_crs)} expected): {'100% PRESERVED' if crs_preserved else f'MISMATCH: {ds_crs ^ db_crs}'}")

    # Sessions
    db_ses = {r["id"] for r in query_neon_http("SELECT id FROM sessions;")["rows"]}
    ds_ses = {s["id"] for s in ds["sessions"]}
    ses_preserved = (ds_ses == db_ses)
    print(f"  Session identifiers ({len(ds_ses)} expected): {'100% PRESERVED' if ses_preserved else f'MISMATCH: {ds_ses ^ db_ses}'}")

    # Bookings
    db_br = {r["id"] for r in query_neon_http("SELECT id FROM booking_requests;")["rows"]}
    ds_br = {b["id"] for b in ds["booking_requests"]}
    br_preserved = (ds_br == db_br)
    print(f"  Booking request identifiers ({len(ds_br)} expected): {'100% PRESERVED' if br_preserved else f'MISMATCH: {ds_br ^ db_br}'}")

    # Exams
    db_ex = {r["id"] for r in query_neon_http("SELECT id FROM exams;")["rows"]}
    ds_ex = {e["id"] for e in ds["exams"]}
    ex_preserved = (ds_ex == db_ex)
    print(f"  Exam identifiers ({len(ds_ex)} expected): {'100% PRESERVED' if ex_preserved else f'MISMATCH: {ds_ex ^ db_ex}'}")

if __name__ == "__main__":
    run_audit()
