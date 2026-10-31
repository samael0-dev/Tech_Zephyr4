from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Permission
from app.core.rbac import require_permission
from app.models.audit_log import AuditLog
from app.schemas.auth import CurrentUser
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("/logs", response_model=ApiResponse[List[Dict[str, Any]]])
def get_audit_logs(
    action: Optional[str] = Query(None),
    actor_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_permission(Permission.AUDIT_VIEW)),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Retrieves tamper-evident audit logs with filters for actor, action, and entity type.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.like(f"%{action}%"))
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return ApiResponse(
        success=True,
        data=[
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "actor_role": log.actor_role,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "status": log.status,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        message="Audit logs retrieved successfully",
    )
