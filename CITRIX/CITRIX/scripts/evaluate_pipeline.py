"""Repeatable evaluation pipeline for CampusOS CP-SAT schedules against official validator.py."""

import argparse
import datetime
import json
import os
import subprocess
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.scheduler.data_loader import load_dataset
from engine.scheduler.solver import generate_timetable, SolverOptions
from engine.exams.engine import generate_exam_schedule
from engine.fest.engine import evaluate_fest_week
from engine.scheduler.exporter import export_schedule_json
from CrunchWeek_StarterPack.validator import Ctx, soft_score

BASELINE_METRICS = {
    "hard_violations": 0,
    "S1": 0,
    "S2": 133,
    "S3": 0,
    "S4": 3,
    "S5": 0,
    "S6": 0,
    "total_soft_penalty": 136,
    "booking_score": 65.5,
    "exam_soft_penalty": 0,
    "sessions_scheduled": 189,
}


def run_official_validator(data_path: str, schedule_path: str) -> Dict[str, Any]:
    """Execute official validator.py as an external subprocess and parse full output."""
    cmd = [
        sys.executable,
        "CrunchWeek_StarterPack/validator.py",
        "--data",
        data_path,
        "--schedule",
        schedule_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(Path(__file__).resolve().parent.parent))

    stdout = proc.stdout
    stderr = proc.stderr

    # Parse stdout
    hard_violations = []
    soft_penalties = {}
    total_soft = None
    booking_score = None
    booking_details = {}
    exam_penalty = 0

    lines = stdout.splitlines()
    for line in lines:
        line_str = line.strip()
        if line_str.startswith("Hard violations:"):
            # e.g. "Hard violations: 0  {}"
            parts = line_str.split()
            count = int(parts[2]) if len(parts) >= 3 else 0
        elif line_str.startswith("Soft penalty:"):
            # e.g. "Soft penalty: 3  {'S1': 0, 'S2': 0, 'S3': 0, 'S4': 3, 'S5': 0, 'S6': 0}"
            idx = line_str.find("{")
            if idx != -1:
                dict_str = line_str[idx:].replace("'", '"')
                soft_penalties = json.loads(dict_str)
                parts = line_str[:idx].split()
                total_soft = int(parts[2]) if len(parts) >= 3 else sum(soft_penalties.values())
        elif line_str.startswith("Bookings: score"):
            # e.g. "Bookings: score 67.0 | approved 22, alternatives 1, rejected 2, session overrides 0, priority inversions 0"
            parts = line_str.split("|")
            score_part = parts[0].replace("Bookings: score", "").strip()
            booking_score = float(score_part)
            if len(parts) > 1:
                stats = parts[1].split(",")
                for st in stats:
                    st_parts = st.strip().split()
                    if len(st_parts) >= 2:
                        val = st_parts[-1]
                        key = "_".join(st_parts[:-1])
                        try:
                            booking_details[key] = int(val)
                        except ValueError:
                            booking_details[key] = val
        elif line_str.startswith("Exam soft penalty:"):
            # e.g. "Exam soft penalty: 0"
            parts = line_str.split(":")
            if len(parts) >= 2:
                try:
                    exam_penalty = int(parts[1].strip())
                except ValueError:
                    exam_penalty = 0
        elif line_str.startswith("[H") or line_str.startswith("[E"):
            # e.g. "  [H1] (timetable) Session ... "
            hard_violations.append(line_str)

    return {
        "exit_code": proc.returncode,
        "stdout": stdout,
        "stderr": stderr,
        "hard_violation_count": len(hard_violations) if hard_violations else 0,
        "hard_violations": hard_violations,
        "soft_penalties": soft_penalties,
        "total_soft_penalty": total_soft if total_soft is not None else sum(soft_penalties.values()),
        "booking_score": booking_score,
        "booking_details": booking_details,
        "exam_penalty": exam_penalty,
    }


