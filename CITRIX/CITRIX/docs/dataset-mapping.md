# CITRIX Dataset to PostgreSQL Relational Mapping Specification

This document details the exact, field-by-field relational schema mapping from the canonical starter dataset (`CrunchWeek_StarterPack/data/cit_public.json`) and solver outputs (`exports/schedule.json`) to the CITRIX PostgreSQL database hosted on Neon.

---

## 1. Identity and Access Management (IAM)

### 1.1 `roles`
Derived from `role_category_cap` and system permission tiers.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Key from `role_category_cap` + system roles (`admin`, `faculty`, `department_coordinator`, `club`, `student`, `dean`, `hod`) | VARCHAR(32) PRIMARY KEY | Unique role identifier |
| `name` | Human-readable role name | VARCHAR(64) UNIQUE NOT NULL | e.g. "Institute Administration", "Faculty Member" |
| `description` | Role description | TEXT | Responsibilities and booking authority |
| `category_cap` | Value from `role_category_cap[role]` | VARCHAR(32) | Maximum category permitted for event bookings |
| `created_at` | System timestamp | TIMESTAMPTZ | Creation timestamp |

### 1.2 `departments`
Derived from distinct departments across `faculty`, `student_groups`, `courses`, and `booking_requests`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `code` | Distinct code (`CSE`, `ECE`, `EE`, `ME`, `CE`, `HSS`, `MA`, `PH`, `ADMIN`, `COMMON`) | VARCHAR(16) PRIMARY KEY | Department code |
| `name` | Full name | VARCHAR(128) NOT NULL | e.g. "Computer Science & Engineering" |
| `building_id` | Primary building FK | VARCHAR(64) REFERENCES `buildings` | Nullable |
| `created_at` | System timestamp | TIMESTAMPTZ | |

### 1.3 `users`
Generated for faculty, department coordinators, club leads, and administrators.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Faculty ID (`F01`..`F40`) or role slug (`admin_usr`, `club_robotics`, etc.) | VARCHAR(64) PRIMARY KEY | Unique user ID |
| `email` | `<id_lowercase>@cit.ac.in` | VARCHAR(128) UNIQUE INDEX | Canonical email |
| `full_name` | `faculty.name` or role title | VARCHAR(128) NOT NULL | Name |
| `department_code` | `faculty.department` or department code | VARCHAR(16) REFERENCES `departments` | Nullable |
| `is_active` | `true` | BOOLEAN NOT NULL | Active status |

### 1.4 `user_roles`
Mapping table connecting users with their granted roles.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `user_id` | `users.id` | VARCHAR(64) REFERENCES `users` | Composite PK |
| `role_id` | `roles.id` | VARCHAR(32) REFERENCES `roles` | Composite PK |
| `granted_at` | System timestamp | TIMESTAMPTZ | |

