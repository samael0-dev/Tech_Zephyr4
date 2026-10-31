"""Retrieval-Augmented Generation (RAG) system for CampusOS institutional knowledge.

Backed by Neon PostgreSQL knowledge_documents and document_chunks tables,
with local markdown fallback.
"""

import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from api.database import execute_query


@dataclass
class DocumentChunk:
    chunk_id: str
    source_file: str
    section_title: str
    content: str
    keywords: List[str] = field(default_factory=list)


@dataclass
class RetrievalResult:
    chunk: DocumentChunk
    score: float


class CampusRAG:
    """Document ingestion, chunking, keyword-semantic retrieval, and grounded response generation."""

    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self._load_corpus()

    def _extract_keywords(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", text.lower())
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "are", "have",
            "you", "your", "can", "should", "not", "each", "all", "what", "how",
        }
        return [w for w in words if w not in stopwords]

    def _chunk_markdown(self, file_path: Path, source_name: str):
        if not file_path.exists():
            return
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        sections = re.split(r"\n(?=#{1,3}\s)", text)
        for i, sec in enumerate(sections):
            lines = sec.strip().splitlines()
            if not lines:
                continue
            title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"Section {i+1}"
            content = "\n".join(lines).strip()
            if len(content) < 30:
                continue

            chunk = DocumentChunk(
                chunk_id=f"{source_name}_{i}",
                source_file=source_name,
                section_title=title,
                content=content,
                keywords=self._extract_keywords(content),
            )
            self.chunks.append(chunk)

    def _load_corpus(self):
        """Load corpus from Neon PostgreSQL document_chunks table, falling back to markdown files."""
        try:
            sql = """
            SELECT dc.id as chunk_id, kd.source_file, dc.section_title, dc.content, dc.keywords
            FROM document_chunks dc
            JOIN knowledge_documents kd ON kd.id = dc.document_id
            ORDER BY dc.document_id, dc.chunk_index;
            """
            rows = execute_query(sql)
            if rows:
                for r in rows:
                    kw = r["keywords"] if isinstance(r["keywords"], list) else self._extract_keywords(r["content"])
                    self.chunks.append(
                        DocumentChunk(
                            chunk_id=r["chunk_id"],
                            source_file=r["source_file"],
                            section_title=r["section_title"],
                            content=r["content"],
                            keywords=kw,
                        )
                    )
                return
        except Exception as e:
            # Fallback to local files if DB offline
            pass

        # Local markdown fallback
        root = Path(__file__).resolve().parents[2]
        self._chunk_markdown(root / "CrunchWeek_StarterPack" / "README.md", "README.md")
        self._chunk_markdown(root / "CrunchWeek_StarterPack" / "examples" / "sample_requests.md", "sample_requests.md")
        self._chunk_markdown(root / "docs" / "scheduling-rules.md", "scheduling-rules.md")

    def retrieve(self, query: str, top_k: int = 3) -> List[RetrievalResult]:
        """Retrieve most relevant chunks using BM25-style term frequency matching."""
        q_tokens = self._extract_keywords(query)
        if not q_tokens:
            return []

        results = []
        for chunk in self.chunks:
            score = 0.0
            chunk_kw_set = set(chunk.keywords)
            for token in q_tokens:
                if token in chunk_kw_set:
                    tf = chunk.keywords.count(token)
                    score += 1.0 + math.log(1.0 + tf)
                    if token in chunk.section_title.lower():
                        score += 3.0

            if score > 0.0:
                results.append(RetrievalResult(chunk=chunk, score=score))

        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]

    def answer_query(self, query: str) -> Dict[str, Any]:
        """Answer campus operational question with grounded context and source attribution."""
        retrieved = self.retrieve(query, top_k=2)

        if not retrieved or retrieved[0].score < 1.0:
            return {
                "query": query,
                "answer": "I do not have authoritative information on this topic in the campus policy corpus.",
                "sources": [],
                "confidence": 0.0,
                "grounded": False,
            }

        top_chunk = retrieved[0].chunk
        sources = [
            {"source_file": r.chunk.source_file, "section": r.chunk.section_title, "score": round(r.score, 2)}
            for r in retrieved
        ]

        summary_lines = [line.strip() for line in top_chunk.content.splitlines() if line.strip() and not line.startswith("#")]
        concise_ans = " ".join(summary_lines[:4])

        return {
            "query": query,
            "answer": concise_ans,
            "sources": sources,
            "confidence": min(1.0, round(retrieved[0].score / 10.0, 2)),
            "grounded_chunk": top_chunk.content[:400] + ("..." if len(top_chunk.content) > 400 else ""),
            "grounded": True,
        }


_rag_instance: Optional[CampusRAG] = None


def get_rag() -> CampusRAG:
    """Singleton getter for CampusRAG."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = CampusRAG()
    return _rag_instance
