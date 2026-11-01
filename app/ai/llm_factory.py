import logging
import os
from typing import List, Optional

from dotenv import load_dotenv
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq

load_dotenv(".env")
load_dotenv()

logger = logging.getLogger("citrix.ai")

# Model configuration for ChatGroq with multi-model resiliency and Hinglish support
DEFAULT_MODEL = "openai/gpt-oss-20b"
FALLBACK_GROQ_MODEL = "llama-3.1-8b-instant"
SUPPORTED_GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.1-8b-instant"]
DEFAULT_TEMPERATURE = 0.7

_cached_chat_model: Optional[BaseChatModel] = None


def get_citrix_chat_model(
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
) -> BaseChatModel:
    """
    Instantiates or returns cached ChatGroq model:
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.7
    )
    """
    global _cached_chat_model
    if _cached_chat_model is None:
        api_key = os.getenv("GROQ_API_KEY")
        try:
            _cached_chat_model = ChatGroq(
                model=model,
                temperature=temperature,
                api_key=api_key,
            )
        except Exception as e:
            logger.warning(f"Could not initialize ChatGroq with {model}: {e}")
            try:
                _cached_chat_model = ChatGroq(
                    model=FALLBACK_GROQ_MODEL,
                    temperature=temperature,
                    api_key=api_key,
                )
            except Exception as e2:
                logger.error(f"Fallback ChatGroq initialization failed: {e2}")
    return _cached_chat_model


# Backward compatibility alias
def get_huggingface_llm(*args, **kwargs):
    """Deprecated: replaced by ChatGroq for superior Hinglish support."""
    return get_citrix_chat_model()


def invoke_citrix_llm(
    messages: List[BaseMessage],
    fallback_prompt: Optional[str] = None,
) -> str:
    """
    Safely executes ChatGroq model invocation with Hinglish support.
    If the endpoint encounters rate limit, model availability, or network issues,
    falls back cleanly without crashing the platform.
    """
    api_key = os.getenv("GROQ_API_KEY")
    for target_model in [DEFAULT_MODEL, FALLBACK_GROQ_MODEL]:
        try:
            chat_llm = ChatGroq(
                model=target_model,
                temperature=DEFAULT_TEMPERATURE,
                api_key=api_key,
            )
            response = chat_llm.invoke(messages)
            content = response.content if hasattr(response, "content") else str(response)
            if content and len(content.strip()) > 0:
                return content.strip()
        except Exception as exc:
            logger.debug(f"ChatGroq invocation with {target_model} failed: {exc}")

    # Fallback response for offline or token-free test execution
    return fallback_prompt or "I am CITRIX Assistant. How can I assist you with CIT campus scheduling or bookings?"
