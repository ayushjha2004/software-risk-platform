"""Database setup and lightweight schema migration helpers."""
import os
from sqlalchemy import inspect, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "risk_platform.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema():
    """Add missing auth lifecycle columns for SQLite without dropping existing data."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if not inspector.has_table("tokens"):
        return
    columns = {column["name"] for column in inspector.get_columns("tokens")}
    with engine.begin() as conn:
        for name, ddl in {
            "token_hash": "VARCHAR",
            "expires_at": "DATETIME",
            "revoked": "BOOLEAN DEFAULT 0",
            "session_id": "VARCHAR",
            "replaced_by": "VARCHAR",
            "kind": "VARCHAR DEFAULT 'access'",
            "updated_at": "DATETIME",
            "last_used_at": "DATETIME",
        }.items():
            if name not in columns:
                conn.execute(text(f"ALTER TABLE tokens ADD COLUMN {name} {ddl}"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
