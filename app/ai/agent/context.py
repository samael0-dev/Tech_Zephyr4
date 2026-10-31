from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class ConversationTurn:
    role: str  # user or assistant
    content: str
    timestamp: str
    intent: Optional[str] = None
    entities: Dict[str, Any] = field(default_factory=dict)
    tool_executed: Optional[str] = None


@dataclass
class ConversationSession:
    session_id: str
    user_id: str
    user_role: str
    accumulated_slots: Dict[str, Any] = field(default_factory=dict)
    history: List[ConversationTurn] = field(default_factory=list)
    pending_confirmation_action: Optional[Dict[str, Any]] = None


class ConversationManager:
    """
    In-memory multi-turn conversational session manager for CITRIX Agentic AI.
    """

    def __init__(self, max_history_turns: int = 10):
        self._sessions: Dict[str, ConversationSession] = {}
        self.max_history_turns = max_history_turns

    def get_or_create_session(self, session_id: str, user_id: str, user_role: str) -> ConversationSession:
        if session_id not in self._sessions:
            self._sessions[session_id] = ConversationSession(
                session_id=session_id,
                user_id=user_id,
                user_role=user_role,
            )
        return self._sessions[session_id]

    def add_user_turn(
        self,
        session_id: str,
        user_id: str,
        user_role: str,
        content: str,
        intent: str,
        entities: Dict[str, Any],
    ) -> ConversationSession:
        session = self.get_or_create_session(session_id, user_id, user_role)

        # Merge extracted entities into accumulated slots
        session.accumulated_slots.update(entities)

        turn = ConversationTurn(
            role="user",
            content=content,
            timestamp=datetime.now(timezone.utc).isoformat(),
            intent=intent,
            entities=entities,
        )
        session.history.append(turn)

        # Trim history if exceeds limit
        if len(session.history) > self.max_history_turns:
            session.history = session.history[-self.max_history_turns :]

        return session

    def add_assistant_turn(
        self,
        session_id: str,
        content: str,
        tool_executed: Optional[str] = None,
        pending_action: Optional[Dict[str, Any]] = None,
    ):
        if session_id in self._sessions:
            session = self._sessions[session_id]
            session.history.append(
                ConversationTurn(
                    role="assistant",
                    content=content,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    tool_executed=tool_executed,
                )
            )
            session.pending_confirmation_action = pending_action

    def clear_accumulated_slots(self, session_id: str):
        if session_id in self._sessions:
            self._sessions[session_id].accumulated_slots = {}
            self._sessions[session_id].pending_confirmation_action = None


# Global Conversation Manager Singleton
conversation_manager = ConversationManager()
