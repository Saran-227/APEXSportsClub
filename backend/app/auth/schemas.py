"""Pydantic schemas for authentication and user account operations."""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CSRFInitResponse(BaseModel):
    """Response returned by pre-login CSRF initialization."""

    csrf_token: str
    message: str = "CSRF token initialized"


class LoginRequest(BaseModel):
    """Credentials required for user authentication."""

    email: EmailStr = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=1, max_length=128, description="User password")


class UserResponse(BaseModel):
    """Public user profile summary."""

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    is_active: bool
    is_verified: bool
    roles: List[str]
    permissions: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(BaseModel):
    """Detailed user profile for authenticated me endpoint."""

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    roles: List[str]
    permissions: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    """Response returned upon successful authentication."""

    message: str = "Login successful"
    user: UserResponse
    csrf_token: str


class LogoutResponse(BaseModel):
    """Response returned upon session termination."""

    message: str = "Logout successful"
