"""Tests for RAG system document retrieval and grounded response generation."""

from ai.rag.pipeline import CampusRAG


def test_rag_retrieval_and_grounding():
    rag = CampusRAG()
    assert len(rag.chunks) > 0

    # Query about lab start periods
    res = rag.answer_query("When do labs start?")
    assert res["grounded"] is True
    assert "P2" in res["answer"] or "P6" in res["answer"] or "lab" in res["answer"].lower()
    assert len(res["sources"]) > 0


def test_rag_unknown_query():
    rag = CampusRAG()
    # Query completely unrelated to campus rules
    res = rag.answer_query("What is the recipe for chocolate cake?")
    assert res["grounded"] is False
    assert "not have authoritative" in res["answer"]
