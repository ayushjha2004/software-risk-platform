from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
v1_router = APIRouter(prefix="/api/v1/auth", tags=["auth-v1"])


@router.post("/register", response_model=schemas.TokenResponse)
@v1_router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = payload.role if payload.role in {"ADMIN", "ANALYST", "DEVELOPER"} else "DEVELOPER"
    password_hash, salt = auth.hash_password(payload.password)
    user = models.User(email=payload.email, password_hash=password_hash, salt=salt, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    session_id = auth.secrets.token_hex(16)
    access_token = auth.create_token(db, user, kind="access", session_id=session_id)
    refresh_token = auth.create_token(db, user, kind="refresh", session_id=session_id)
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token, role=user.role, email=user.email)


@router.post("/login", response_model=schemas.TokenResponse)
@v1_router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.salt, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    auth.cleanup_expired_tokens(db)
    session_id = auth.secrets.token_hex(16)
    access_token = auth.create_token(db, user, kind="access", session_id=session_id)
    refresh_token = auth.create_token(db, user, kind="refresh", session_id=session_id)
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token, role=user.role, email=user.email)


@router.post("/logout")
@v1_router.post("/logout")
def logout(
    creds: HTTPAuthorizationCredentials = Depends(auth.bearer_scheme),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    raw_token = creds.credentials if creds and creds.credentials else None
    if raw_token:
        auth.revoke_token(db, raw_token, kind="access")
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=schemas.TokenResponse)
@v1_router.post("/refresh", response_model=schemas.TokenResponse)
def refresh(payload: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    token_row = auth.is_token_valid(db, payload.refresh_token, kind="refresh")
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = db.query(models.User).filter(models.User.id == token_row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    old_refresh = token_row
    old_refresh.revoked = True
    old_refresh.replaced_by = "rotation"
    old_refresh.updated_at = auth.utcnow()
    session_id = old_refresh.session_id or auth.secrets.token_hex(16)
    access_token = auth.create_token(db, user, kind="access", session_id=session_id)
    refresh_token = auth.create_token(db, user, kind="refresh", session_id=session_id)
    old_refresh.replaced_by = refresh_token
    db.commit()
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token, role=user.role, email=user.email)


@router.get("/me")
@v1_router.get("/me")
def me(current_user: models.User = Depends(auth.get_current_user)):
    return {"email": current_user.email, "role": current_user.role}
