import json
import os
import subprocess
import tempfile
from typing import Any, Dict, Optional
from app.core.config import settings


def run_official_validator(
    schedule_dict: Dict[str, Any],
    disruption_path: Optional[str] = None,
    baseline_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Safely executes the official validator.py as an isolated subprocess,
    capturing JSON metrics, hard constraint violations, soft penalties,
    and booking scores without modifying the validator.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    validator_path = os.path.join(base_dir, settings.STARTER_PACK_DIR, "validator.py")
    dataset_path = os.path.join(base_dir, settings.DATASET_PATH)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as sched_f:
        json.dump(schedule_dict, sched_f)
        temp_sched_path = sched_f.name

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as rep_f:
        temp_rep_path = rep_f.name

    try:
        cmd = [
            "python",
            validator_path,
            "--data",
            dataset_path,
            "--schedule",
            temp_sched_path,
            "--json",
            temp_rep_path,
            "--quiet",
        ]
        if disruption_path:
            cmd.extend(["--disruption", disruption_path])
        if baseline_path:
            cmd.extend(["--baseline", baseline_path])

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
        )

        if os.path.exists(temp_rep_path) and os.path.getsize(temp_rep_path) > 0:
            with open(temp_rep_path, "r", encoding="utf-8") as f:
                report_data = json.load(f)
            return {
                "success": True,
                "exit_code": result.returncode,
                "report": report_data,
                "stdout": result.stdout,
            }
        else:
            return {
                "success": False,
                "error": result.stderr or "Validator did not generate output report",
                "stdout": result.stdout,
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
    finally:
        if os.path.exists(temp_sched_path):
            os.remove(temp_sched_path)
        if os.path.exists(temp_rep_path):
            os.remove(temp_rep_path)
