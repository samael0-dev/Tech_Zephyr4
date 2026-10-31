from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    title: str
    category: str
    department: Optional[str]
    academic_year: str
    access_role_minimum: str
    page: int
    chunk_index: int
    content: str
    word_count: int
    metadata: Dict[str, Any]


def chunk_document_text(
    doc_id: str,
    title: str,
    category: str,
    pages_text: List[tuple],  # [(page_num, text)]
    department: Optional[str] = None,
    academic_year: str = "2026-2027",
    access_role_minimum: str = "student",
    max_chunk_chars: int = 600,
    overlap_chars: int = 100,
) -> List[DocumentChunk]:
    """
    Intelligently splits document pages into contextual chunks
    preserving document hierarchy and search metadata.
    """
    chunks: List[DocumentChunk] = []
    global_chunk_idx = 0

    for page_num, page_content in pages_text:
        # Split by double newline (paragraphs / sections)
        paragraphs = [p.strip() for p in page_content.split("\n\n") if p.strip()]

        current_buffer = ""
        for p in paragraphs:
            if len(current_buffer) + len(p) + 2 <= max_chunk_chars:
                current_buffer = f"{current_buffer}\n\n{p}".strip()
            else:
                if current_buffer:
                    global_chunk_idx += 1
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{doc_id}-p{page_num}-c{global_chunk_idx}",
                            doc_id=doc_id,
                            title=title,
                            category=category,
                            department=department,
                            academic_year=academic_year,
                            access_role_minimum=access_role_minimum,
                            page=page_num,
                            chunk_index=global_chunk_idx,
                            content=current_buffer,
                            word_count=len(current_buffer.split()),
                            metadata={
                                "doc_id": doc_id,
                                "title": title,
                                "category": category,
                                "department": department,
                                "page": page_num,
                            },
                        )
                    )
                # Handle large paragraph that exceeds max_chunk_chars on its own
                if len(p) > max_chunk_chars:
                    # Slide through large paragraph
                    start = 0
                    while start < len(p):
                        sub_chunk = p[start : start + max_chunk_chars]
                        global_chunk_idx += 1
                        chunks.append(
                            DocumentChunk(
                                chunk_id=f"{doc_id}-p{page_num}-c{global_chunk_idx}",
                                doc_id=doc_id,
                                title=title,
                                category=category,
                                department=department,
                                academic_year=academic_year,
                                access_role_minimum=access_role_minimum,
                                page=page_num,
                                chunk_index=global_chunk_idx,
                                content=sub_chunk,
                                word_count=len(sub_chunk.split()),
                                metadata={
                                    "doc_id": doc_id,
                                    "title": title,
                                    "category": category,
                                    "department": department,
                                    "page": page_num,
                                },
                            )
                        )
                        start += max_chunk_chars - overlap_chars
                    current_buffer = ""
                else:
                    current_buffer = p

        if current_buffer:
            global_chunk_idx += 1
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{doc_id}-p{page_num}-c{global_chunk_idx}",
                    doc_id=doc_id,
                    title=title,
                    category=category,
                    department=department,
                    academic_year=academic_year,
                    access_role_minimum=access_role_minimum,
                    page=page_num,
                    chunk_index=global_chunk_idx,
                    content=current_buffer,
                    word_count=len(current_buffer.split()),
                    metadata={
                        "doc_id": doc_id,
                        "title": title,
                        "category": category,
                        "department": department,
                        "page": page_num,
                    },
                )
            )

    return chunks
