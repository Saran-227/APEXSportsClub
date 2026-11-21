"""Tests for GET /api/v1/health probe endpoint."""
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app import __version__


def test_health_endpoint_healthy(client: TestClient):
    """Verify health endpoint returns 200 and healthy status when DB is available."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == __version__
    assert "timestamp" in data

    # Security check: ensure no internal host, port, credentials or database names are exposed
    json_str = response.text.lower()
    assert "password" not in json_str
    assert "scms_user" not in json_str
    assert "postgresql" not in json_str
    assert "sqlite" not in json_str


def test_health_endpoint_degraded(client: TestClient):
    """Verify health endpoint returns 503 and degraded status when DB is down."""
    with patch("backend.app.main.check_db_health", return_value=False):
        response = client.get("/api/v1/health")
        assert response.status_code == 503

        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "disconnected"
        assert data["version"] == __version__
        assert "timestamp" in data

        # Security check: ensure no raw exception message or trace leaked
        assert "traceback" not in response.text.lower()
        assert "exception" not in response.text.lower()
