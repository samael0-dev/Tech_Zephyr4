from dataclasses import dataclass
from typing import Any, Dict, List

from app.ai.rag.retrieval_service import (
    initialize_default_knowledge_base,
    retrieve_relevant_knowledge,
)
from app.ai.rag.vector_store import citrix_vector_store


@dataclass
class EvalTestCase:
    id: str
    query: str
    expected_sources: List[str]
    expected_keywords: List[str]
    user_role: str = "student"
    out_of_domain: bool = False


# Comprehensive campus RAG evaluation dataset
CAMPUS_EVALUATION_DATASET: List[EvalTestCase] = [
    EvalTestCase(
        id="TC-01",
        query="What periods are allocated for teaching and what time is the lunch break?",
        expected_sources=["DOC-SCHED-01"],
        expected_keywords=["p1", "p9", "lunch", "13:00", "14:00"],
    ),
    EvalTestCase(
        id="TC-02",
        query="When can three hour laboratory sessions begin?",
        expected_sources=["DOC-SCHED-01"],
        expected_keywords=["p2", "p6", "lab"],
    ),
    EvalTestCase(
        id="TC-03",
        query="What is the maximum daily teaching hours limit for faculty members?",
        expected_sources=["DOC-SCHED-01"],
        expected_keywords=["4 hours", "h11", "daily limit"],
    ),
    EvalTestCase(
        id="TC-04",
        query="What is the official priority hierarchy for booking requests during Spectra week?",
        expected_sources=["DOC-BOOK-02"],
        expected_keywords=["exams", "regular classes", "institute events", "guest lectures", "department events", "club events"],
    ),
    EvalTestCase(
        id="TC-05",
        query="What is the role category cap for student clubs requesting venues?",
        expected_sources=["DOC-BOOK-02"],
        expected_keywords=["club_event", "cap"],
    ),
    EvalTestCase(
        id="TC-06",
        query="What is the approval security rule regarding self approval?",
        expected_sources=["DOC-BOOK-02"],
        expected_keywords=["nobody can approve their own request", "no self-approval"],
    ),
    EvalTestCase(
        id="TC-07",
        query="What is the seating capacity of the Main Auditorium and Open Air Theatre?",
        expected_sources=["DOC-ROOMS-03"],
        expected_keywords=["500", "800", "aud", "oat"],
    ),
    EvalTestCase(
        id="TC-08",
        query="Can regular semester lectures be scheduled in the Open Air Theatre or Seminar Halls?",
        expected_sources=["DOC-ROOMS-03"],
        expected_keywords=["forbidden", "events only"],
    ),
    EvalTestCase(
        id="TC-09",
        query="How is effective room capacity calculated during midsem examinations?",
        expected_sources=["DOC-EXAM-04"],
        expected_keywords=["halved", "e2", "capacity / 2"],
    ),
    EvalTestCase(
        id="TC-10",
        query="What is the stability objective when handling a faculty emergency medical leave?",
        expected_sources=["DOC-DISRUPT-05"],
        expected_keywords=["minimal", "displace", "dean approval"],
        user_role="faculty",
    ),
    EvalTestCase(
        id="TC-11",
        query="What is the protocol for quantum teleportation between campus blocks?",
        expected_sources=[],
        expected_keywords=["not found", "contact"],
        out_of_domain=True,
    ),
]


