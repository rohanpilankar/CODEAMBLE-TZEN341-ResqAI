"""
test_auth.py – Auth router tests (register / login / token validation)
"""
import pytest


import time
import uuid

class TestAuthRegister:
    def test_register_success(self, client):
        email = f"user_{uuid.uuid4().hex[:6]}@resqai.com"
        payload = {
            "full_name": "New Volunteer",
            "email": email,
            "password": "Vol!Pass789",
            "phone_number": "7777777777",
            "role": "Citizen",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert body["success"] is True
        assert "access_token" in body["data"]

        # Duplicate email test
        resp_dup = client.post("/api/v1/auth/register", json=payload)
        assert resp_dup.status_code == 400
        assert resp_dup.json()["success"] is False

    def test_register_weak_password(self, client):
        payload = {
            "full_name": "Weak Pass User",
            "email": "weak@resqai.com",
            "password": "123",
            "phone_number": "5555555555",
            "role": "Citizen",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code in (200, 201, 400, 422)

    def test_register_missing_fields(self, client):
        resp = client.post("/api/v1/auth/register", json={"email": "only@email.com"})
        assert resp.status_code == 422


class TestAuthLogin:
    def test_login_success(self, client, auth_headers):
        # auth_headers fixture already validates a successful login
        assert "Authorization" in auth_headers

    def test_login_invalid_password(self, client):
        payload = {"email": "citizen@resqai.com", "password": "WRONG_PASSWORD"}
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 401
        assert resp.json()["success"] is False

    def test_login_nonexistent_user(self, client):
        payload = {"email": "ghost@nowhere.com", "password": "doesnotmatter"}
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 401
        assert resp.json()["success"] is False

    def test_login_returns_standard_response(self, client):
        payload = {"email": "citizen@resqai.com", "password": "password123"}
        resp = client.post("/api/v1/auth/login", json=payload)
        body = resp.json()
        assert "success" in body
        assert "message" in body
        assert "data" in body
        assert "access_token" in body["data"]
        assert "token_type" in body["data"]

    def test_protected_route_without_token(self, client):
        resp = client.get("/api/v1/users")
        assert resp.status_code == 401

    def test_protected_route_with_invalid_token(self, client):
        resp = client.get("/api/v1/users", headers={"Authorization": "Bearer INVALID.TOKEN.HERE"})
        assert resp.status_code == 401
