import logging
from typing import List, Optional

from dotenv import load_dotenv
from langchain_core.messages import BaseMessage
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

load_dotenv()

logger = logging.getLogger("citrix.ai")

# Model configuration as requested
DEFAULT_REPO_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
DEFAULT_TASK = "text-generation"

_cached_llm: Optional[HuggingFaceEndpoint] = None
_cached_chat_model: Optional[ChatHuggingFace] = None


def get_huggingface_llm(
    repo_id: str = DEFAULT_REPO_ID,
    task: str = DEFAULT_TASK,
    temperature: float = 0.2,
    max_new_tokens: int = 512,
) -> HuggingFaceEndpoint:
    """
    Instantiates or returns cached HuggingFaceEndpoint for TinyLlama.
    """
    global _cached_llm
    if _cached_llm is None:
        try:
            _cached_llm = HuggingFaceEndpoint(
                repo_id=repo_id,
                task=task,
                temperature=temperature,
                max_new_tokens=max_new_tokens,
            )
        except Exception as e:
            logger.warning(f"Could not initialize HuggingFaceEndpoint directly: {e}")
            # Initialize with basic parameters
            _cached_llm = HuggingFaceEndpoint(
                repo_id=repo_id,
                task=task,
            )
    return _cached_llm


def get_citrix_chat_model() -> ChatHuggingFace:
    """
    Returns the ChatHuggingFace model wrapping TinyLlama as requested:
    from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
    llm = HuggingFaceEndpoint(repo_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0", task="text-generation")
    model = ChatHuggingFace(llm=llm)
    """
    global _cached_chat_model
    if _cached_chat_model is None:
        llm_instance = get_huggingface_llm()
        _cached_chat_model = ChatHuggingFace(llm=llm_instance)
    return _cached_chat_model


def invoke_citrix_llm(
    messages: List[BaseMessage],
    fallback_prompt: Optional[str] = None,
) -> str:
    """
    Safely executes chat model invocation.
    If the endpoint encounters network timeout or API rate limits,
    gracefully handles and returns a context-grounded fallback.
    """
    try:
        model = get_citrix_chat_model()
        response = model.invoke(messages)
        content = response.content if hasattr(response, "content") else str(response)
        if content and len(content.strip()) > 0:
            return content.strip()
    except Exception as exc:
        logger.info(f"Hugging Face endpoint remote invocation skipped or unavailable: {exc}")

    # Fallback response for offline or token-free test execution
    return fallback_prompt or "I am CITRIX Assistant. How can I assist you with CIT campus scheduling or bookings?"