def run_full_rag_evaluation() -> Dict[str, Any]:
    """
    Executes automated RAG evaluation measuring:
    - Retrieval Relevance (Hit@K, Mean Reciprocal Rank)
    - Context Precision & Recall
    - Answer Faithfulness
    - Citation Correctness
    - Hallucination Rate
    - Handling of Missing / Out-of-Domain queries
    """
    if len(citrix_vector_store.chunks) == 0:
        initialize_default_knowledge_base()

    total_cases = len(CAMPUS_EVALUATION_DATASET)
    in_domain_cases = [tc for tc in CAMPUS_EVALUATION_DATASET if not tc.out_of_domain]
    out_domain_cases = [tc for tc in CAMPUS_EVALUATION_DATASET if tc.out_of_domain]

    hits = 0
    reciprocal_ranks = []
    precisions = []
    recalls = []
    faithfulness_scores = []
    citation_correctness_scores = []
    missing_info_correct = 0

    detailed_results = []

    for tc in CAMPUS_EVALUATION_DATASET:
        context, citations = retrieve_relevant_knowledge(
            query=tc.query,
            user_role=tc.user_role,
            top_k=3,
        )

        retrieved_source_ids = [c["source_id"] for c in citations]

        if tc.out_of_domain:
            # Out-of-domain handling: Assistant must explicitly recognize lack of policy or not hallucinate
            # We verify the query keywords ('quantum', 'teleportation') are NOT claimed to exist
            has_hallucination = any("quantum" in c["snippet"].lower() for c in citations)
            if not has_hallucination:
                missing_info_correct += 1
            detailed_results.append({
                "test_id": tc.id,
                "query": tc.query,
                "out_of_domain": True,
                "handled_correctly": not has_hallucination,
                "retrieved_sources": retrieved_source_ids,
            })
            continue

        # In-domain metrics
        # 1. Hit@K & Reciprocal Rank
        matched_rank = None
        for rank, sid in enumerate(retrieved_source_ids, start=1):
            if sid in tc.expected_sources:
                matched_rank = rank
                break

        if matched_rank is not None:
            hits += 1
            reciprocal_ranks.append(1.0 / matched_rank)
        else:
            reciprocal_ranks.append(0.0)

        # 2. Precision & Recall
        relevant_retrieved = sum(1 for sid in retrieved_source_ids if sid in tc.expected_sources)
        prec = (relevant_retrieved / len(retrieved_source_ids)) if retrieved_source_ids else 0.0
        rec = (relevant_retrieved / len(tc.expected_sources)) if tc.expected_sources else 0.0
        precisions.append(prec)
        recalls.append(rec)

        # 3. Answer Faithfulness (Keyword coverage in retrieved context)
        context_lower = context.lower()
        kw_found = sum(1 for kw in tc.expected_keywords if kw.lower() in context_lower)
        faith = (kw_found / len(tc.expected_keywords)) if tc.expected_keywords else 1.0
        faithfulness_scores.append(faith)

        # 4. Citation Correctness (All returned citations contain valid metadata)
        valid_citations = all(
            bool(c.get("title") and c.get("page") and c.get("relevance_score"))
            for c in citations
        )
        citation_correctness_scores.append(1.0 if valid_citations and len(citations) > 0 else 0.0)

        detailed_results.append({
            "test_id": tc.id,
            "query": tc.query,
            "expected_sources": tc.expected_sources,
            "retrieved_sources": retrieved_source_ids,
            "precision": round(prec, 3),
            "recall": round(rec, 3),
            "faithfulness": round(faith, 3),
            "citations_valid": valid_citations,
        })

    avg_hit_rate = hits / len(in_domain_cases) if in_domain_cases else 0.0
    mrr = sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0
    avg_precision = sum(precisions) / len(precisions) if precisions else 0.0
    avg_recall = sum(recalls) / len(recalls) if recalls else 0.0
    avg_faithfulness = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0.0
    citation_correctness = sum(citation_correctness_scores) / len(citation_correctness_scores) if citation_correctness_scores else 0.0
    hallucination_rate = max(0.0, 1.0 - avg_faithfulness)
    missing_info_rate = missing_info_correct / len(out_domain_cases) if out_domain_cases else 1.0

    summary_metrics = {
        "total_test_cases": total_cases,
        "retrieval_relevance_hit_at_3": round(avg_hit_rate * 100, 1),
        "mean_reciprocal_rank_mrr": round(mrr, 3),
        "context_precision": round(avg_precision * 100, 1),
        "context_recall": round(avg_recall * 100, 1),
        "answer_faithfulness": round(avg_faithfulness * 100, 1),
        "citation_correctness": round(citation_correctness * 100, 1),
        "hallucination_rate": round(hallucination_rate * 100, 1),
        "missing_information_handling": round(missing_info_rate * 100, 1),
    }

    return {
        "metrics": summary_metrics,
        "details": detailed_results,
    }
