# CampusOS Scheduling Intelligence & AI System Specifications
## Chilika Institute of Technology (CIT) — CrunchWeek

---

## 1. Architectural Philosophy & Principle

> **Core architectural principle: AI understands and communicates. Deterministic engines validate and decide.**

In CampusOS:
- **LLM / AI Layer** handles natural-language parsing (English and Hinglish), intent extraction, user interaction, explanation generation, and RAG retrieval over institutional policies.
- **Deterministic Engines (Google OR-Tools CP-SAT)** model the mathematical constraint satisfaction and optimization problem (CSP/COP), finding globally optimal or strictly feasible assignments.
- **Official Validator (`validator.py`)** is the sole and ultimate ground truth for schedule validity and penalty metrics. No solution is considered valid until `validator.py` evaluates it with zero hard violations.

---

## 2. Temporal & Spatial Problem Model

### 2.1 Calendar & Period Discretization
Regular academic schedule operates across 5 days:
$$\text{Days} = \{\text{MON}, \text{TUE}, \text{WED}, \text{THU}, \text{FRI}\}$$

Discretized daily periods $p \in \{1, 2, \dots, 13\}$:
- **Teaching Periods (Regular Classes):** $P1$ through $P9$ ($p \in [1, 9]$)
  - $P1$: 08:00 – 09:00
  - $P2$: 09:00 – 10:00
  - $P3$: 10:00 – 11:00
  - $P4$: 11:00 – 12:00
  - $P5$: 12:00 – 13:00
  - **Lunch Interval:** 13:00 – 14:00 (strictly after $P5$, before $P6$)
  - $P6$: 14:00 – 15:00
  - $P7$: 15:00 – 16:00
  - $P8$: 16:00 – 17:00
  - $P9$: 17:00 – 18:00
- **Evening Event Periods:** $P10$ through $P13$ ($p \in [10, 13]$, 18:00 – 22:00) reserved exclusively for events and bookings.

### 2.2 Dataset Entities
- **Rooms ($R = 27$):** Classified by `type` (`classroom`, `lecture_hall`, `auditorium`, `seminar_hall`, `outdoor`, `lab_cs`, `lab_elec`, `lab_phy`, `workshop`, `lab_civil`), `capacity`, `features` (e.g., `projector`, `stage`, `pa_system`, `wifi`, `computers`), `accessible` (boolean flag), and `allowed_uses` (subset of `{"lecture", "tutorial", "lab", "exam", "event"}`).
- **Faculty ($F = 40$):** Attributes include `max_hours_per_day` (default 4), `needs_accessible`, hard `unavailable` blocks, and soft `preferences` (penalty avoidance blocks).
- **Student Groups ($G = 14$):** Cohorts including Year 1 (`Y1-A` through `Y1-D`), Year 2 and Year 3 departmental branches (`CSE-2`, `CSE-3`, `ECE-2`, `ECE-3`, `ME-2`, `ME-3`, `CE-2`, `CE-3`, `EE-2`, `EE-3`).
- **Sessions ($S = 189$):** 153 lectures, 27 labs (3-hour blocks), 9 tutorials (1-hour blocks). Each session $s \in S$ requires assigning $(day, start\_period, room\_id)$.
- **Exams ($E = 41$):** Midsem exams occurring in dedicated exam week (MON–SAT, AM/PM sessions).
- **Spectra Week Bookings ($B = 25$):** Event booking requests during Week 7 with role priority caps.

---

## 3. Official Validator Constraint Catalog

### 3.1 Hard Constraints (Zero Violations Permitted)

