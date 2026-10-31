from app.ai.rag.evaluation import run_full_rag_evaluation


def test_automated_rag_evaluation_benchmarks():
    """
    Automated RAG evaluation suite verifying:
    - Hit@3 >= 90%
    - Mean Reciprocal Rank (MRR) >= 0.8
    - Answer Faithfulness >= 85%
    - Citation Correctness >= 95%
    - Hallucination Rate <= 15%
    - Missing information handling >= 90%
    """
    report = run_full_rag_evaluation()
    metrics = report["metrics"]

    assert metrics["retrieval_relevance_hit_at_3"] >= 90.0, f"Hit@3 too low: {metrics['retrieval_relevance_hit_at_3']}"
    assert metrics["mean_reciprocal_rank_mrr"] >= 0.8, f"MRR too low: {metrics['mean_reciprocal_rank_mrr']}"
    assert metrics["answer_faithfulness"] >= 85.0, f"Faithfulness too low: {metrics['answer_faithfulness']}"
    assert metrics["citation_correctness"] >= 95.0, f"Citation correctness too low: {metrics['citation_correctness']}"
    assert metrics["hallucination_rate"] <= 15.0, f"Hallucination rate too high: {metrics['hallucination_rate']}"
    assert metrics["missing_information_handling"] >= 90.0, f"Missing info handling failed: {metrics['missing_information_handling']}"
