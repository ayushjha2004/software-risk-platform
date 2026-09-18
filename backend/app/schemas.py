"""Authentication schema models."""
from typing import Optional
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "DEVELOPER"


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    role: str
    email: str
