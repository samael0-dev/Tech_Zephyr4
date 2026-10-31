# CITRIX — Unified System Architecture Specification

**Document Version:** 1.0.0  
**Status:** Approved Architecture Blueprint (Pre-Implementation)  
**Target Systems:** Chilika Institute of Technology (CIT) Operations Platform  
**Primary Authoritative References:** `CITRIX_INTEGRATION_AUDIT.md`, `CITRIX_INTEGRATION_FILE_MAP.md`

---

## 1. Executive System Overview

CITRIX is an intelligent, constraint-governed campus operations platform designed to orchestrate academic schedules, venue reservations, emergency disruptions, and institutional knowledge for Chilika Institute of Technology (CIT).

### Core Architectural Decisions & Invariants
1. **Single Source of Truth:** Hosted **Neon Serverless PostgreSQL 18.6** is the sole persistent database. The local SQLite database (`campus_ops.db`) will be systematically retired.
2. **Authoritative Optimization Core:** The standalone **Google OR-Tools CP-SAT** solver (`engine/`) is the sole engine for generating timetables, scheduling midterm examinations, deciding Spectra Week bookings, and computing minimal-displacement disruption repairs.
3. **Deterministic Ground Truth:** The official competition validator (`CrunchWeek_StarterPack/validator.py`) is the invariant judge of schedule feasibility. No generated or repaired timetable may be persisted as `active` without achieving **0 hard constraint violations**.
4. **Agentic AI Operational Boundary:** The LLM agent (`TinyLlama/TinyLlama-1.1B-Chat-v1.0` via `langchain_huggingface`) understands and communicates in English and Hinglish, but cannot execute state modifications directly. State-altering proposals require human-in-the-loop cryptographic confirmation tokens before execution.
5. **Zero Self-Approval:** No campus actor (including Dean's Office administrators or Department Coordinators) can approve their own venue bookings or schedule disruption requests.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientTier ["1. Client Interaction Tier"]
        WebUI["Web Application / Role Dashboards"]
        ChatUI["Conversational AI Interface (English / Hinglish)"]
        MobileClient["Mobile / PWA Client"]
    end

    subgraph APITier ["2. FastAPI Backend & Security Gateway (app/api/v1/)"]
        AuthMiddleware["JWT Bearer Authentication & Password Verification"]
        RBACGuard["Role-Based Access Control (5 Roles + Permissions)"]
        AuditInterceptor["Tamper-Evident Audit Interceptor"]
        Router["FastAPI APIRouter (/api/v1/)"]
    end

    subgraph ServiceTier ["3. Application Service Layer (app/services/)"]
        TimetableSvc["Timetable & Schedule Service"]
        BookingSvc["Venue Booking & Approval Service"]
        DisruptionSvc["Disruption & Rescheduling Service"]
        AnalyticsSvc["Campus Analytics & Utilization Service"]
        RAGSvc["RAG Knowledge Retrieval Service"]
        AISvc["AI Orchestrator & Tool Registry Service"]
    end

    subgraph OptimizationTier ["4. CP-SAT Intelligence Engine (app/engine/)"]
        MasterSolver["Master Timetable CP-SAT Solver (H1–H14, S1–S6)"]
        FestEngine["Spectra Fest Booking Engine (Priority & Category Caps)"]
        ExamEngine["Midterm Exam Scheduler (Capacity // 2 Alternate Seating)"]
        ReschedEngine["Disruption Rescheduler (Minimal Move Stability)"]
        OfficialValidator["Official validator.py (0 Hard Violations Gate)"]
    end

    subgraph StorageTier ["5. Authoritative Storage Layer (Neon PostgreSQL 18.6)"]
        DBPool["Neon Connection Pooler (pool_pre_ping=True, pool_recycle=300)"]
        DualTransport["Dual-Transport Adapter (TCP Port 5432 / HTTPS Port 443)"]
        PostgresDB[("Neon PostgreSQL 18.6
30 Normalized Domain Tables
1,169 Ingested Canonical Records")]
        AlembicHistory["Alembic Migrations (001_initial -> 002_unified)"]
    end

    ClientTier --> AuthMiddleware
    AuthMiddleware --> RBACGuard
    RBACGuard --> AuditInterceptor
    AuditInterceptor --> Router

    Router --> TimetableSvc
    Router --> BookingSvc
    Router --> DisruptionSvc
    Router --> AnalyticsSvc
    Router --> RAGSvc
    Router --> AISvc

    TimetableSvc --> MasterSolver
    TimetableSvc --> OfficialValidator
    BookingSvc --> FestEngine
    DisruptionSvc --> ReschedEngine
    ReschedEngine --> OfficialValidator

    TimetableSvc --> DBPool
    BookingSvc --> DBPool
    DisruptionSvc --> DBPool
    AnalyticsSvc --> DBPool
    RAGSvc --> DBPool
    AISvc --> DBPool

    DBPool --> DualTransport
    DualTransport --> PostgresDB
```

---

## 3. Detailed Request-Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Campus User (Admin / Coordinator / Faculty / Club / Student)
    participant API as FastAPI Gateway (/api/v1)
    participant RBAC as Security & RBAC Guard
    participant Svc as Application Service Layer
    participant Engine as CP-SAT Intelligence Core
    participant Val as Official validator.py
    participant DB as Neon PostgreSQL 18.6
    participant Audit as Audit Logger

    User->>API: HTTP Request + Bearer JWT Token
    API->>RBAC: Validate Token, Extract Identity, Check Permissions
    alt Unauthorized or Forbidden
        RBAC-->>User: 401 Unauthorized / 403 Forbidden
    else Authorized
        RBAC->>Audit: Intercept & Log Access Attempt
        API->>Svc: Invoke Domain Business Logic
        
        opt Operational Schedule Generation / Rescheduling
            Svc->>Engine: Solve Constraint Satisfaction Model
            Engine-->>Svc: Candidate Timetable Assignments
            Svc->>Val: Run Official Validator on Candidate Schedule
            alt Validator Reports Hard Violations > 0
                Val-->>Svc: Violations Detected (H1–H14)
                Svc-->>API: 422 Unprocessable Entity (Schedule Infeasible)
                API-->>User: Failure Response with Conflict Explanation
            else Validator Reports 0 Hard Violations
                Val-->>Svc: Feasible (0 Violations, Soft Penalties Recorded)
                Svc->>DB: Transactional Commit (Schedule, Versions, Entries)
                DB-->>Svc: Commit Acknowledged
            end
        end

        opt Standard Query / Mutation
            Svc->>DB: Query / Update Normalized Domain Tables
            DB-->>Svc: Query Results / Rows Affected
        end

        Svc->>Audit: Record Audit Log Entry (Actor, Action, Status=SUCCESS)
        Svc-->>API: Domain Response DTO
        API-->>User: 200 OK / 201 Created JSON Response
    end
```

---

## 4. Timetable Generation & Admin Approval Flow

```mermaid
flowchart TD
    Start["Admin triggers POST /api/v1/schedules/generate"] --> PermCheck{"Permission Check: TIMETABLE_GENERATE?"}
    PermCheck -- No --> Deny["403 Forbidden"]
    PermCheck -- Yes --> LoadDataset["Load Canonical Domain Data from Neon DB / cit_public.json"]
    
    LoadDataset --> CPSAT["Run Master CP-SAT Solver (engine/scheduler/solver.py)"]
    CPSAT --> FeasibleCheck{"Solver Status FEASIBLE or OPTIMAL?"}
    
    FeasibleCheck -- No --> InfeasibleResp["Return 422: Solver Timed Out or Infeasible"]
    FeasibleCheck -- Yes --> BuildExport["Construct Canonical schedule.json Export Payload"]
    
    BuildExport --> ValGate["Invoke validator.py: run_validator(schedule_json)"]
    ValGate --> HardCheck{"Hard Violations == 0?"}
    
    HardCheck -- No --> RejectSol["Reject Schedule Proposal (Log Conflicting Rules)"]
    HardCheck -- Yes --> StageProposal["Stage Schedule as Version 'draft' in Neon schedules"]
    
    StageProposal --> AdminReview["Dean / Admin Reviews Metrics: S1–S6 Penalties, Room Utilisation"]
    AdminReview --> AdminDecision{"Admin Approves Proposal?"}
    
    AdminDecision -- Reject --> MarkSuperseded["Mark Version 'superseded' in schedule_versions"]
    AdminDecision -- Approve --> DeactivatePrev["Deactivate Previous Active Schedule (is_active = FALSE)"]
    DeactivatePrev --> ActivateNew["Set New Schedule is_active = TRUE, status = 'active'"]
    ActivateNew --> WriteEntries["Bulk Upsert 189 Rows in timetable_entries"]
    WriteEntries --> AuditSuccess["Log Audit Event: GENERATE_TIMETABLE_COMMITTED"]
    AuditSuccess --> Done["Return 200 OK with Active Schedule Summary"]
```

---

## 5. Disruption & Rescheduling Flow

```mermaid
flowchart TD
    Req["Faculty Leave / Room Closure Request (POST /api/v1/reschedule)"] --> RoleCheck{"Permission Check: TIMETABLE_REQUEST_CHANGE?"}
    RoleCheck -- No --> ErrPerm["403 Forbidden"]
    RoleCheck -- Yes --> CreateDisruption["Insert record into disruptions table (status='pending')"]
    
    CreateDisruption --> DisruptionSim["Simulate Disruption: Engine extracts affected sessions from active timetable"]
    DisruptionSim --> ImpactSummary["Generate Impact Summary: Affected Sessions, Groups, Faculty"]
    ImpactSummary --> ReviewPending["Disruption Queue available for Dean / Admin review"]
    
    ReviewPending --> AdminApprove["Admin triggers POST /api/v1/reschedule/{id}/approve"]
    AdminApprove --> SelfApproveCheck{"Requester ID == Approver ID?"}
    SelfApproveCheck -- Yes --> BlockSelf["400 Bad Request: Anti-Self-Approval Violation"]
    
    SelfApproveCheck -- No --> RunRescheduler["Invoke Rescheduler: engine/rescheduler/engine.py"]
    RunRescheduler --> StabilityObj["Optimize Stability Objective: Minimize sessions moved from baseline"]
    StabilityObj --> ReschedVal["Run validator.py on Repaired Timetable"]
    
    ReschedVal --> ReschedHardCheck{"Hard Violations == 0?"}
    ReschedHardCheck -- No --> ReschedFail["Rollback: Disruption cannot be resolved without manual intervention"]
    ReschedHardCheck -- Yes --> CreateNewVersion["Create incremented ScheduleVersion in Neon DB"]
    CreateNewVersion --> UpdateEntries["Update changed timetable_entries"]
    UpdateEntries --> NotifyAffected["Emit Notifications to affected Faculty and Student Groups"]
    NotifyAffected --> LogAudit["Log Audit Event: RESCHEDULE_APPROVED_AND_APPLIED"]
    LogAudit --> Complete["Return 200 OK: Minimal displacement schedule active"]
```

---

## 6. Spectra Week Venue Booking Submission & Approval Flow

```mermaid
flowchart TD
    Submit["User submits booking request (POST /api/v1/bookings or AI Assistant)"] --> AuthCheck{"Authenticated?"}
    AuthCheck -- No --> AuthFail["401 Unauthorized"]
    AuthCheck -- Yes --> ExtractRole["Retrieve User Role: ADMIN, COORDINATOR, FACULTY, CLUB"]
    
    ExtractRole --> ApplyCap["Apply role_category_cap:
- ADMIN -> institute_event
- FACULTY -> guest_lecture
- COORDINATOR -> department_event
- CLUB -> club_event"]
    
    ApplyCap --> InsertReq["Insert into booking_requests (status='pending', effective_category clamped)"]
    InsertReq --> Queue["Booking appears on Coordinator / Admin Approval Dashboard"]
    
    Queue --> DeciderAction["Approver decides request (approve / reject / alternative)"]
    DeciderAction --> SelfCheck{"Approver ID == Requester ID?"}
    SelfCheck -- Yes --> DenySelf["400 Bad Request: Anti-Self-Approval Violation"]
    
    SelfCheck -- No --> DeptLabCheck{"Is venue a Departmental Lab & Approver is Coordinator?"}
    DeptLabCheck -- "Coordinator for outside venue" --> DenyScope["403 Forbidden: Coordinators may only approve departmental labs"]
    DeptLabCheck -- Valid --> FestEngineEval["Evaluate Venue Availability & Conflict Matrix"]
    
    FestEngineEval --> DecisionOutcome{"Decision Type?"}
    DecisionOutcome -- "Reject" --> RecordReason["Record non-empty decision_reason in DB (status='rejected')"]
    DecisionOutcome -- "Alternative" --> RecordAlt["Offer alternative room/time window (status='alternative_offered')"]
    DecisionOutcome -- "Approve" --> CheckCollision{"Room already booked / class scheduled?"}
    
    CheckCollision -- Yes --> ConflictError["409 Conflict: Venue occupied in target period"]
    CheckCollision -- No --> SetApproved["Update status='approved', set assigned_room_id, assigned_day, assigned_periods"]
    
    SetApproved --> OverwriteCheck{"Does booking displace regular class during Spectra Fest?"}
    OverwriteCheck -- Yes --> MarkOverride["Set is_overridden_for_fest=TRUE on timetable_entry"]
    OverwriteCheck -- No --> SkipOverride["Regular booking confirmed"]
    
    MarkOverride --> LogBookingAudit["Log Audit: BOOKING_APPROVED"]
    SkipOverride --> LogBookingAudit
    RecordReason --> LogBookingAudit
    RecordAlt --> LogBookingAudit
    LogBookingAudit --> Finish["Return 200 OK to Requester"]
```

---

## 7. AI Tool-Calling & Human Confirmation Flow

```mermaid
flowchart TD
    UserMsg["User sends prompt in English/Hinglish (POST /api/v1/assistant/chat)"] --> IntentExtract["app/ai/agent/intent.py: Classify Intent & Extract Entities"]
    IntentExtract --> ContextCheck["Multi-turn Slot Manager: Are all required parameters present?"]
    
    ContextCheck -- Incomplete --> AskClarification["Assistant asks clarifying question (e.g. 'Which day and period?')"]
    ContextCheck -- Complete --> ActionCheck{"Is requested action state-modifying?"}
    
    ActionCheck -- "Read-Only Lookup" --> ExecuteReadTool["ToolRegistry invokes read-only tool (e.g. lookup_room_availability)"]
    ExecuteReadTool --> QueryDB["Query Neon PostgreSQL via application service"]
    QueryDB --> GroundedResp["LLM generates grounded response with citations"]
    GroundedResp --> ReturnChat["Return 200 OK with answer to user"]
    
    ActionCheck -- "State-Modifying (Booking / Disruption)" --> PrepProposal["Prepare Action Proposal (e.g. propose_booking_request)"]
    PrepProposal --> ValidatePreconditions["Run domain validation checks (capacity, allowed uses, role caps)"]
    ValidatePreconditions --> GenToken["Generate Secure Cryptographic Action Confirmation Token"]
    GenToken --> PromptUser["Return requires_confirmation: TRUE with proposal summary and action token"]
    
    PromptUser --> HumanDecision{"Human user reviews proposal in UI"}
    HumanDecision -- Rejects/Ignores --> ExpireToken["Proposal expires; no database mutation occurs"]
    HumanDecision -- Confirms --> SubmitConfirm["User sends POST /api/v1/assistant/confirm-action with action_token"]
    
    SubmitConfirm --> VerifyToken["Verify Token Validity, Expiry & User Ownership"]
    VerifyToken -- Invalid --> DenyToken["400 Bad Request: Invalid or expired confirmation token"]
    VerifyToken -- Valid --> ExecAction["Invoke Application Service (create_booking / request_reschedule)"]
    ExecAction --> CommitDB["Commit mutation to Neon PostgreSQL"]
    CommitDB --> AuditAI["Log Audit: AI_ACTION_CONFIRMED_AND_EXECUTED"]
    AuditAI --> ReturnSuccess["Return 200 OK with confirmed execution details"]
```

---

## 8. Cross-Cutting Architectural Layers

### 8.1 Dual-Transport Database Resilience
To eliminate local corporate/academic firewall resets on raw TCP port 5432 (`WinError 10054`), CITRIX uses a dual-transport query architecture:
- **Primary TCP Transport:** Standard connection pool using `psycopg2-binary` (`pool_pre_ping=True`, `pool_recycle=300`, `pool_size=5`, `max_overflow=10`).
- **Secondary HTTPS Transport (TLS 443):** Fallback queries over Neon Cloud REST SQL (`https://<neon-host>/sql`).
- All services interact through `get_db()` or standard SQLAlchemy repositories, isolating business logic from transport failover.

### 8.2 RAG Knowledge Base Architecture
- **Corpus Ingestion:** Institutional scheduling policies (P1–P9, lunch intervals, 3-hour lab rules), Spectra Fest guidelines, room catalogs, and exam guidelines are stored in Neon's `knowledge_documents` and `document_chunks` tables.
- **Hybrid Retrieval:** BM25 keyword matching combined with dense cosine similarity scoring ensures exact match on room numbers (`CR-101`, `SH-1`) and semantic matches on queries like *"rules for booking auditorium during fest"*.
- **Role-Based Document Filtering:** Documents have `access_role_minimum` attributes (e.g. `student`, `faculty`, `coordinator`, `admin`). Queries submitted by students strictly filter out internal Dean's administrative memos.
- **Source Citation:** Every generated policy answer returns explicit markdown citations (document title, section, page, and snippet).

### 8.3 Anti-Self-Approval Enforcement
In compliance with competition security mandates:
```python
def enforce_no_self_approval(requester_id: Optional[str], approver_id: str) -> None:
    if requester_id and requester_id == approver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security violation: Self-approval is strictly forbidden. A different authorized administrator must approve this request."
        )
```
This check is applied across venue booking approvals (`POST /api/v1/bookings/{id}/approve`) and schedule disruption approvals (`POST /api/v1/reschedule/{id}/approve`).

---

## 9. Verification & Architectural Invariant Checklist

| Architectural Invariant | Enforcement Mechanism | Verification Evidence |
| :--- | :--- | :--- |
| **Neon PostgreSQL as sole database** | `app/core/config.py` and `app/core/database.py` configured exclusively for PostgreSQL. | SQLite dependencies removed; 30 domain tables verified on Neon. |
| **0 Hard Constraint Violations** | Every timetable generation and rescheduling invocation executes `validator.py`. | 0 hard violations verified in `exports/schedule.json` across 189 sessions. |
| **No Unconfirmed AI State Changes** | State-modifying tools output `requires_confirmation: True` and require `/confirm-action`. | Automated in `app/ai/agent/tools.py` and tested in `test_agent_scenarios.py`. |
| **Anti-Self-Approval** | Rejection if `requester_id == approver_id`. | Tested in `tests/test_approval_security.py`. |
| **Alternate Exam Seating** | Room exam capacity strictly clamped to `capacity // 2`. | Enforced in `engine/exams/engine.py` and `test_exam_scheduler.py`. |
| **Auditing of All Critical Actions** | Synchronous commit to `audit_logs` table before API return. | Tested in `tests/test_audit_log.py`. |