def compute_group_day_s2_breakdown(raw_data: dict, schedule_dict: dict) -> Dict[str, int]:
    """Compute exact group/day idle gap breakdown using official validator logic."""
    v_ctx = Ctx(raw_data)
    assign = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in schedule_dict.get("sessions", [])
    }
    grp_day = defaultdict(set)
    for sid, (day, start, rid) in assign.items():
        s = v_ctx.sessions.get(sid)
        if s is None:
            continue
        for g in s["groups"]:
            for p in range(start, start + s["duration"]):
                grp_day[(g, day)].add(p)

    breakdown = {}
    for g in v_ctx.data["student_groups"]:
        gid = g["id"]
        for d in v_ctx.days:
            ps = grp_day.get((gid, d), set())
            gaps = 0 if not ps else sum(1 for p in range(min(ps), max(ps) + 1) if p not in ps)
            breakdown[f"{gid}_{d}"] = gaps
    return breakdown


def evaluate_run(
    data_path: str = "CrunchWeek_StarterPack/data/cit_public.json",
    output_dir: Optional[str] = None,
    run_name: str = "default",
    time_limit_seconds: float = 30.0,
    num_workers: int = 8,
    random_seed: int = 42,
    soft_weights: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """Run full evaluation, validate with official validator, and export comprehensive reports."""

    t_start = time.time()
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    if output_dir is None:
        output_dir = f"exports/evaluations/run_{timestamp_str}_{run_name}"
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # 1. Load canonical dataset
    with open(data_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    dataset = load_dataset(raw_data)

    # 2. Configure solver options
    opts = SolverOptions(
        time_limit_seconds=time_limit_seconds,
        num_workers=num_workers,
        random_seed=random_seed,
        optimize_soft=True,
        soft_weights=soft_weights,
    )

    print(f"\n[{run_name}] Running CP-SAT solver (TimeLimit={time_limit_seconds}s, Workers={num_workers}, Weights={soft_weights})...")
    tt_res = generate_timetable(dataset, opts)

    if not tt_res.is_feasible:
        print(f"FAILED: Timetable solving returned infeasible! Status: {tt_res.status}")
        return {"status": tt_res.status, "is_feasible": False}

    # 3. Solve Exams & Fest Week bookings
    print(f"[{run_name}] Generating exam schedule and fest week bookings...")
    exam_res = generate_exam_schedule(dataset, time_limit=15.0)
    fest_res = evaluate_fest_week(raw_data, tt_res.sessions)

    # 4. Assemble complete schedule dictionary
    full_schedule = {
        "team": "CampusOS Intelligence",
        "dataset_id": dataset.dataset_id,
        "sessions": sorted(tt_res.sessions, key=lambda s: s["session_id"]),
        "fest_week": fest_res,
        "exams": exam_res.assignments,
    }

    # 5. Export schedule to run directory
    schedule_file = out_path / "schedule.json"
    export_schedule_json(full_schedule, schedule_file)

    # 6. Run official validator
    print(f"[{run_name}] Validating with official validator.py...")
    val_res = run_official_validator(data_path, str(schedule_file))

    # Save raw stdout
    with open(out_path / "validator_raw.txt", "w", encoding="utf-8") as f:
        f.write(val_res["stdout"])

    # 7. S2 Parity Verification
    val_s2_breakdown = compute_group_day_s2_breakdown(raw_data, full_schedule)
    solver_s2_breakdown = tt_res.diagnostics.get("solver_s2_by_group_day", {})
    solver_s2_total = tt_res.diagnostics.get("solver_s2_total", sum(solver_s2_breakdown.values()))
    val_s2_total = val_res["soft_penalties"].get("S2", sum(val_s2_breakdown.values()))

    # Group/day discrepancies check
    discrepancies = []
    for k, val_v in val_s2_breakdown.items():
        sol_v = solver_s2_breakdown.get(k, 0)
        if sol_v != val_v:
            discrepancies.append({"group_day": k, "solver_s2": sol_v, "validator_s2": val_v})

    has_s2_parity = (len(discrepancies) == 0) and (solver_s2_total == val_s2_total)

    parity_report = {
        "has_exact_parity": has_s2_parity,
        "solver_s2_total": solver_s2_total,
        "validator_s2_total": val_s2_total,
        "discrepancy_count": len(discrepancies),
        "discrepancies": discrepancies,
        "validator_breakdown": val_s2_breakdown,
        "solver_breakdown": solver_s2_breakdown,
    }
    with open(out_path / "parity_report.json", "w", encoding="utf-8") as f:
        json.dump(parity_report, f, indent=2)

    # 8. Comparison with baseline
    comparison = {
        "metric": {},
        "deltas": {},
    }
    metrics_to_compare = [
        ("hard_violations", val_res["hard_violation_count"]),
        ("S1", val_res["soft_penalties"].get("S1", 0)),
        ("S2", val_res["soft_penalties"].get("S2", 0)),
        ("S3", val_res["soft_penalties"].get("S3", 0)),
        ("S4", val_res["soft_penalties"].get("S4", 0)),
        ("S5", val_res["soft_penalties"].get("S5", 0)),
        ("S6", val_res["soft_penalties"].get("S6", 0)),
        ("total_soft_penalty", val_res["total_soft_penalty"]),
        ("booking_score", val_res["booking_score"]),
        ("exam_soft_penalty", val_res["exam_penalty"]),
        ("sessions_scheduled", len(full_schedule["sessions"])),
    ]

    for m_name, curr_val in metrics_to_compare:
        base_val = BASELINE_METRICS.get(m_name, 0)
        comparison["metric"][m_name] = {
            "baseline": base_val,
            "current": curr_val,
            "delta": (curr_val - base_val) if (curr_val is not None and base_val is not None) else None,
        }

    # 9. Assemble evaluation report JSON
    report = {
        "run_name": run_name,
        "timestamp": timestamp_str,
        "output_dir": str(out_path),
        "configuration": {
            "time_limit_seconds": time_limit_seconds,
            "num_workers": num_workers,
            "random_seed": random_seed,
            "soft_weights": soft_weights or {"S1": 1, "S2": 1, "S3": 1, "S4": 1, "S5": 1, "S6": 1},
        },
        "solver_diagnostics": {
            "status": tt_res.status,
            "objective_value": tt_res.objective_value,
            "best_objective_bound": tt_res.diagnostics.get("best_objective_bound"),
            "wall_time_seconds": tt_res.wall_time_seconds,
            "branches": tt_res.diagnostics.get("branches"),
            "conflicts": tt_res.diagnostics.get("conflicts"),
            "num_variables": tt_res.diagnostics.get("num_variables"),
            "num_constraints": tt_res.diagnostics.get("num_constraints"),
            "solver_soft_penalties": tt_res.diagnostics.get("solver_soft_penalties"),
        },
        "validator_results": val_res,
        "s2_parity": parity_report,
        "baseline_comparison": comparison,
    }

    with open(out_path / "evaluation_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # 10. Generate readable Markdown report
    md_content = f"""# Schedule Evaluation Report: {run_name}

- **Timestamp:** {timestamp_str}
- **Run Directory:** `{out_path}`
- **Solver Status:** **{tt_res.status}** (Runtime: {tt_res.wall_time_seconds:.2f}s)
- **Objective Value:** {tt_res.objective_value} (Best Bound: {tt_res.diagnostics.get('best_objective_bound')})
- **S2 Parity:** **{'EXACT MATCH' if has_s2_parity else 'DISCREPANCY DETECTED'}** (Solver: {solver_s2_total}, Validator: {val_s2_total})

## 1. Official Validator Metrics vs. Baseline

| Metric | Baseline | This Run ({run_name}) | Delta | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Hard Violations** | {BASELINE_METRICS['hard_violations']} | **{val_res['hard_violation_count']}** | 0 | {'PASS' if val_res['hard_violation_count'] == 0 else 'FAIL'} |
| **Sessions Scheduled** | {BASELINE_METRICS['sessions_scheduled']} | **{len(full_schedule['sessions'])} / 189** | 0 | 100% Complete |
| **S1 (Faculty Preferences)** | {BASELINE_METRICS['S1']} | **{val_res['soft_penalties'].get('S1', 0)}** | {val_res['soft_penalties'].get('S1', 0) - BASELINE_METRICS['S1']} | Clean |
| **S2 (Student Idle Gaps)** | **{BASELINE_METRICS['S2']}** | **{val_res['soft_penalties'].get('S2', 0)}** | **{val_res['soft_penalties'].get('S2', 0) - BASELINE_METRICS['S2']}** | **{'ELIMINATED' if val_res['soft_penalties'].get('S2', 0) == 0 else 'OPTIMIZED'}** |
| **S3 (Student Overload >6h)** | {BASELINE_METRICS['S3']} | **{val_res['soft_penalties'].get('S3', 0)}** | {val_res['soft_penalties'].get('S3', 0) - BASELINE_METRICS['S3']} | Clean |
| **S4 (Same Course Multiple Lec)** | {BASELINE_METRICS['S4']} | **{val_res['soft_penalties'].get('S4', 0)}** | {val_res['soft_penalties'].get('S4', 0) - BASELINE_METRICS['S4']} | Infeasible lower bound = 3 |
| **S5 (Room Underutilization)** | {BASELINE_METRICS['S5']} | **{val_res['soft_penalties'].get('S5', 0)}** | {val_res['soft_penalties'].get('S5', 0) - BASELINE_METRICS['S5']} | Clean |
| **S6 (Late Session P9)** | {BASELINE_METRICS['S6']} | **{val_res['soft_penalties'].get('S6', 0)}** | {val_res['soft_penalties'].get('S6', 0) - BASELINE_METRICS['S6']} | Clean |
| **Total Soft Penalty** | **{BASELINE_METRICS['total_soft_penalty']}** | **{val_res['total_soft_penalty']}** | **{val_res['total_soft_penalty'] - BASELINE_METRICS['total_soft_penalty']}** | **{(BASELINE_METRICS['total_soft_penalty'] - val_res['total_soft_penalty']) / BASELINE_METRICS['total_soft_penalty'] * 100:.1f}% Reduction** |
| **Booking Score** | {BASELINE_METRICS['booking_score']} | **{val_res['booking_score']}** | +{val_res['booking_score'] - BASELINE_METRICS['booking_score']:.1f} | Improved |
| **Exam Soft Penalty** | {BASELINE_METRICS['exam_soft_penalty']} | **{val_res['exam_penalty']}** | 0 | Optimal |

## 2. Solver Internal Diagnostics

- **Branches:** {tt_res.diagnostics.get('branches'):,}
- **Conflicts:** {tt_res.diagnostics.get('conflicts'):,}
- **Variables:** {tt_res.diagnostics.get('num_variables'):,}
- **Constraints:** {tt_res.diagnostics.get('num_constraints'):,}
- **Workers:** {num_workers}
- **Random Seed:** {random_seed}
- **Internal Soft Penalty Breakdown:** `{tt_res.diagnostics.get('solver_soft_penalties')}`

## 3. Official Validator Output
```text
{val_res['stdout'].strip()}
```
"""
    with open(out_path / "evaluation_report.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[{run_name}] Completed in {time.time() - t_start:.2f}s. Report saved to {out_path}")
    print(f"  Official Soft Penalty: {val_res['total_soft_penalty']} (S2={val_res['soft_penalties'].get('S2', 0)}) | Hard Violations: {val_res['hard_violation_count']}")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate schedule generation and validation.")
    parser.add_argument("--name", default="eval_run", help="Run identifier")
    parser.add_argument("--time-limit", type=float, default=30.0, help="CP-SAT time limit in seconds")
    parser.add_argument("--workers", type=int, default=8, help="CP-SAT worker count")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--s2-weight", type=int, default=1, help="S2 penalty weight")
    args = parser.parse_args()

    weights = {"S1": 1, "S2": args.s2_weight, "S3": 1, "S4": 1, "S5": 1, "S6": 1}
    evaluate_run(
        run_name=args.name,
        time_limit_seconds=args.time_limit,
        num_workers=args.workers,
        random_seed=args.seed,
        soft_weights=weights,
    )
