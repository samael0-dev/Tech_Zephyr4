"""Script to test connectivity to Neon PostgreSQL database."""

import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api.database import test_connection, mask_database_url


def main():
    print("=" * 65)
    print("NEON POSTGRESQL DATABASE CONNECTIVITY TEST")
    print("=" * 65)

    res = test_connection()

    if res["status"] == "missing_configuration":
        print("\n[CONFIG REQUIRED] DATABASE_URL is not set!")
        print("Please configure your DATABASE_URL in a `.env` file or environment variable:")
        print("  DATABASE_URL=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require\n")
        print("Error details:", res["error"])
        sys.exit(2)

    print(f"Target Database: {res.get('masked_url')}")

    if res["success"]:
        print(f"\n[SUCCESS] Connected to Neon PostgreSQL successfully via {res.get('transport')}!")
        print(f"Server Version:\n  {res.get('server_version')}")
        if res.get("network_note"):
            print(f"\nNetwork Diagnostic:\n  {res.get('network_note')}")
        print("\nIntegrity Note: No database tables were created, modified, or dropped.")
        sys.exit(0)
    else:
        print("\n[ERROR] Failed to connect to database:")
        print(f"  {res.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