| Code | Rule Description | Mathematical / Logic Formulation |
| :--- | :--- | :--- |
| **H1** | **Session Existence & Validity** | Every session $s \in S$ must be scheduled exactly once. Day $\in \{\text{MON}\dots\text{FRI}\}$, room $r \in R$, session id must exist in dataset and appear at most once. |
| **H2** | **Faculty Clash Prevention** | A faculty member $f$ cannot teach multiple sessions concurrently: $\sum_{s \in S(f)} \mathbb{I}(p \in \text{periods}(s)) \le 1, \quad \forall (f, day, p)$. |
| **H3** | **Student Group Clash Prevention** | A student group $g$ cannot attend overlapping sessions, **except** sessions sharing the identical `basket_slot`. Distinct session keys occupying $(g, day, p)$ must be $\le 1$. |
| **H4** | **Room Clash Prevention** | A room $r$ can host at most one teaching session at any $(day, p)$: $\sum_{s \in S(r)} \mathbb{I}(p \in \text{periods}(s)) \le 1$. |
| **H5** | **Room Capacity** | Room capacity must accommodate session size: $\text{capacity}(r) \ge \text{size}(s)$. |
| **H6** | **Room Type Compatibility** | Assigned room type must belong to session's allowed types: $\text{type}(r) \in \text{room\_types}(s)$. |
| **H7** | **Faculty Unavailability** | No session can occupy a $(day, p)$ where assigned faculty $f(s)$ is marked unavailable in `faculty.unavailable`. |
| **H8** | **Room Unavailability** | No session can occupy $(day, p)$ where assigned room $r$ is marked unavailable in `room_unavailability`. |
| **H9** | **Session Timing & Boundary** | $start \ge 1$ and $start + \text{duration}(s) - 1 \le 9$. A session cannot span across lunch ($P5$ and $P6$ simultaneously). Labs ($\text{duration} = 3$) must start strictly at $P2$ or $P6$. |
| **H10** | **Accessibility Mandate** | If session has $\text{needs\_accessible} = \text{true}$, assigned room must have $\text{accessible} = \text{true}$. |
| **H11** | **Elective Basket Synchronization** | All sessions belonging to the same `basket_slot` (e.g. `OEB-1`, `OEB-2`, `OEB-3`) must be scheduled at the exact same $(day, start\_period)$. |
| **H12** | **Faculty Daily Teaching Limits** | Daily teaching hours for faculty $f$ on any day cannot exceed `max_hours_per_day` (typically 4 hours). |
| **H14** | **Fixed Slot Compliance** | If session specifies `fixed_slot = {"day": d, "start_period": p}`, it must be assigned exactly to $(d, p)$. |

### 3.2 Soft Constraints & Penalty Formulation

The timetable objective minimizes total soft penalty:
$$\min \sum_{k=1}^6 \text{Pen}(S_k)$$

| Code | Soft Rule | Penalty Formula in Validator | CP-SAT Modeling Strategy |
| :--- | :--- | :--- | :--- |
| **S1** | **Faculty Preferences** | $+2$ points per teaching hour occurring inside an avoided $(day, p)$ from `faculty.preferences`. | Add linear penalty terms: $2 \times \text{duration} \times \mathbb{I}(d, p \text{ in pref})$. |
| **S2** | **Student Group Gaps** | $+1$ point per idle period between a group's first and last period on any day: $\sum_{p=\min(P_g)}^{\max(P_g)} \mathbb{I}(p \notin P_g)$. | Model daily start period $\min_g$, end period $\max_g$, and span minus total hours. |
| **S3** | **Student Daily Overload** | $+3$ points per hour taught beyond 6 hours in a single day for any student group: $3 \times \max(0, \text{hours}(g, day) - 6)$. | Constrain or heavily penalize daily group load $> 6$. |
| **S4** | **Same-Course Multiple Lectures** | $+3$ points for each lecture of the same course beyond the 1st on the same day for a student group: $3 \times \max(0, \text{count} - 1)$. | Penalty for duplicate course lectures on the same day. |
| **S5** | **Room Under-utilization** | $+1$ point per session if $\text{size}(s) / \text{capacity}(r) < 0.4$. | Penalize assignments of small classes to huge lecture halls / auditoriums when classrooms fit. |
| **S6** | **Late Evening Teaching** | $+1$ point per session occupying Period 9 ($P9$, 17:00–18:00). | Add binary indicator penalty variable for sessions spanning $P9$. |

