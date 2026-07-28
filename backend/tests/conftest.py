"""
conftest.py – ResQAI pytest configuration
Uses FastAPI TestClient + in-memory mock Firestore (no real Firebase needed).
"""
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Ensure tests always use mock Firestore (no credentials required)
os.environ.setdefault("FIREBASE_CREDENTIALS", "")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-resqai-tests")
os.environ.setdefault("ENVIRONMENT", "test")

from backend.main import app


@pytest.fixture(scope="session")
def client():
    """Shared TestClient for the FastAPI application."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(client):
    """Login pre-seeded citizen user and return auth headers."""
    login_payload = {"email": "citizen@resqai.com", "password": "password123"}
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200, f"Login failed: {response.json()}"
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    """Login pre-seeded admin user and return auth headers."""
    login_payload = {"email": "admin@resqai.com", "password": "password123"}
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
