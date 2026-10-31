from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    student_group_id: Optional[str] = None
    club_name: Optional[str] = None
    permissions: List[str] = []
    is_active: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class CurrentUser(BaseModel):
    id: str
    username: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    student_group_id: Optional[str] = None
    club_name: Optional[str] = None
    permissions: List[str] = []
