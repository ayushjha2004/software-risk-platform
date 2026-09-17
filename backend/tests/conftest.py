import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

from app.database import Base, get_db
from app.main import app

from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


import uuid

@pytest.fixture(scope="function", autouse=True)
def isolated_data_dir(tmp_path, monkeypatch):
    import app.database as db
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(db, "DATA_DIR", str(data_dir))


@pytest.fixture(scope="function")
def db_session(test_engine):
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_headers(client):
    user_uid = uuid.uuid4().hex[:8]
    register_payload = {
        "email": f"analyst_{user_uid}@test.com",
        "password": "strongpassword123",
        "role": "ANALYST",
    }
    res = client.post("/auth/register", json=register_payload)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "token": token, "email": register_payload["email"]}
