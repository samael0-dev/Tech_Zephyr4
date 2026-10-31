from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import (
    DEPARTMENT_LAB_ROOM_TYPES,
    ROLE_PERMISSIONS,
    Permission,
    RoleEnum,
)
from app.core.security import decode_access_token
from app.models.booking import BookingRequest
from app.models.room import Room
from app.models.user import User
from app.schemas.auth import CurrentUser

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Calculate permissions dynamically from RoleEnum
    role_enum = RoleEnum(user.role) if user.role in [r.value for r in RoleEnum] else None
    perms = [p.value for p in ROLE_PERMISSIONS.get(role_enum, set())] if role_enum else []

    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        name=user.name,
        role=user.role,
        department=user.department,
        faculty_id=user.faculty_id,
        student_group_id=user.student_group_id,
        club_name=user.club_name,
        permissions=perms,
    )


def require_roles(*allowed_roles: RoleEnum) -> Callable:
    """Dependency that checks if the current user holds one of the specified roles."""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        allowed_values = [r.value if isinstance(r, RoleEnum) else str(r) for r in allowed_roles]
        if current_user.role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{current_user.role}' is not in allowed roles {allowed_values}",
            )
        return current_user

    return role_checker


def require_permission(permission: Permission) -> Callable:
    """Dependency that checks if the current user possesses a specific fine-grained permission."""
    def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        perm_value = permission.value if isinstance(permission, Permission) else str(permission)
        if perm_value not in current_user.permissions and "*" not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Missing required permission '{perm_value}'",
            )
        return current_user

    return permission_checker


# Data Isolation & Access Checks

def check_department_access(user: CurrentUser, target_department: Optional[str]) -> bool:
    """
    Ensures department isolation:
    - Admins have institutional access.
    - Department coordinators can only access their assigned department.
    """
    if user.role == RoleEnum.ADMIN.value:
        return True
    if not target_department:
        return False
    return user.department == target_department


def check_student_group_access(user: CurrentUser, target_group_id: Optional[str]) -> bool:
    """
    Ensures student group isolation:
    - Admins have institutional access.
    - Students can only access their specific student group schedule.
    """
    if user.role == RoleEnum.ADMIN.value:
        return True
    if not target_group_id:
        return False
    return user.student_group_id == target_group_id


def check_faculty_access(user: CurrentUser, target_faculty_id: Optional[str]) -> bool:
    """
    Ensures faculty schedule isolation:
    - Admins have institutional access.
    - Faculty can only access their assigned faculty ID schedule.
    """
    if user.role == RoleEnum.ADMIN.value:
        return True
    if not target_faculty_id:
        return False
    return user.faculty_id == target_faculty_id


def enforce_no_self_approval(requester_user_id: Optional[str], approver_user_id: str) -> None:
    """
    Approval Security: Nobody can approve their own request.
    Raises 403 Forbidden if requester matches approver.
    """
    if requester_user_id and requester_user_id == approver_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approval security violation: You cannot approve or decide your own request (No Self-Approval rule).",
        )


def check_booking_approval_authority(
    user: CurrentUser,
    booking: BookingRequest,
    room: Optional[Room],
) -> bool:
    """
    Checks if the user has authorization to approve or decide on the booking:
    1. Admin can approve any valid booking request.
    2. Department coordinator can approve bookings only for their department's labs.
    3. Self-approval is strictly forbidden.
    """
    # Enforce No Self-Approval
    enforce_no_self_approval(booking.requester_user_id, user.id)

    if user.role == RoleEnum.ADMIN.value:
        return True

    if user.role == RoleEnum.DEPARTMENT_COORDINATOR.value:
        if not room:
            return False
        allowed_room_types = DEPARTMENT_LAB_ROOM_TYPES.get(user.department or "", [])
        if room.type in allowed_room_types:
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Department coordinators can only approve bookings for their department's lab rooms ({allowed_room_types}). Room '{room.id}' is of type '{room.type}'.",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not possess the required approval authority for this booking.",
    )
