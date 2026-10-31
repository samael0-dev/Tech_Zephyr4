import io
import re
from typing import List, Tuple

from pypdf import PdfReader

# Adversarial prompt injection defense patterns
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"system\s+(?:override|prompt)\b",
    r"you\s+are\s+now\s+(?:in\s+)?god\s+mode",
    r"developer\s+mode\s+enabled",
    r"disregard\s+(?:all\s+)?(?:safety|policy|guidelines)",
    r"bypass\s+(?:rbac|permissions|security)",
]


def clean_text(text: str) -> str:
    """
    Cleans, normalizes, and sanitizes document text against adversarial prompt injections.
    """
    if not text:
        return ""
    # Normalize unicode whitespace
    text = re.sub(r"[\r\t\f\v]", " ", text)
    # Collapse multiple consecutive newlines into double newlines
    text = re.sub(r"\n\s*\n", "\n\n", text)
    # Collapse multiple consecutive spaces
    text = re.sub(r" +", " ", text)

    # Neutralize prompt injection attempts in untrusted content
    for pattern in PROMPT_INJECTION_PATTERNS:
        text = re.sub(pattern, "[SANITIZED: Disallowed instruction override attempt]", text, flags=re.IGNORECASE)

    return text.strip()


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> List[Tuple[int, str]]:
    """
    Extracts text from PDF bytes page by page.
    Returns list of (page_number, cleaned_text).
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted_pages = []
    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        page_text = page.extract_text() or ""
        cleaned = clean_text(page_text)
        if cleaned:
            extracted_pages.append((page_num, cleaned))
    return extracted_pages


def extract_text_from_string(raw_text: str) -> List[Tuple[int, str]]:
    """
    Processes plain text or markdown string, splitting into pages or sections.
    """
    cleaned = clean_text(raw_text)
    return [(1, cleaned)]
