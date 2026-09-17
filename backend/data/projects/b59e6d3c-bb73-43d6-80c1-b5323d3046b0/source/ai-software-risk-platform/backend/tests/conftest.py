"""Shared Pytest fixtures for the backend test suite."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    """Return a FastAPI TestClient bound to the application instance."""
    return TestClient(app)
