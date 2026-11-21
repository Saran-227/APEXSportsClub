"""Tests for application startup, lifespan, and root endpoints."""
from fastapi.testclient import TestClient

from backend.app import __version__
from backend.app.main import app


def test_app_startup_and_lifespan():
    """Verify application initializes without lifecycle errors."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        assert data["version"] == __version__
        assert data["health"] == "/api/v1/health"


def test_openapi_schema_available():
    """Verify OpenAPI documentation endpoint responds when enabled."""
    with TestClient(app) as client:
        response = client.get("/api/v1/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "paths" in data
        assert "/api/v1/health" in data["paths"]
