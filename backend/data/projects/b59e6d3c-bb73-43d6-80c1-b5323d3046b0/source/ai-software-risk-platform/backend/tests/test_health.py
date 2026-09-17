"""Tests for the /api/v1/health endpoint."""

from fastapi.testclient import TestClient


def test_health_check_returns_200(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_check_returns_expected_payload(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "backend"
    assert isinstance(data["version"], str) and data["version"]


def test_health_check_matches_schema_keys(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    data = response.json()

    assert set(data.keys()) == {"status", "service", "version"}
