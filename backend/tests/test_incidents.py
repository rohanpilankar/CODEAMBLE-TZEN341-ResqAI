import pytest
from fastapi.testclient import TestClient
from backend.main import app

# Module-level client so all tests share the same session/DB state
client = TestClient(app, raise_server_exceptions=True)

def _login(email="citizen@resqai.com", password="password123"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.json()}"
    return r.json()["access_token"]

def test_get_incidents_public():
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_incident_unauthenticated():
    response = client.post("/api/v1/incidents", json={
        "title": "Unauthenticated Test",
        "description": "Should fail.",
        "disaster_type": "Fire",
        "latitude": 19.0,
        "longitude": 72.8
    })
    assert response.status_code == 401

def test_create_incident_authenticated():
    token = _login("citizen@resqai.com", "password123")
    response = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Test Flood Report",
            "description": "Flooding observed in test area.",
            "disaster_type": "Flood",
            "severity": "HIGH",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "address": "Test Area, Mumbai"
        }
    )
    assert response.status_code == 200, f"Got: {response.status_code} {response.json()}"
    data = response.json()
    assert data["title"] == "Test Flood Report"
    assert "severity" in data
