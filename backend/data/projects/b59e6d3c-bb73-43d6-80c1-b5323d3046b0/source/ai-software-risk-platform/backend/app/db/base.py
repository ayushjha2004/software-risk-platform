"""
Declarative base for all future SQLAlchemy ORM models.

Phase 1 intentionally defines no business tables. Future phases will
import `Base` here when declaring models (e.g. Project, Repository,
DefectPrediction) so that Alembic autogenerate can discover them.

Example (future phase):

    from app.db.base import Base

    class Project(Base):
        __tablename__ = "projects"
        ...
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base class for all ORM models."""
