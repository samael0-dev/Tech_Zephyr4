"""Audit generated schedule JSON, session counts, and execute official validator."""

import json
import os
import subprocess
import sys

DATA_PATH = "CrunchWeek_StarterPack/data/cit_public.json"
SCHEDULE_PATH = "exports/schedule.json"
VALIDATOR_PATH = "CrunchWeek_StarterPack/validator.py"

def main():
    print("=" * 80)
    print("TIMETABLE & OFFICIAL VALIDATOR AUDIT")
    print("=" * 80)

    # 1. Exact file paths
    print(f"Dataset path:  {os.path.abspath(DATA_PATH)}")
    print(f"Schedule path: {os.path.abspath(SCHEDULE_PATH)}")
    print(f"Validator:     {os.path.abspath(VALIDATOR_PATH)}")

    # 2. Check session integrity
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    with open(SCHEDULE_PATH, "r", encoding="utf-8") as f:
        sched = json.load(f)

    expected_sessions = [s["id"] for s in data["sessions"]]
    actual_sessions = [s["session_id"] for s in sched["sessions"]]

    print(f"\nExpected sessions count in dataset: {len(expected_sessions)}")
    print(f"Actual sessions count in schedule:  {len(actual_sessions)}")

    # Check for duplicates in schedule
    from collections import Counter
    counts = Counter(actual_sessions)
    duplicates = {s: c for s, c in counts.items() if c > 1}
    missing = set(expected_sessions) - set(actual_sessions)
    unexpected = set(actual_sessions) - set(expected_sessions)

    print(f"Duplicate sessions in schedule:     {duplicates or 'NONE (all unique)'}")
    print(f"Missing sessions in schedule:       {missing or 'NONE (0 missing)'}")
    print(f"Unexpected sessions in schedule:    {unexpected or 'NONE (0 unexpected)'}")
    print(f"Are all 189 sessions present exactly once? {'YES [VERIFIED]' if len(actual_sessions) == 189 and not duplicates and not missing else 'NO'}")

    # 3. Execute official validator with text and JSON outputs
    print("\n--- OFFICIAL VALIDATOR EXECUTION ---")
    cmd = [
        sys.executable,
        VALIDATOR_PATH,
        "--data", DATA_PATH,
        "--schedule", SCHEDULE_PATH,
    ]
    res_text = subprocess.run(cmd, capture_output=True, text=True)
    print("Standard text output:")
    print(res_text.stdout)
    if res_text.stderr:
        print("Standard error:")
        print(res_text.stderr)

    cmd_json = [
        sys.executable,
        VALIDATOR_PATH,
        "--data", DATA_PATH,
        "--schedule", SCHEDULE_PATH,
        "--json",
    ]
    res_json = subprocess.run(cmd_json, capture_output=True, text=True)
    report = json.loads(res_json.stdout)

    print("\n--- VALIDATION REPORT PARSED ---")
    print(f"Hard constraint violations count: {len(report.get('hard_violations', []))}")
    print(f"Hard violations details:          {report.get('hard_violations', [])}")
    print(f"Soft penalties breakdown:         {report.get('soft_penalties', {})}")
    print(f"Total soft penalty:               {report.get('total_soft_penalty')}")
    print(f"Fest bookings score:              {report.get('fest_bookings_score')}")
    print(f"Fest bookings breakdown:          {report.get('fest_bookings', {})}")
    print(f"Exam penalty:                     {report.get('exam_penalty')}")

if __name__ == "__main__":
    main()
