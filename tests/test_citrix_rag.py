from fastapi.testclient import TestClient

from app.ai.rag.retrieval_service import (
    initialize_default_knowledge_base,
    retrieve_relevant_knowledge,
)
from app.ai.rag.vector_store import citrix_vector_store


def get_token(client: TestClient, email: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": "password123"},
    )
    return res.json()["data"]["access_token"]


def test_rag_knowledge_base_indexing():
    """
    Verifies default CIT knowledge documents are properly indexed and chunked.
    """
    initialize_default_knowledge_base()
    assert len(citrix_vector_store.chunks) > 5

    # Check metadata integrity on chunks
    sample_chunk = citrix_vector_store.chunks[0]
    assert sample_chunk.doc_id.startswith("DOC-")
    assert sample_chunk.title is not None
    assert sample_chunk.page >= 1
    assert sample_chunk.word_count > 0


def test_rag_semantic_retrieval_and_citations():
    """
    Tests semantic retrieval for core institutional policies and validates citations.
    """
    # 1. Query about Lunch Break & Lab timings
    context, citations = retrieve_relevant_knowledge("What time is lunch break and when can 3 hour labs run?")
    assert len(citations) > 0
    assert "lunch" in context.lower() or "13:00" in context
    assert "p2" in context.lower() or "p6" in context.lower()

    # Verify citation structure
    cit = citations[0]
    assert "source_id" in cit
    assert "title" in cit
    assert "page" in cit
    assert "relevance_score" in cit
    assert cit["relevance_score"] > 0

    # 2. Query about Exam Capacity Halving Rule
    exam_context, exam_cit = retrieve_relevant_knowledge("How is room capacity checked during midsem examinations?")
    assert len(exam_cit) > 0
    assert "halved" in exam_context.lower() or "capacity" in exam_context.lower()


def test_rag_role_based_access_filtering():
    """
    Verifies that lower-privileged roles cannot retrieve restricted documents.
    """
    # Query for emergency disruption protocol (access_role_minimum: faculty)
    student_ctx, student_cit = retrieve_relevant_knowledge(
        query="Emergency schedule disruption protocol and minimal displacement",
        user_role="student",
    )
    # Student should not see DOC-DISRUPT-05
    assert not any(c["source_id"] == "DOC-DISRUPT-05" for c in student_cit)

    # Admin should be able to see it
    admin_ctx, admin_cit = retrieve_relevant_knowledge(
        query="Emergency schedule disruption protocol and minimal displacement",
        user_role="admin",
    )
    assert any(c["source_id"] == "DOC-DISRUPT-05" for c in admin_cit)


def test_rag_api_endpoints(client: TestClient):
    """
    Tests the RAG HTTP endpoints for searching and listing documents.
    """
    student_token = get_token(client, "student.y1a@cit.edu")
    admin_token = get_token(client, "dean@cit.edu")

    # 1. Search knowledge base via API
    search_resp = client.post(
        "/api/v1/rag/search",
        json={"query": "Spectra tech fest priority rules for venue booking"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert search_resp.status_code == 200
    res_data = search_resp.json()["data"]
    assert len(res_data["citations"]) > 0
    assert "spectra" in res_data["assembled_context"].lower()

    # 2. List knowledge documents
    list_resp = client.get(
        "/api/v1/rag/documents",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 5

    # 3. Ingest custom document by Admin
    doc_payload = {
        "title": "CIT Library Silent Study Hall Guidelines",
        "category": "policy",
        "department": None,
        "content": "The library silent hall on the 2nd floor is open from 08:00 to 22:00. No group discussions permitted.",
        "access_role_minimum": "student",
    }
    create_doc_resp = client.post(
        "/api/v1/rag/documents",
        json=doc_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_doc_resp.status_code == 200
    assert create_doc_resp.json()["data"]["chunks_indexed"] >= 1
