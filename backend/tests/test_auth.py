import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@resqai.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "Admin"

def test_login_invalid_credentials():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@resqai.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_register_new_user():
    import uuid
    unique_email = f"test_{uuid.uuid4().hex[:8]}@resqai.com"
    response = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "test1234",
        "full_name": "Test User",
        "phone_number": "+91-9999999999",
        "role": "Citizen"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
