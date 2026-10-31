"""Migrate user accounts and credentials from campus_ops.db into Neon PostgreSQL."""
import os
import sys
import sqlite3
from dotenv import load_dotenv

load_dotenv(".env")
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "CITRIX", "CITRIX"))

from api.database import execute_query, test_connection

def migrate_users():
    print("=" * 65)
    print("MIGRATING USER ACCOUNTS FROM SQLITE TO NEON POSTGRESQL")
    print("=" * 65)

    conn_info = test_connection()
    if not conn_info.get("success"):
        print(f"[ERROR] Database connection failed: {conn_info.get('error')}")
        sys.exit(1)

    sqlite_conn = sqlite3.connect("campus_ops.db")
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_users = sqlite_conn.execute("SELECT * FROM users;").fetchall()
    print(f"[INFO] Discovered {len(sqlite_users)} users in campus_ops.db")

    neon_users_res = execute_query("SELECT id, email, full_name, department_code FROM users;")
    neon_user_map = {r["id"]: r for r in neon_users_res}
    print(f"[INFO] Currently {len(neon_user_map)} users in Neon PostgreSQL")

    updated_count = 0
    inserted_count = 0

    for s_user in sqlite_users:
        u_dict = dict(s_user)
        fid = u_dict.get("faculty_id")

        # 1. If user corresponds to faculty F01..F40 already in Neon
        if fid and fid in neon_user_map:
            sql = """
            UPDATE users 
            SET username = $1,
                email = $2,
                hashed_password = $3,
                role = $4,
                faculty_id = $5,
                department_code = $6,
                is_active = $7
            WHERE id = $8;
            """
            execute_query(sql, [
                u_dict["username"],
                u_dict["email"],
                u_dict["hashed_password"],
                u_dict["role"],
                fid,
                u_dict["department"],
                bool(u_dict["is_active"]),
                fid
            ])
            updated_count += 1
            print(f"  [UPDATED FACULTY] {fid} -> username={u_dict['username']}, email={u_dict['email']}")

        # 2. If user is a persona/admin/student/club/coordinator not in Neon
        elif u_dict["id"] not in neon_user_map:
            # Check if email or username conflicts
            email_check = execute_query("SELECT id FROM users WHERE email = $1 OR username = $2;", [u_dict["email"], u_dict["username"]])
            if not email_check:
                insert_sql = """
                INSERT INTO users (id, username, email, full_name, hashed_password, role, department_code, faculty_id, student_group_id, club_name, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                """
                execute_query(insert_sql, [
                    u_dict["id"],
                    u_dict["username"],
                    u_dict["email"],
                    u_dict["name"],
                    u_dict["hashed_password"],
                    u_dict["role"],
                    u_dict["department"],
                    u_dict.get("faculty_id"),
                    u_dict.get("student_group_id"),
                    u_dict.get("club_name"),
                    bool(u_dict["is_active"])
                ])
                # Also link to user_roles
                role_id = u_dict["role"]
                # In Neon roles, department_coordinator is 'department_coordinator'
                execute_query(
                    "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;",
                    [u_dict["id"], role_id]
                )
                inserted_count += 1
                print(f"  [INSERTED USER] {u_dict['id']} ({u_dict['username']}) -> role={u_dict['role']}")

    sqlite_conn.close()

    total_neon_after = execute_query("SELECT count(*) as c FROM users;")[0]["c"]
    print("=" * 65)
    print(f"[SUCCESS] User Migration Complete!")
    print(f"  Updated Faculty Users:  {updated_count}")
    print(f"  Inserted Persona Users: {inserted_count}")
    print(f"  Total Neon Users Now:   {total_neon_after}")
    print("=" * 65)

if __name__ == "__main__":
    migrate_users()
