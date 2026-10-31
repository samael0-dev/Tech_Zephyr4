# AI Usage Declaration (CIT Campus Operations Platform)

In compliance with Section 6 (Implementation Rules) of the CrunchWeek Problem Statement, all artificial intelligence models, tools, and libraries utilized in this project are formally declared below.

---

## 1. AI Models & APIs Used in the Product

- **Model / API:** Gemini 2.5 Flash / Google GenAI SDK
- **Component:** Natural Language Scheduling Assistant (`POST /api/v1/assistant/chat`)
- **Purpose:** 
  - Parsing conversational natural language and Hinglish booking requests into structured JSON request objects.
  - Generating plain-language explanations of scheduling decisions and bottleneck conflicts.
- **Location of Prompts:** 
  - `app/api/v1/endpoints/assistant.py`

---

## 2. Strict Architectural Safeguards: What the LLM is NOT Allowed to Decide

To guarantee 100% scheduling correctness and security:
1. **No Scheduling or Booking Authority:** The LLM does NOT decide whether a timetable, schedule change, or venue booking is valid. 
2. **Deterministic Code Validation:** Every proposal generated or extracted by the LLM must pass deterministic backend verification (`app/services/booking_service.py` and official `validator.py`).
3. **No RBAC / Permission Bypass:** The LLM cannot override role category caps, cannot bypass department or student group data isolation, and cannot bypass the No Self-Approval security constraint.
4. **Graceful Degradation:** If the LLM API is unavailable, times out, or runs out of quota, the platform continues to operate with deterministic rule-based parsing and manual forms without interruption.

---

## 3. AI Assistance During Development

- **Assistant:** Antigravity Agentic AI Assistant (Google DeepMind)
- **Role & Contributions:**
  - Architecting the modular monolith structure, SQLAlchemy ORM models, and Pydantic schemas.
  - Designing and implementing JWT authentication, RBAC with 5 roles, and fine-grained permission middleware.
  - Writing automated Pytest test suites for data isolation, approval security, and audit logging.
  - Formatting and linting codebase according to Ruff standards.
