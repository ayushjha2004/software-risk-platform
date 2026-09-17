"""Tests for the API root endpoint."""

from fastapi.testclient import TestClient


def test_root_returns_200(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200


def test_root_returns_expected_payload(client: TestClient) -> None:
    response = client.get("/")
    data = response.json()

    assert data["status"] == "running"
    assert isinstance(data["message"], str) and data["message"]
