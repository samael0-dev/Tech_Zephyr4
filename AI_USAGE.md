# AI Usage Declaration (CITRIX — RAG & Agentic AI Module)

In compliance with Section 6 (Implementation Rules) of the CrunchWeek Problem Statement, all artificial intelligence models, tools, and libraries utilized in this project are formally declared below.

---

## 1. AI Models & APIs Used in the Product

- **Model / Engine:** `TinyLlama/TinyLlama-1.1B-Chat-v1.0` via `ChatHuggingFace` & `HuggingFaceEndpoint` (`langchain_huggingface`)
- **Component:** CITRIX — RAG & Agentic AI Module (`app/ai/`)
  - Conversational Assistant (`POST /api/v1/assistant/chat`)
  - Human-in-the-Loop Action Confirmation (`POST /api/v1/assistant/confirm-action`)
  - Dean's AI Command Intelligence Briefing (`GET /api/v1/assistant/dean-insights`)
  - Knowledge Base Semantic Retrieval (`POST /api/v1/rag/search`)
- **Purpose:** 
  - Parsing conversational English, Hindi, and colloquial Hinglish booking queries and requests.
  - Multi-turn conversation slot filling and entity extraction (rooms, times, attendance, student groups, faculty).
  - Grounded question-answering with institutional policy citations (academic scheduling policies, Spectra fest rules, exam capacity rules).
  - Explaining CP-SAT solver conflicts and official validator reports (H1-H13, S1-S6).
- **Location of Prompts & Templates:** 
  - `app/ai/agent/prompts.py`
  - `app/ai/agent/intent.py`
  - `app/ai/agent/orchestrator.py`

---

## 2. Strict Architectural Safeguards: What the LLM is NOT Allowed to Decide

To guarantee 100% scheduling correctness, security, and rule enforcement:
1. **No Authoritative Scheduling or Solver Authority:** The LLM does NOT decide whether a timetable, schedule change, or venue booking is valid. 
2. **Deterministic Code Validation:** Every proposal generated or extracted by the LLM must pass deterministic backend verification (`app/services/booking_service.py` and official `validator.py`).
3. **No Self-Approval Enforcement:** The AI cannot bypass the No Self-Approval security constraint. A user cannot approve their own booking request.
4. **Confirmation Before Actions:** State-changing operations (such as booking creations or schedule disruptions) return `requires_confirmation: true` and cannot modify database records without explicit user confirmation.
5. **Role-Based Scope & Data Isolation:** Lower-privileged roles (such as students or clubs) cannot retrieve administrative documents or confidential faculty records through the RAG pipeline.
6. **Graceful Degradation:** If the remote Hugging Face endpoint times out or lacks external API tokens, the platform continues to operate with deterministic rule-based parsing, tool execution, and manual forms without interruption.

---

## 3. AI Assistance During Development

- **Assistant:** Antigravity Agentic AI Assistant (Google DeepMind)
- **Role & Contributions:**
  - Designing and implementing the CITRIX RAG & Agentic AI architecture.
  - Building the hybrid vector store (BM25 + semantic similarity + metadata filtering).
  - Implementing multi-turn conversational context management and entity extraction for English & Hinglish.
  - Integrating tool execution with CP-SAT and official `validator.py`.
  - Authoring unit and integration tests with Pytest.