### 1.5 `faculty_profiles`
Source: `cit_public.json -> faculty[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `faculty[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (e.g. `F01`) |
| `user_id` | `faculty[i].id` | VARCHAR(64) REFERENCES `users` | Linked user account |
| `name` | `faculty[i].name` | VARCHAR(128) NOT NULL | Full name |
| `department_code` | `faculty[i].department` | VARCHAR(16) REFERENCES `departments` | Department FK |
| `max_hours_per_day` | `faculty[i].max_hours_per_day` | INTEGER NOT NULL | Typically 4 |
| `needs_accessible` | `faculty[i].needs_accessible` | BOOLEAN NOT NULL | Ground floor / lift requirement |
| `preferences` | `faculty[i].preferences` | JSONB NOT NULL | List of soft preference slots |

### 1.6 `faculty_unavailabilities`
Source: `cit_public.json -> faculty[i].unavailable[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Auto-increment sequence | SERIAL PRIMARY KEY | Record ID |
| `faculty_id` | `faculty[i].id` | VARCHAR(32) REFERENCES `faculty_profiles` | Faculty FK |
| `day` | `unavailable[j].day` | VARCHAR(4) NOT NULL | MON, TUE, WED, THU, FRI |
| `period` | Expanded from `unavailable[j].periods` list | INTEGER NOT NULL | 1-9 |
| `reason` | `unavailable[j].reason` | TEXT | Conflict reason |
| `is_permanent` | `true` | BOOLEAN NOT NULL | Term-wide unavailability |

### 1.7 `student_groups`
Source: `cit_public.json -> student_groups[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `student_groups[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (`Y1-A`, `CSE-2`, etc.) |
| `name` | `student_groups[i].name` | VARCHAR(128) NOT NULL | Display name |
| `year` | `student_groups[i].year` | INTEGER NOT NULL | Academic year (1, 2, 3, 4) |
| `department_code` | `student_groups[i].department` | VARCHAR(16) REFERENCES `departments` | Department FK |
| `size` | `student_groups[i].size` | INTEGER NOT NULL | Enrolled student headcount |
| `needs_accessible` | `student_groups[i].needs_accessible` | BOOLEAN NOT NULL | Accessibility flag |

---

## 2. Academic Structure

### 2.1 `academic_terms`
Source: `cit_public.json -> calendar`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `cit_public.json -> dataset_id` (`cit-public-v1`) | VARCHAR(32) PRIMARY KEY | Canonical term identifier |
| `name` | `calendar.semester` or "Spring Semester 2027" | VARCHAR(64) NOT NULL | Term name |
| `is_current` | `true` | BOOLEAN NOT NULL | Current active term |
| `fest_week_number` | `calendar.fest_week` (7) | INTEGER NOT NULL | Fest week identifier |

### 2.2 `academic_periods`
Source: `cit_public.json -> calendar.periods[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `period_number` | `periods[i].id` | INTEGER PRIMARY KEY | 1 to 13 |
| `start_time` | `periods[i].start` | TIME NOT NULL | e.g. 08:00 |
| `end_time` | `periods[i].end` | TIME NOT NULL | e.g. 09:00 |
| `is_teaching` | `periods[i].teaching` | BOOLEAN NOT NULL | True for P1-P9 |
| `is_event_only` | `id in calendar.event_only_periods` | BOOLEAN NOT NULL | True for P10-P13 |
| `label` | "Period X (HH:MM-HH:MM)" | VARCHAR(32) NOT NULL | Display label |

### 2.3 `courses`
Source: `cit_public.json -> courses[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `courses[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (`MA101`, `CS201`) |
| `title` | `courses[i].title` | VARCHAR(128) NOT NULL | Course title |
| `department_code` | `courses[i].department` | VARCHAR(16) REFERENCES `departments` | Department FK |
| `year` | `courses[i].year` | INTEGER | Target year (1-4) |
| `lecture_hours` | `courses[i].lecture_hours` | INTEGER NOT NULL | Scheduled lecture hours/week |
| `tutorial_hours` | `courses[i].tutorial_hours` | INTEGER NOT NULL | Scheduled tutorial hours/week |
| `lab_blocks` | `courses[i].lab_blocks` | INTEGER NOT NULL | 3-hour lab blocks/week |

---

## 3. Campus Infrastructure

### 3.1 `buildings`
Source: Distinct `rooms[i].building` in `cit_public.json`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Slugified building name (e.g. `lecture-hall-complex`) | VARCHAR(64) PRIMARY KEY | Building key |
| `name` | `rooms[i].building` (e.g. `Academic Block B (2nd floor, no lift)`) | VARCHAR(128) UNIQUE NOT NULL | Exact dataset building name |
| `has_lift` | `false` if "(no lift)" in name, else `true` | BOOLEAN NOT NULL | Inferred from dataset name |

### 3.2 `rooms`
Source: `cit_public.json -> rooms[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `rooms[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (`AUD`, `LH-1`, `CR-101`) |
| `name` | `rooms[i].name` | VARCHAR(128) NOT NULL | Room name |
| `building_id` | `buildings.id` matching `rooms[i].building` | VARCHAR(64) REFERENCES `buildings` | Building FK |
| `type` | `rooms[i].type` | VARCHAR(32) NOT NULL | classroom, lecture_hall, auditorium, computer_lab, etc. |
| `capacity` | `rooms[i].capacity` | INTEGER NOT NULL | Normal seating capacity |
| `exam_capacity` | `rooms[i].capacity // 2` | INTEGER NOT NULL | Strict alternate-seat exam capacity |
| `accessible` | `rooms[i].accessible` | BOOLEAN NOT NULL | Ground floor or lift accessibility |
| `features` | `rooms[i].features` | JSONB NOT NULL | `["projector", "pa_system", ...]` |
| `allowed_uses` | `rooms[i].allowed_uses` | JSONB NOT NULL | `["lecture", "lab", "exam", "event"]` |

### 3.3 `room_unavailabilities`
Source: `cit_public.json -> room_unavailability[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Auto-increment sequence | SERIAL PRIMARY KEY | Record ID |
| `room_id` | `room_unavailability[i].room_id` | VARCHAR(32) REFERENCES `rooms` | Room FK |
| `day` | `room_unavailability[i].day` | VARCHAR(4) NOT NULL | Day code (e.g. THU) |
| `period` | Expanded from `room_unavailability[i].periods` | INTEGER NOT NULL | Period number (1-13) |
| `reason` | `room_unavailability[i].reason` | TEXT | Maintenance/repair reason |
| `is_permanent` | `true` | BOOLEAN NOT NULL | Hard constraint H4 |

---

## 4. Timetable and Scheduling

### 4.1 `sessions`
Source: `cit_public.json -> sessions[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `sessions[i].id` | VARCHAR(64) PRIMARY KEY | Preserves original ID (`MA101-AB-L1`) |
| `course_id` | `sessions[i].course_id` | VARCHAR(32) REFERENCES `courses` | Course FK |
| `kind` | `sessions[i].kind` | VARCHAR(16) NOT NULL | lecture, tutorial, lab |
| `faculty_id` | `sessions[i].faculty_id` | VARCHAR(32) REFERENCES `faculty_profiles` | Faculty FK |
| `size` | `sessions[i].size` | INTEGER NOT NULL | Total expected headcount |
| `duration` | `sessions[i].duration` | INTEGER NOT NULL | 1 for lectures/tutorials, 3 for labs |
| `room_types` | `sessions[i].room_types` | JSONB NOT NULL | Allowed room types |
| `needs_accessible` | `sessions[i].needs_accessible` | BOOLEAN NOT NULL | Accessible room required |
| `basket_slot` | `sessions[i].basket_slot` | VARCHAR(32) | Elective basket (`OEB-1`, `OEB-2`, `OEB-3`) |
| `fixed_slot_day` | `sessions[i].fixed_slot.day` if set | VARCHAR(4) | Pre-assigned day |
| `fixed_slot_period` | `sessions[i].fixed_slot.period` if set | INTEGER | Pre-assigned period |

### 4.2 `session_groups`
Source: `cit_public.json -> sessions[i].groups[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `session_id` | `sessions[i].id` | VARCHAR(64) REFERENCES `sessions` | Composite PK |
| `group_id` | Group ID in `sessions[i].groups` | VARCHAR(32) REFERENCES `student_groups` | Composite PK |

### 4.3 `schedules`
Source: Solved timetable run (`exports/schedule.json`, `exports/last_validation_report.json`).
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `cit-baseline-schedule` | VARCHAR(64) PRIMARY KEY | Canonical schedule ID |
| `name` | "CIT Master Baseline Schedule 2027" | VARCHAR(128) NOT NULL | Display name |
| `dataset_id` | `cit-public-v1` | VARCHAR(64) NOT NULL | Dataset version |
| `term_id` | `cit-public-v1` | VARCHAR(32) REFERENCES `academic_terms` | Term FK |
| `is_active` | `true` | BOOLEAN NOT NULL | Current operational timetable |
| `is_baseline` | `true` | BOOLEAN NOT NULL | Official baseline for disruptions |
| `status` | "validated" | VARCHAR(32) NOT NULL | Validation state |
| `hard_violations_count` | 0 | INTEGER NOT NULL | Official validator H violations |
| `soft_penalty_total` | Solver score | INTEGER NOT NULL | Official soft penalty |
| `raw_schedule_json` | Full export JSON payload | JSONB | Complete portable JSON |

### 4.4 `timetable_entries`
Source: `exports/schedule.json -> sessions[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Auto-increment sequence | SERIAL PRIMARY KEY | Record ID |
| `schedule_id` | `schedules.id` | VARCHAR(64) REFERENCES `schedules` | Schedule FK |
| `session_id` | `sessions[i].session_id` | VARCHAR(64) REFERENCES `sessions` | Session FK |
| `day` | `sessions[i].day` | VARCHAR(4) NOT NULL | MON, TUE, WED, THU, FRI |
| `start_period` | `sessions[i].start_period` | INTEGER NOT NULL | Period (1-9) |
| `end_period` | `start_period + session.duration - 1` | INTEGER NOT NULL | End period |
| `room_id` | `sessions[i].room_id` | VARCHAR(32) REFERENCES `rooms` | Room FK |
| `is_overridden_for_fest` | Match in `fest_week.session_overrides` | BOOLEAN NOT NULL | True if displaced in Fest Week |
| `override_displaced_by` | Booking ID if displaced | VARCHAR(32) | Displacing booking |

---

## 5. Bookings and Campus Events

### 5.1 `event_categories`
Source: Official validator `CAT_WEIGHT` & priority order.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `code` | `institute_event`, `guest_lecture`, `department_event`, `club_event` | VARCHAR(32) PRIMARY KEY | Category code |
| `name` | Display title | VARCHAR(64) NOT NULL | e.g. "Institute Event" |
| `weight` | 5, 4, 3, 2 (validator CAT_WEIGHT) | INTEGER NOT NULL | Priority score weight |
| `priority_rank` | 1, 2, 3, 4 | INTEGER NOT NULL | Deterministic precedence |

### 5.2 `booking_requests`
Source: `cit_public.json -> booking_requests[]` + Fest Week solver decisions.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `booking_requests[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (`BR-01`) |
| `submitted_at` | `booking_requests[i].submitted_at` | TIMESTAMPTZ NOT NULL | Request timestamp |
| `requester` | `booking_requests[i].requester` | VARCHAR(128) NOT NULL | Requester identity |
| `role` | `booking_requests[i].role` | VARCHAR(32) REFERENCES `roles` | Submitting role |
| `department_code` | `booking_requests[i].department` | VARCHAR(16) REFERENCES `departments` | Nullable department FK |
| `requested_category`| `booking_requests[i].requested_category` | VARCHAR(32) REFERENCES `event_categories` | Claimed category |
| `effective_category`| Clamped category per `role_category_cap` | VARCHAR(32) REFERENCES `event_categories` | Clamped authority category |
| `title` | `booking_requests[i].title` | VARCHAR(256) NOT NULL | Event title |
| `attendance` | `booking_requests[i].attendance` | INTEGER NOT NULL | Headcount |
| `duration_periods` | `booking_requests[i].duration_periods` | INTEGER NOT NULL | Periods required |
| `windows` | `booking_requests[i].windows` | JSONB NOT NULL | Allowed time windows |
| `room_types` | `booking_requests[i].room_types` | JSONB NOT NULL | Allowed room types |
| `needs` | `booking_requests[i].needs` | JSONB NOT NULL | Feature requirements (`["stage"]`, etc.) |
| `requested_room` | `booking_requests[i].requested_room` | VARCHAR(32) REFERENCES `rooms` | Specific requested room |
| `mandatory_for_groups`| `booking_requests[i].mandatory_for_groups` | JSONB NOT NULL | Groups required to attend |
| `series_id` | `booking_requests[i].series_id` | VARCHAR(32) | Series identifier if recurring |
| `status` | "approved", "rejected", "cancelled" | VARCHAR(32) NOT NULL | Decision state |
| `assigned_room_id` | Assigned room if approved | VARCHAR(32) REFERENCES `rooms` | Approved room |
| `assigned_day` | Assigned day if approved | VARCHAR(4) | Approved day |
| `assigned_start_period`| Assigned start period if approved | INTEGER | Approved start period |
| `assigned_end_period` | Assigned start + duration - 1 | INTEGER | Approved end period |

### 5.3 `booking_cancellations`
Source: `cit_public.json -> cancellations[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `request_id` | `cancellations[i].request_id` | VARCHAR(32) PRIMARY KEY | Booking Request FK |
| `cancelled_at` | `cancellations[i].cancelled_at` | TIMESTAMPTZ NOT NULL | Cancellation timestamp |
| `cancelled_by` | `cancellations[i].by` | VARCHAR(128) NOT NULL | Person or entity cancelling |
| `reason` | `cancellations[i].note` | TEXT | Cancellation explanation |

---

## 6. Examinations

### 6.1 `exam_sessions`
Standard exam slot sessions.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `AM`, `PM` | VARCHAR(16) PRIMARY KEY | Session code |
| `name` | "Morning Session", "Afternoon Session" | VARCHAR(32) NOT NULL | Session label |
| `start_time` | 09:00:00, 14:00:00 | TIME NOT NULL | Start time |
| `end_time` | 12:00:00, 17:00:00 | TIME NOT NULL | End time |

### 6.2 `exams`
Source: `cit_public.json -> exams[]` + Exam Solver assignments.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `exams[i].id` | VARCHAR(32) PRIMARY KEY | Preserves original ID (`EX-MA101`) |
| `term_id` | `cit-public-v1` | VARCHAR(32) REFERENCES `academic_terms` | Term FK |
| `size` | `exams[i].size` | INTEGER NOT NULL | Headcount |
| `duration_hours` | `exams[i].duration_hours` | INTEGER NOT NULL | 2 hours |
| `course_ids` | `exams[i].course_ids` | JSONB NOT NULL | Associated course codes |
| `groups` | `exams[i].groups` | JSONB NOT NULL | Enrolled student groups |
| `scheduled_day` | Solved day (`MON`..`FRI`) | VARCHAR(4) | Assigned exam day |
| `scheduled_session`| Solved session (`AM`, `PM`) | VARCHAR(16) REFERENCES `exam_sessions` | Assigned exam session |

### 6.3 `exam_room_allocations`
Source: `exports/schedule.json -> exams[i].rooms[]`.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Auto-increment sequence | SERIAL PRIMARY KEY | Record ID |
| `exam_id` | `exams[i].id` | VARCHAR(32) REFERENCES `exams` | Exam FK |
| `room_id` | Allocated room ID | VARCHAR(32) REFERENCES `rooms` | Room FK |
| `allocated_seats` | Seating capacity dedicated to exam | INTEGER NOT NULL | Respects alternate seating (`capacity // 2`) |

---

## 7. Knowledge & RAG Documents

### 7.1 `knowledge_documents`
Source: Repository markdown documents (`README.md`, `scheduling-rules.md`, `sample_requests.md`).
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | Document slug (`doc_readme`, `doc_rules`, etc.) | VARCHAR(64) PRIMARY KEY | Document key |
| `title` | Title from header | VARCHAR(256) NOT NULL | Document title |
| `source_file` | Relative workspace path | VARCHAR(256) NOT NULL | Provenance file |
| `document_type` | `regulation`, `policy`, `manual` | VARCHAR(64) NOT NULL | Category |
| `summary` | Document executive summary | TEXT | Summary |

### 7.2 `document_chunks`
Source: Extracted semantic sections from knowledge documents.
| Target Column | Source Field / Logic | Type / Constraint | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `<document_id>_<chunk_index>` | VARCHAR(64) PRIMARY KEY | Unique chunk ID |
| `document_id` | `knowledge_documents.id` | VARCHAR(64) REFERENCES `knowledge_documents` | Parent doc FK |
| `chunk_index` | Section index (0, 1, 2...) | INTEGER NOT NULL | Sequential index |
| `section_title` | Markdown H2/H3 header | VARCHAR(256) NOT NULL | Section header |
| `content` | Chunk text content | TEXT NOT NULL | Verbatim text |
| `keywords` | Extracted search keywords | JSONB NOT NULL | Inverted keyword index |
| `metadata_json` | Line numbers, tags, links | JSONB | Chunk metadata |
