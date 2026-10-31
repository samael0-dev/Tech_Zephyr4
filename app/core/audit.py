from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.schemas.auth import CurrentUser


def log_audit_event(
    db: Session,
    actor: Optional[CurrentUser],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Records an immutable audit log entry for critical system events.
    """
    actor_id = actor.id if actor else "system"
    actor_role = actor.role if actor else "system"

    log_entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        status=status,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
