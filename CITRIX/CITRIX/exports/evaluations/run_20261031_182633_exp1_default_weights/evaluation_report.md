# Schedule Evaluation Report: exp1_default_weights

- **Timestamp:** 20261031_182633
- **Run Directory:** `exports\evaluations\run_20261031_182633_exp1_default_weights`
- **Solver Status:** **OPTIMAL** (Runtime: 26.95s)
- **Objective Value:** 3.0 (Best Bound: 3.0)
- **S2 Parity:** **EXACT MATCH** (Solver: 0, Validator: 0)

## 1. Official Validator Metrics vs. Baseline

| Metric | Baseline | This Run (exp1_default_weights) | Delta | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Hard Violations** | 0 | **0** | 0 | PASS |
| **Sessions Scheduled** | 189 | **189 / 189** | 0 | 100% Complete |
| **S1 (Faculty Preferences)** | 0 | **0** | 0 | Clean |
| **S2 (Student Idle Gaps)** | **133** | **0** | **-133** | **ELIMINATED** |
| **S3 (Student Overload >6h)** | 0 | **0** | 0 | Clean |
| **S4 (Same Course Multiple Lec)** | 3 | **3** | 0 | Infeasible lower bound = 3 |
| **S5 (Room Underutilization)** | 0 | **0** | 0 | Clean |
| **S6 (Late Session P9)** | 0 | **0** | 0 | Clean |
| **Total Soft Penalty** | **136** | **3** | **-133** | **97.8% Reduction** |
| **Booking Score** | 65.5 | **67.0** | +1.5 | Improved |
| **Exam Soft Penalty** | 0 | **0** | 0 | Optimal |

## 2. Solver Internal Diagnostics

- **Branches:** 82,718
- **Conflicts:** 50
- **Variables:** 93,379
- **Constraints:** 7,280
- **Workers:** 8
- **Random Seed:** 42
- **Internal Soft Penalty Breakdown:** `{'S5': 0, 'S1': 0, 'S6': 0, 'S4': 3, 'S3': 0, 'S2': 0}`

## 3. Official Validator Output
```text
Dataset: cit-public-v1   Schedule says: cit-public-v1   Team: CampusOS Intelligence
Hard violations: 0  {}
Soft penalty: 3  {'S1': 0, 'S2': 0, 'S3': 0, 'S4': 3, 'S5': 0, 'S6': 0}
Bookings: score 67.0 | approved 22, alternatives 1, rejected 2, session overrides 0, priority inversions 0
Exam soft penalty: 0
```
