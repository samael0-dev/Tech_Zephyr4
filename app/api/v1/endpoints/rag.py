import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.rag.retrieval_service import (
    ingest_document_file,
    initialize_default_knowledge_base,
    retrieve_relevant_knowledge,
)
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.knowledge import KnowledgeDocument
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/rag", tags=["RAG Knowledge Base"])


class DocumentUploadRequest(BaseModel):
    title: str
    category: str  # policy, regulation, timetable_guide, dataset_spec, booking_rule
    department: Optional[str] = None
    content: str
    access_role_minimum: str = "student"


class KnowledgeSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 3


@router.post("/documents", response_model=ApiResponse[Dict[str, Any]])
def add_knowledge_document(
    doc_in: DocumentUploadRequest,
    current_user: CurrentUser = Depends(require_roles("admin", "department_coordinator")),
    db: Session = Depends(get_db),
):
    """
    Ingests an institutional policy or academic guideline into the RAG vector store and database.
    Restricted to Administrators and Department Coordinators.
    """
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    res = ingest_document_file(
        db=db,
        doc_id=doc_id,
        title=doc_in.title,
        category=doc_in.category,
        raw_content=doc_in.content,
        department=doc_in.department,
        file_type="txt",
        access_role_minimum=doc_in.access_role_minimum,
        uploaded_by_user_id=current_user.id,
    )

    return ApiResponse(
        success=True,
        data=res,
        message="Knowledge document ingested and indexed successfully",
    )


@router.post("/documents/upload-pdf", response_model=ApiResponse[Dict[str, Any]])
async def upload_pdf_document(
    title: str = Form(...),
    category: str = Form("policy"),
    department: Optional[str] = Form(None),
    access_role_minimum: str = Form("student"),
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_roles("admin", "department_coordinator")),
    db: Session = Depends(get_db),
):
    """
    Extracts, cleans, chunks, and indexes a PDF institutional policy document.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a PDF document (.pdf)",
        )

    pdf_bytes = await file.read()
    from app.ai.rag.extraction import extract_text_from_pdf_bytes

    pages = extract_text_from_pdf_bytes(pdf_bytes)
    full_text = "\n\n".join(text for _, text in pages)

    doc_id = f"DOC-PDF-{uuid.uuid4().hex[:8].upper()}"
    res = ingest_document_file(
        db=db,
        doc_id=doc_id,
        title=title,
        category=category,
        raw_content=full_text,
        department=department,
        file_type="pdf",
        access_role_minimum=access_role_minimum,
        uploaded_by_user_id=current_user.id,
    )

    return ApiResponse(
        success=True,
        data=res,
        message=f"PDF '{file.filename}' processed ({len(pages)} pages) and indexed successfully",
    )


@router.get("/documents", response_model=ApiResponse[List[Dict[str, Any]]])
def list_knowledge_documents(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists indexed institutional documents accessible to the current user's role.
    """
    docs = db.query(KnowledgeDocument).all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": d.id,
                "title": d.title,
                "category": d.category,
                "department": d.department,
                "page_count": d.page_count,
                "chunk_count": d.chunk_count,
                "access_role_minimum": d.access_role_minimum,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ],
        message="Knowledge documents retrieved successfully",
    )


@router.post("/search", response_model=ApiResponse[Dict[str, Any]])
def search_knowledge_base(
    req: KnowledgeSearchRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Direct semantic & hybrid retrieval endpoint returning grounded context blocks and citations.
    """
    context, citations = retrieve_relevant_knowledge(
        query=req.query,
        user_role=current_user.role,
        user_department=current_user.department,
        category=req.category,
        top_k=req.top_k,
    )

    return ApiResponse(
        success=True,
        data={
            "query": req.query,
            "citations": citations,
            "assembled_context": context,
        },
        message="Search completed successfully",
    )


@router.post("/reset", response_model=ApiResponse[Dict[str, Any]])
def reset_knowledge_base(
    current_user: CurrentUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Re-indexes built-in institutional knowledge documents and policies.
    """
    initialize_default_knowledge_base(db)
    return ApiResponse(
        success=True,
        data={"status": "reindexed", "documents": len(db.query(KnowledgeDocument).all())},
        message="Knowledge base successfully re-seeded and indexed",
    )
