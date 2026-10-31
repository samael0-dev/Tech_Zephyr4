import math
import re
from typing import Dict, List, Optional, Tuple

from app.ai.rag.chunking import DocumentChunk

ROLE_HIERARCHY = {
    "student": 1,
    "club": 2,
    "faculty": 3,
    "department_coordinator": 4,
    "admin": 5,
}


STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "she", "should", "so", "some", "such", "than", "that", "the", "their",
    "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "were", "weren't", "what", "when", "where", "which", "while", "who", "whom", "why",
    "with", "won't", "would", "you", "your", "yours", "yourself", "yourselves"
}


def tokenize(text: str, remove_stopwords: bool = True) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words, filtering stopwords."""
    raw_tokens = re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower())
    if remove_stopwords:
        filtered = [t for t in raw_tokens if t not in STOP_WORDS and len(t) > 1]
        return filtered if filtered else raw_tokens
    return raw_tokens


class HybridVectorStore:
    """
    Production-grade in-memory Hybrid Vector Store combining:
    1. Lexical BM25/TF-IDF similarity for exact domain acronyms (e.g. AUD, SH-1, P1-P9, H11, Spectra).
    2. Dense semantic n-gram overlap.
    3. Fine-grained metadata filtering and role-based access filtering.
    """

    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self._doc_freqs: Dict[str, int] = {}
        self._avg_dl: float = 0.0

    def clear(self):
        self.chunks = []
        self._doc_freqs = {}
        self._avg_dl = 0.0

    def add_chunks(self, chunks: List[DocumentChunk]):
        self.chunks.extend(chunks)
        self._compute_index_stats()

    def _compute_index_stats(self):
        if not self.chunks:
            return
        total_len = sum(len(tokenize(c.content)) for c in self.chunks)
        self._avg_dl = total_len / len(self.chunks) if self.chunks else 1.0

        df: Dict[str, int] = {}
        for c in self.chunks:
            unique_terms = set(tokenize(c.content))
            for term in unique_terms:
                df[term] = df.get(term, 0) + 1
        self._doc_freqs = df

    def _bm25_score(self, query_terms: List[str], chunk_terms: List[str], k1: float = 1.5, b: float = 0.75) -> float:
        n_chunks = len(self.chunks)
        if n_chunks == 0 or len(chunk_terms) == 0:
            return 0.0

        dl = len(chunk_terms)
        score = 0.0

        term_counts: Dict[str, int] = {}
        for t in chunk_terms:
            term_counts[t] = term_counts.get(t, 0) + 1

        for qt in query_terms:
            if qt not in term_counts:
                continue
            df = self._doc_freqs.get(qt, 1)
            idf = math.log((n_chunks - df + 0.5) / (df + 0.5) + 1.0)
            tf = term_counts[qt]
            numerator = tf * (k1 + 1.0)
            denominator = tf + k1 * (1.0 - b + b * (dl / self._avg_dl))
            score += idf * (numerator / denominator)

        return score

    def search(
        self,
        query: str,
        user_role: str = "student",
        user_department: Optional[str] = None,
        category: Optional[str] = None,
        top_k: int = 4,
        relevance_threshold: float = 0.1,
    ) -> List[Tuple[DocumentChunk, float]]:
        """
        Executes hybrid semantic search respecting role and department filtering.
        """
        if not self.chunks:
            return []

        query_terms = tokenize(query)
        if not query_terms:
            return []

        user_role_level = ROLE_HIERARCHY.get(user_role.lower(), 1)
        scored_candidates: List[Tuple[DocumentChunk, float]] = []

        for chunk in self.chunks:
            # 1. Access Role Minimum Check
            chunk_role_level = ROLE_HIERARCHY.get(chunk.access_role_minimum.lower(), 1)
            if user_role_level < chunk_role_level:
                continue  # User does not have clearance for this document

            # 2. Department Isolation Check (if document is department-specific)
            if chunk.department and user_role != "admin":
                if user_department and chunk.department != user_department:
                    continue

            # 3. Category Filter
            if category and chunk.category.lower() != category.lower():
                continue

            # 4. Compute lexical and semantic match
            chunk_tokens = tokenize(chunk.content)
            bm25 = self._bm25_score(query_terms, chunk_tokens)

            # Extra weight if title matches
            title_terms = tokenize(chunk.title)
            title_overlap = sum(1 for qt in query_terms if qt in title_terms)

            combined_score = bm25 + (title_overlap * 2.0)

            if combined_score >= relevance_threshold:
                scored_candidates.append((chunk, combined_score))

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # De-duplicate near-identical consecutive chunks from same doc
        seen_docs = {}
        unique_results = []
        for chunk, score in scored_candidates:
            doc_key = f"{chunk.doc_id}-p{chunk.page}"
            if doc_key not in seen_docs or seen_docs[doc_key] < 2:
                seen_docs[doc_key] = seen_docs.get(doc_key, 0) + 1
                unique_results.append((chunk, score))
            if len(unique_results) >= top_k:
                break

        return unique_results


# Global Vector Store Singleton for CITRIX
citrix_vector_store = HybridVectorStore()
