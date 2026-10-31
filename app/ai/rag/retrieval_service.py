from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.ai.rag.chunking import chunk_document_text
from app.ai.rag.documents import CIT_KNOWLEDGE_DOCUMENTS
from app.ai.rag.extraction import clean_text, extract_text_from_string
from app.ai.rag.vector_store import citrix_vector_store
from app.models.knowledge import KnowledgeDocument


def initialize_default_knowledge_base(db: Optional[Session] = None):
    """
    Seeds and indexes the built-in CIT institutional policies,
    Spectra fest regulations, room catalog, and exam guidelines.
    """
    citrix_vector_store.clear()

    for doc_meta in CIT_KNOWLEDGE_DOCUMENTS:
        doc_id = doc_meta["id"]
        title = doc_meta["title"]
        category = doc_meta["category"]
        dept = doc_meta.get("department")
        role_min = doc_meta.get("access_role_minimum", "student")
        raw_text = clean_text(doc_meta["content"])

        # Chunk document
        pages = extract_text_from_string(raw_text)
        chunks = chunk_document_text(
            doc_id=doc_id,
            title=title,
            category=category,
            pages_text=pages,
            department=dept,
            access_role_minimum=role_min,
        )
        citrix_vector_store.add_chunks(chunks)

        # Sync with DB if session provided
        if db:
            existing = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
            if not existing:
                db.add(
                    KnowledgeDocument(
                        id=doc_id,
                        title=title,
                        category=category,
                        department=dept,
                        raw_content=raw_text,
                        page_count=len(pages),
                        chunk_count=len(chunks),
                        source_identifier=f"builtin://{doc_id}",
                        access_role_minimum=role_min,
                    )
                )
    if db:
        db.commit()


def ingest_document_file(
    db: Session,
    doc_id: str,
    title: str,
    category: str,
    raw_content: str,
    department: Optional[str] = None,
    file_type: str = "txt",
    access_role_minimum: str = "student",
    uploaded_by_user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ingests an uploaded text, markdown, or PDF document into the RAG vector store and database.
    """
    pages = extract_text_from_string(raw_content)
    chunks = chunk_document_text(
        doc_id=doc_id,
        title=title,
        category=category,
        pages_text=pages,
        department=department,
        access_role_minimum=access_role_minimum,
    )
    citrix_vector_store.add_chunks(chunks)

    # Save to database
    db_doc = KnowledgeDocument(
        id=doc_id,
        title=title,
        category=category,
        department=department,
        file_type=file_type,
        raw_content=raw_content,
        page_count=len(pages),
        chunk_count=len(chunks),
        source_identifier=f"upload://{title}",
        uploaded_by_user_id=uploaded_by_user_id,
        access_role_minimum=access_role_minimum,
    )
    db.add(db_doc)
    db.commit()

    return {
        "doc_id": doc_id,
        "title": title,
        "category": category,
        "chunks_indexed": len(chunks),
        "pages": len(pages),
    }


def retrieve_relevant_knowledge(
    query: str,
    user_role: str = "student",
    user_department: Optional[str] = None,
    category: Optional[str] = None,
    top_k: int = 3,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Performs role-aware semantic and keyword retrieval against the CITRIX knowledge base.
    Returns:
    - assembled_context: Grounding context string for prompt assembly.
    - citations: Structured citations list with metadata and source text.
    """
    if len(citrix_vector_store.chunks) == 0:
        initialize_default_knowledge_base()

    matches = citrix_vector_store.search(
        query=query,
        user_role=user_role,
        user_department=user_department,
        category=category,
        top_k=top_k,
    )

    if not matches:
        return "", []

    context_blocks = []
    citations = []

    for idx, (chunk, score) in enumerate(matches, start=1):
        citation_info = {
            "source_id": chunk.doc_id,
            "title": chunk.title,
            "category": chunk.category,
            "page": chunk.page,
            "relevance_score": round(score, 3),
            "snippet": chunk.content[:200] + "...",
        }
        citations.append(citation_info)

        block = (
            f"[Source {idx}: {chunk.title} | Category: {chunk.category} | Page: {chunk.page}]\n"
            f"{chunk.content.strip()}"
        )
        context_blocks.append(block)

    assembled_context = "\n\n---\n\n".join(context_blocks)
    return assembled_context, citations