---

## 4. Special Subsystems

### 4.1 Elective Baskets (Open Electives)
- Open Electives (e.g. `OE301`, `OE302`, `OE303` in `OEB-1`, `OEB-2`, `OEB-3`) run simultaneously.
- Every Year 3 student group is listed on all sessions in the basket because students split across electives.
- **Key distinction:** `validator.py` uses `key = s.get("basket_slot") or sid`. Multiple basket sessions at the same $(day, p)$ share the same key and therefore **do not clash with each other** for groups, but they **strictly clash** with any non-basket class or differing basket for Year 3.
- All sessions in basket $b$ must have identical $(day, start)$.

### 4.2 Spectra Week Bookings (Fest Week)
- Decisions must be one of: `approved`, `rejected`, or `alternative_offered`.
- Rejections and alternatives require a non-empty human-readable `reason`.
- Role-based category capping applies:
  - `admin` $\to$ `institute_event`
  - `faculty` $\to$ `guest_lecture`
  - `department_coordinator` $\to$ `department_event`
  - `club` $\to$ `club_event`
- Priority order: `["exam", "regular_session", "institute_event", "guest_lecture", "department_event", "club_event"]`.
- Priority tie-breaker: earlier `submitted_at` timestamp.
- **Priority Inversions:** The validator penalizes rejecting a higher-priority request if its requirements could have been met in a slot allocated to a lower-priority booking.
- **Session Overrides:** Only approved `institute_event` may displace a regular teaching session. Displaced sessions must be relocated to another valid, clash-free slot.

### 4.3 Exam Scheduling
- Calendar: Monday to Saturday, sessions `AM` (09:30–11:30) and `PM` (14:00–16:00).
- Multiple rooms may be assigned to an exam.
- **Half-Capacity Rule:** Room seats during exams $= \lfloor \text{capacity}(r) / 2 \rfloor$.
- Exam rooms must have `"exam"` in `allowed_uses`.
- Hard constraints: No room double-booked in same $(day, session)$, no group double-booked in same $(day, session)$, total seats $\ge \text{size}(e)$.
- Exam soft penalty: $+5$ points for each exam beyond the 1st on the same day for any group.

### 4.4 Disruption Handling & Stability
- Disruption types: `faculty_unavailable`, `room_unavailable`, `add_faculty`, `add_session`, `remove_session`.
- Evaluation metrics:
  - `sessions_moved`: count of sessions where $(day, start, room)$ changed from baseline.
  - `time_changed`: session changed day or start period.
  - `room_only_changed`: session kept day and start period, only room relocated.
- Objective: Satisfy all post-disruption hard constraints while minimizing `sessions_moved`.

---

## 5. Backend Integration Interface Contract

The intelligence module exposes clean, stateless, FastAPI-compatible interfaces:

```python
# Timetable Generation & Validation
generate_timetable(
    data: dict, options: TimetableOptions | None = None
) -> TimetableResult
validate_timetable(
    schedule: dict, data: dict, baseline: dict | None = None
) -> ValidationReport

# Rescheduling Engine
reschedule(
    baseline: dict, disruption: dict, data: dict, options: RescheduleOptions
) -> RescheduleResult

# Exam Engine
generate_exam_schedule(
    data: dict, options: ExamOptions | None = None
) -> ExamResult

# Fest Week Booking Engine
evaluate_bookings(
    data: dict, timetable: dict, options: BookingOptions | None = None
) -> FestWeekResult

# Natural Language Assistant & RAG
process_assistant_message(
    message: str,
    user_context: UserContext,
    conversation_history: list[ChatMessage],
) -> AssistantResponse
```
