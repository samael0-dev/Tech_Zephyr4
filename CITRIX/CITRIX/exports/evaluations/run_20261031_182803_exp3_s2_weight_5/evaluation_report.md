# Schedule Evaluation Report: exp3_s2_weight_5

- **Timestamp:** 20261031_182803
- **Run Directory:** `exports\evaluations\run_20261031_182803_exp3_s2_weight_5`
- **Solver Status:** **OPTIMAL** (Runtime: 31.79s)
- **Objective Value:** 3.0 (Best Bound: 3.0)
- **S2 Parity:** **EXACT MATCH** (Solver: 0, Validator: 0)

## 1. Official Validator Metrics vs. Baseline

| Metric | Baseline | This Run (exp3_s2_weight_5) | Delta | Status |
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
| **Booking Score** | 65.5 | **64.5** | +-1.0 | Improved |
| **Exam Soft Penalty** | 0 | **0** | 0 | Optimal |

## 2. Solver Internal Diagnostics

- **Branches:** 88,122
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
Bookings: score 64.5 | approved 21, alternatives 2, rejected 2, session overrides 0, priority inversions 0
Exam soft penalty: 0
```
