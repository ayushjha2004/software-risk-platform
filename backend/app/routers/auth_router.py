from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
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

    token = auth.create_token(db, user)
    return schemas.TokenResponse(access_token=token, role=user.role, email=user.email)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.salt, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = auth.create_token(db, user)
    return schemas.TokenResponse(access_token=token, role=user.role, email=user.email)


@router.get("/me")
def me(current_user: models.User = Depends(auth.get_current_user)):
    return {"email": current_user.email, "role": current_user.role}
