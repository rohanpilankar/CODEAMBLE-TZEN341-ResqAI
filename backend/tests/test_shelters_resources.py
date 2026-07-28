"""
test_shelters.py – Shelter & Resource router tests
"""
import pytest


SAMPLE_SHELTER = {
    "name": "Test Emergency Shelter",
    "address": "Test Nagar, Pune",
    "total_capacity": 100,
    "current_occupancy": 0,
    "latitude": 18.52,
    "longitude": 73.85,
}

SAMPLE_RESOURCE = {
    "name": "Test Ambulance Unit",
    "resource_type": "AMBULANCE",
    "quantity": 5,
    "location_name": "Central HQ",
    "status": "AVAILABLE",
}


class TestShelterCRUD:
    def test_create_shelter(self, client, admin_headers):
        resp = client.post("/api/v1/shelters", json=SAMPLE_SHELTER, headers=admin_headers)
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["name"] == SAMPLE_SHELTER["name"]

    def test_list_shelters(self, client, auth_headers):
        resp = client.get("/api/v1/shelters", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)

    def test_get_shelter_by_id(self, client, admin_headers):
        create = client.post("/api/v1/shelters", json=SAMPLE_SHELTER, headers=admin_headers)
        shelter_id = create.json()["data"]["id"]
        resp = client.get(f"/api/v1/shelters/{shelter_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == shelter_id

    def test_shelter_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/shelters/999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_shelter_response_shape(self, client, auth_headers):
        resp = client.get("/api/v1/shelters", headers=auth_headers)
        body = resp.json()
        assert all(k in body for k in ("success", "message", "data"))


class TestResourceCRUD:
    def test_create_resource(self, client, admin_headers):
        resp = client.post("/api/v1/resources", json=SAMPLE_RESOURCE, headers=admin_headers)
        assert resp.status_code in (200, 201)
        assert resp.json()["success"] is True

    def test_list_resources(self, client, auth_headers):
        resp = client.get("/api/v1/resources", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)

    def test_resource_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/resources/999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_resource_availability_filter(self, client, auth_headers):
        resp = client.get("/api/v1/resources?status=AVAILABLE", headers=auth_headers)
        assert resp.status_code == 200
