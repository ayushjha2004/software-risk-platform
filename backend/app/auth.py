"""Minimal auth: salted PBKDF2 password hashing + opaque bearer tokens stored in DB.

This is intentionally dependency-free (no passlib/jwt) so the project runs with a
plain `pip install -r requirements.txt` — swap in JWT/OAuth for a production system.
"""
import hashlib
import os
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from . import models

bearer_scheme = HTTPBearer()


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return digest.hex(), salt


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    digest, _ = hash_password(password, salt)
    return secrets.compare_digest(digest, expected_hash)


def create_token(db: Session, user: models.User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(models.Token(token=token, user_id=user.id))
    db.commit()
    return token


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    token_row = db.query(models.Token).filter(models.Token.token == creds.credentials).first()
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(models.User).filter(models.User.id == token_row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
