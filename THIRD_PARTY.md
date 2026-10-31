# Third-Party Libraries & Dependencies

In accordance with Section 6 of the CrunchWeek Problem Statement, all third-party libraries, solvers, and dependencies used in CITRIX are declared below.

---

## 1. Core Framework & Web Server
- **FastAPI (`fastapi` >= 0.110.0):** Asynchronous web framework used for API routing, dependency injection, and schema enforcement.
- **Uvicorn (`uvicorn` >= 0.28.0):** ASGI production web server.
- **Pydantic v2 (`pydantic` >= 2.6.0, `pydantic-settings` >= 2.2.0):** Data validation, settings management, and request/response serialization.

---

## 2. Artificial Intelligence, RAG & LLM
- **LangChain HuggingFace (`langchain_huggingface`):** Integration for Hugging Face inference endpoints and chat models.
- **TinyLlama (`TinyLlama/TinyLlama-1.1B-Chat-v1.0`):** Open-source conversational chat model utilized for institutional query synthesis.
- **PyPDF (`pypdf` >= 4.0.0):** PDF document extraction for institutional knowledge base ingestion.

---

## 3. Database & Persistence
- **SQLAlchemy (`sqlalchemy` >= 2.0.28):** Relational Database Object-Relational Mapper (ORM) powering core entity models, relationships, and queries.
- **SQLite / PostgreSQL (`psycopg2-binary`):** Relational persistence across development, testing, and production environments.

---

## 4. Security, Authentication & Cryptography
- **PyJWT (`PyJWT` >= 2.8.0):** JSON Web Token encoder and decoder for stateless authentication.
- **Bcrypt (`bcrypt` >= 4.1.2):** One-way password hashing and verification.
- **Python Multipart (`python-multipart` >= 0.0.9):** Form data and file upload handling.

---

## 5. Testing, Linting & Code Quality
- **Pytest (`pytest` >= 8.0.0):** Automated test framework for unit, integration, and security assertion suites.
- **HTTPX (`httpx` >= 0.27.0):** TestClient underlying HTTP client for API integration tests.
- **Ruff (`ruff` >= 0.3.0):** High-performance Python linter and code formatter.

---

## 6. Scheduling Validation
- **CrunchWeek Official Validator (`validator.py`):** The un-modified official validation suite provided by Chilika Institute of Technology organizers, executed via subprocess wrapper (`app/services/validator_service.py`).
