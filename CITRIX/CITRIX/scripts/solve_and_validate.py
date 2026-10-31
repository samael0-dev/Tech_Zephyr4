"""Script to generate timetable using CP-SAT and validate with official validator.py."""

import json
from pathlib import Path
from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.scheduler.exporter import export_schedule_json
from engine.scheduler.validator_adapter import run_validator_subprocess, run_validator_direct

DATA_PATH = "CrunchWeek_StarterPack/data/cit_public.json"
SCHEDULE_PATH = "exports/schedule_initial.json"

print(f"Loading data from {DATA_PATH}...")
options = SolverOptions(time_limit_seconds=30.0, num_workers=8, optimize_soft=True)

print("Solving timetable CSP/COP with Google OR-Tools CP-SAT...")
result = generate_timetable(DATA_PATH, options)

print(f"Solver finished: Status={result.status}, Time={result.wall_time_seconds:.2f}s, Objective={result.objective_value}")
print(f"Diagnostics: {result.diagnostics}")

if not result.is_feasible:
    print("FAILED: Solver returned infeasible!")
    exit(1)

export_path = export_schedule_json(result.schedule_dict, SCHEDULE_PATH)
print(f"Schedule exported to {export_path}")

print("\nRunning official validator.py directly...")
with open(DATA_PATH, "r", encoding="utf-8") as f:
    raw_data = json.load(f)

# Direct validation
report = run_validator_direct(raw_data, result.schedule_dict)
print(f"\n--- VALIDATION RESULTS ---")
print(f"Hard violation count: {report['hard_violation_count']}")
print(f"Hard by rule: {report['hard_by_rule']}")
for v in report["hard_violations"]:
    print(f"  [{v['rule']}] ({v['where']}) {v['detail']}")

print(f"\nSoft total penalty: {report['soft_total']}")
print(f"Soft penalties: {report['soft_penalties']}")

# Also test subprocess CLI execution
print("\nRunning official validator via CLI subprocess...")
cli_report = run_validator_subprocess(DATA_PATH, SCHEDULE_PATH)
print("CLI Validator Output:")
print(cli_report.get("cli_stdout"))
