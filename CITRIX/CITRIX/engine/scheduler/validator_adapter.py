"""Official validator adapter for executing validator.py and parsing results."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Optional


def run_validator_subprocess(
    data_path: str | Path,
    schedule_path: str | Path,
    disruption_path: Optional[str | Path] = None,
    baseline_path: Optional[str | Path] = None,
    validator_path: str | Path = "CrunchWeek_StarterPack/validator.py",
    python_exe: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the official validator.py as an isolated subprocess and return report."""
    if python_exe is None:
        python_exe = sys.executable

    temp_report_path = Path("exports/last_validation_report.json")
    temp_report_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        str(python_exe),
        str(validator_path),
        "--data",
        str(data_path),
        "--schedule",
        str(schedule_path),
        "--json",
        str(temp_report_path),
    ]
    if disruption_path:
        cmd.extend(["--disruption", str(disruption_path)])
    if baseline_path:
        cmd.extend(["--baseline", str(baseline_path)])

    result = subprocess.run(cmd, capture_output=True, text=True)

    if temp_report_path.exists():
        with open(temp_report_path, "r", encoding="utf-8") as f:
            report = json.load(f)
    else:
        report = {
            "error": "Validator report file was not produced",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }

    report["cli_stdout"] = result.stdout
    report["cli_stderr"] = result.stderr
    report["is_valid"] = report.get("hard_violation_count", 999) == 0
    return report


def run_validator_direct(
    data_dict: dict,
    schedule_dict: dict,
    baseline_dict: Optional[dict] = None,
    disruption_dict: Optional[dict] = None,
) -> Dict[str, Any]:
    """Execute validator directly in-process using official validator logic without modifying validator.py."""
    root_dir = Path(__file__).resolve().parents[2]
    starter_pack = root_dir / "CrunchWeek_StarterPack"
    if str(starter_pack) not in sys.path:
        sys.path.insert(0, str(starter_pack))

    import validator  # Official validator module

    data = copy_dict = json.loads(json.dumps(data_dict))
    if disruption_dict:
        data = validator.apply_disruption(data, disruption_dict)

    sched = json.loads(json.dumps(schedule_dict))
    base = json.loads(json.dumps(baseline_dict)) if baseline_dict else None

    rep = validator.run(data, sched, base)
    rep["is_valid"] = rep.get("hard_violation_count", 999) == 0
    return rep
