"""Minimal auth: salted PBKDF2 password hashing + opaque bearer tokens stored in DB.

The token lifecycle is intentionally lightweight: access tokens and refresh tokens are
issued as opaque random strings, stored with an expiry and revocation flag, and can be
cleaned up safely without rewriting the rest of the app.
"""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import models
from .database import get_db

bearer_scheme = HTTPBearer(auto_error=False)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return digest.hex(), salt


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    digest, _ = hash_password(password, salt)
    return secrets.compare_digest(digest, expected_hash)


def create_token(db: Session, user: models.User, kind: str = "access", session_id: Optional[str] = None, expires_delta: Optional[timedelta] = None) -> str:
    token = secrets.token_urlsafe(32)
    expires = utcnow() + (expires_delta or (timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) if kind == "access" else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)))
    row = models.Token(
        token=token,
        token_hash=hash_token(token),
        user_id=user.id,
        kind=kind,
        session_id=session_id or secrets.token_hex(16),
        expires_at=expires,
        revoked=False,
        created_at=utcnow(),
        updated_at=utcnow(),
        last_used_at=utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return token


def create_refresh_token(db: Session, user: models.User, session_id: Optional[str] = None) -> str:
    return create_token(db, user, kind="refresh", session_id=session_id)


def _lookup_token(db: Session, raw_token: str, kind: Optional[str] = None):
    digest = hash_token(raw_token)
    query = db.query(models.Token).filter(or_(models.Token.token == raw_token, models.Token.token_hash == digest))
    if kind:
        query = query.filter(models.Token.kind == kind)
    return query.order_by(models.Token.created_at.desc()).first()


def is_token_valid(db: Session, raw_token: str, kind: Optional[str] = None) -> Optional[models.Token]:
    token_row = _lookup_token(db, raw_token, kind=kind)
    if not token_row:
        return None
    if token_row.revoked:
        return None
    if token_row.expires_at is None or token_row.expires_at <= utcnow():
        return None
    return token_row


def revoke_token(db: Session, raw_token: str, kind: Optional[str] = None) -> bool:
    token_row = _lookup_token(db, raw_token, kind=kind)
    if not token_row:
        return False
    token_row.revoked = True
    token_row.updated_at = utcnow()
    token_row.expires_at = utcnow()
    db.commit()
    return True


def cleanup_expired_tokens(db: Session) -> int:
    now = utcnow()
    deleted = db.query(models.Token).filter((models.Token.expires_at <= now) | (models.Token.revoked.is_(True))).delete(synchronize_session=False)
    db.commit()
    return deleted


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> models.User:
    raw_token = creds.credentials if (creds and creds.credentials) else token
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token_row = is_token_valid(db, raw_token, kind="access")
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token_row.last_used_at = utcnow()
    db.commit()
    user = db.query(models.User).filter(models.User.id == token_row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


def get_refresh_token_user(
    raw_token: str,
    db: Session,
) -> Optional[models.User]:
    token_row = is_token_valid(db, raw_token, kind="refresh")
    if not token_row:
        return None
    user = db.query(models.User).filter(models.User.id == token_row.user_id).first()
    return user
