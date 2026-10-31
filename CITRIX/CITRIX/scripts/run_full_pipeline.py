"""Master execution pipeline for CampusOS Scheduling Intelligence.
Generates baseline schedule.json, validates it, solves disruption, and validates schedule_after.json.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.scheduler.data_loader import load_dataset
from engine.exams.engine import generate_exam_schedule
from engine.fest.engine import evaluate_fest_week
from engine.rescheduler.engine import reschedule
from engine.scheduler.exporter import export_schedule_json
from engine.scheduler.validator_adapter import run_validator_subprocess, run_validator_direct

DATA_PATH = "CrunchWeek_StarterPack/data/cit_public.json"
DISRUPTION_PATH = "CrunchWeek_StarterPack/examples/sample_disruption.json"
SCHEDULE_PATH = "exports/schedule.json"
SCHEDULE_AFTER_PATH = "exports/schedule_after.json"

print("=" * 70)
print("CAMPUSOS SCHEDULING INTELLIGENCE PIPELINE")
print("=" * 70)

# Load raw dataset
with open(DATA_PATH, "r", encoding="utf-8") as f:
    raw_data = json.load(f)
dataset = load_dataset(raw_data)

# -------------------------------------------------------------
# 1. SOLVE REGULAR TIMETABLE
# -------------------------------------------------------------
print("\n[STEP 1] Generating CP-SAT academic timetable...")
tt_options = SolverOptions(time_limit_seconds=30.0, num_workers=8, optimize_soft=True)
tt_result = generate_timetable(dataset, tt_options)
print(f"  Status: {tt_result.status} (Time: {tt_result.wall_time_seconds:.2f}s)")
if not tt_result.is_feasible:
    print("FATAL: Academic timetable infeasible!")
    exit(1)

# -------------------------------------------------------------
# 2. SOLVE EXAM SCHEDULE
# -------------------------------------------------------------
print("\n[STEP 2] Generating CP-SAT exam schedule...")
exam_result = generate_exam_schedule(dataset, time_limit=15.0)
print(f"  Status: {exam_result.status} (Time: {exam_result.wall_time_seconds:.2f}s, Soft penalty: {exam_result.soft_penalty})")
if not exam_result.is_feasible:
    print("FATAL: Exam schedule infeasible!")
    exit(1)

# -------------------------------------------------------------
# 3. SOLVE SPECTRA WEEK BOOKINGS
# -------------------------------------------------------------
print("\n[STEP 3] Evaluating Spectra Week (Fest Week) bookings...")
fest_week_result = evaluate_fest_week(raw_data, tt_result.sessions)
print(f"  Processed {len(fest_week_result['bookings'])} booking decisions, {len(fest_week_result['session_overrides'])} overrides.")

# -------------------------------------------------------------
# 4. ASSEMBLE & EXPORT BASELINE schedule.json
# -------------------------------------------------------------
print(f"\n[STEP 4] Assembling full schedule and exporting to {SCHEDULE_PATH}...")
schedule_dict = {
    "team": "CampusOS Intelligence",
    "dataset_id": dataset.dataset_id,
    "sessions": sorted(tt_result.sessions, key=lambda s: s["session_id"]),
    "fest_week": fest_week_result,
    "exams": exam_result.assignments,
}
export_schedule_json(schedule_dict, SCHEDULE_PATH)

# -------------------------------------------------------------
# 5. VALIDATE BASELINE SCHEDULE WITH OFFICIAL VALIDATOR
# -------------------------------------------------------------
print("\n[STEP 5] Validating baseline schedule with official validator.py...")
rep_base = run_validator_subprocess(DATA_PATH, SCHEDULE_PATH)
print("---------------------------------------------------------------")
print(rep_base.get("cli_stdout", "").strip())
print("---------------------------------------------------------------")

if rep_base.get("hard_violation_count", 999) > 0:
    print(f"FAILED: Found {rep_base['hard_violation_count']} hard violations!")
    for v in rep_base.get("hard_violations", []):
        print(f"  [{v['rule']}] ({v['where']}) {v['detail']}")
    exit(1)
else:
    print("SUCCESS: Zero hard violations on baseline schedule!")

# -------------------------------------------------------------
# 6. SOLVE DISRUPTION RESCHEDULING
# -------------------------------------------------------------
print(f"\n[STEP 6] Rescheduling after applying disruption from {DISRUPTION_PATH}...")
with open(DISRUPTION_PATH, "r", encoding="utf-8") as f:
    disruption_data = json.load(f)

resched_result = reschedule(schedule_dict, disruption_data, raw_data, time_limit_seconds=30.0)
print(f"  Status: {resched_result.status} (Time: {resched_result.wall_time_seconds:.2f}s)")
print(f"  Sessions moved: {resched_result.sessions_moved} (Time changed: {resched_result.time_changed}, Room only: {resched_result.room_only_changed})")
print(f"  Moved session IDs: {resched_result.diagnostics.get('moved_ids')}")

if not resched_result.is_feasible:
    print("FATAL: Rescheduling infeasible!")
    exit(1)

export_schedule_json(resched_result.schedule_dict, SCHEDULE_AFTER_PATH)
print(f"  Exported repaired schedule to {SCHEDULE_AFTER_PATH}")

# -------------------------------------------------------------
# 7. VALIDATE REPAIRED SCHEDULE WITH OFFICIAL VALIDATOR
# -------------------------------------------------------------
print("\n[STEP 7] Validating repaired schedule with official validator.py...")
rep_after = run_validator_subprocess(
    data_path=DATA_PATH,
    schedule_path=SCHEDULE_AFTER_PATH,
    disruption_path=DISRUPTION_PATH,
    baseline_path=SCHEDULE_PATH,
)
print("---------------------------------------------------------------")
print(rep_after.get("cli_stdout", "").strip())
print("---------------------------------------------------------------")

if rep_after.get("hard_violation_count", 999) > 0:
    print(f"FAILED: Found {rep_after['hard_violation_count']} hard violations on schedule_after!")
    for v in rep_after.get("hard_violations", []):
        print(f"  [{v['rule']}] ({v['where']}) {v['detail']}")
    exit(1)
else:
    print("SUCCESS: Zero hard violations on schedule_after.json!")

print("\n" + "=" * 70)
print("ALL CP-SAT SCHEDULES GENERATED AND OFFICIALLY VALIDATED!")
print("=" * 70)
