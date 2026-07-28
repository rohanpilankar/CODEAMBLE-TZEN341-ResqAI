"""
test_health.py – Health check & API meta tests
"""
import pytest


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_response_shape(self, client):
        resp = client.get("/api/health")
        body = resp.json()
        assert body["success"] is True
        assert body["status"] == "healthy"
        assert "version" in body
        assert "timestamp" in body

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_api_docs_accessible(self, client):
        resp = client.get("/api/docs")
        assert resp.status_code == 200


class TestGlobalErrorHandlers:
    def test_404_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/incidents/999999")
        assert resp.status_code == 404

    def test_validation_error_returns_standard_shape(self, client):
        resp = client.post("/api/v1/auth/login", json={"invalid_field": "bad"})
        assert resp.status_code == 422
        body = resp.json()
        assert body["success"] is False
        assert "errors" in body["data"]
