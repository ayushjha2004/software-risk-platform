"""
SQLAlchemy engine and session management.

Provides a `SessionLocal` factory and a FastAPI dependency (`get_db`)
for obtaining a request-scoped database session. No business tables
are queried here in Phase 1 -- this only establishes the connectivity
foundation that later phases will build on.
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# `pool_pre_ping` guards against stale connections; `future=True` opts
# into SQLAlchemy 2.0-style behavior.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
