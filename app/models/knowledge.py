from sqlalchemy import Column, Integer, String, Text

from app.core.database import Base
from app.models.base import TimestampMixin


class KnowledgeDocument(Base, TimestampMixin):
    __tablename__ = "knowledge_documents"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # policy, regulation, timetable_guide, dataset_spec, booking_rule
    department = Column(String(32), nullable=True, index=True)  # null = campus-wide, CSE, ECE, etc.
    academic_year = Column(String(16), default="2026-2027")
    file_type = Column(String(16), default="txt")  # txt, md, pdf
    raw_content = Column(Text, nullable=False)
    page_count = Column(Integer, default=1)
    chunk_count = Column(Integer, default=1)
    source_identifier = Column(String(128), nullable=True)
    uploaded_by_user_id = Column(String(64), nullable=True)
    access_role_minimum = Column(String(32), default="student")  # student, faculty, coordinator, admin
