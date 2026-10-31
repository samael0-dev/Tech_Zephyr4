from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit_event
from app.core.database import get_db
from app.core.permissions import Permission, RoleEnum
from app.core.rbac import get_current_user, require_permission
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, TokenResponse, UserResponse
from app.schemas.response import ApiResponse
from app.services.data_loader import load_starter_pack_data

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates user with username or email and password.
    Returns signed JWT access token and user identity with permissions.
    """
    user = (
        db.query(User)
        .filter(
            (User.username == login_req.username_or_email)
            | (User.email == login_req.username_or_email)
        )
        .first()
    )

    client_ip = request.client.host if request.client else None

    if not user or not verify_password(login_req.password, user.hashed_password):
        # Log failed attempt
        log_audit_event(
            db=db,
            actor=None,
            action="auth:login_failed",
            entity_type="user",
            entity_id=login_req.username_or_email,
            status="FAILED",
            details={"attempted_identifier": login_req.username_or_email},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact the Dean's office.",
        )

    # Issue JWT
    token_claims = {
        "username": user.username,
        "role": user.role,
        "department": user.department,
        "faculty_id": user.faculty_id,
        "student_group_id": user.student_group_id,
        "club_name": user.club_name,
    }
    access_token = create_access_token(subject=user.id, claims=token_claims)

    # Current user representation
    from app.core.permissions import ROLE_PERMISSIONS
    role_enum = RoleEnum(user.role) if user.role in [r.value for r in RoleEnum] else None
    perms = [p.value for p in ROLE_PERMISSIONS.get(role_enum, set())] if role_enum else []

    user_resp = UserResponse(
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
        is_active=user.is_active,
    )

    # Audit log login
    actor = CurrentUser(
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
    log_audit_event(
        db=db,
        actor=actor,
        action="auth:login_success",
        entity_type="user",
        entity_id=user.id,
        status="SUCCESS",
        details={"role": user.role},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=60 * 24 * 60,
            user=user_resp,
        ),
        message="Login successful",
    )


@router.get("/me", response_model=ApiResponse[CurrentUser])
def get_current_user_profile(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns current authenticated user profile, active role, scopes, and granted permissions.
    """
    return ApiResponse(
        success=True,
        data=current_user,
        message="Current user profile retrieved successfully",
    )


@router.post("/reset-demo", response_model=ApiResponse[dict])
def reset_demo_database(
    current_user: CurrentUser = Depends(require_permission(Permission.SYSTEM_RESET_DEMO)),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    Admin-only endpoint: Resets database demo data and starter pack state to pristine clean condition.
    """
    client_ip = request.client.host if request and request.client else None
    res = load_starter_pack_data(db, force_reload=True)

    log_audit_event(
        db=db,
        actor=current_user,
        action="system:reset_demo",
        entity_type="system",
        entity_id="database",
        status="SUCCESS",
        details=res,
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=res,
        message="Demo database reset successfully to starter-pack baseline state",
    )
