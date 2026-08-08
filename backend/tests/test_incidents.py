"""
test_incidents.py – Incidents router CRUD tests
"""
import pytest


SAMPLE_INCIDENT = {
    "title": "Test Flood Alert",
    "description": "Severe flooding in test district.",
    "disaster_type": "Flood",
    "severity": "HIGH",
    "address": "Test City, District 4",
    "latitude": 18.5204,
    "longitude": 73.8567,
}


class TestIncidentCRUD:
    def test_create_incident_success(self, client, auth_headers):
        resp = client.post("/api/v1/incidents", json=SAMPLE_INCIDENT, headers=auth_headers)
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["title"] == SAMPLE_INCIDENT["title"]

    def test_create_incident_unauthenticated(self, client):
        resp = client.post("/api/v1/incidents", json=SAMPLE_INCIDENT)
        assert resp.status_code == 401

    def test_list_incidents(self, client, auth_headers):
        resp = client.get("/api/v1/incidents", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert isinstance(body["data"], list)

    def test_get_incident_by_id(self, client, auth_headers):
        # Create first, then fetch
        create = client.post("/api/v1/incidents", json=SAMPLE_INCIDENT, headers=auth_headers)
        assert create.status_code in (200, 201)
        incident_id = create.json()["data"]["id"]

        resp = client.get(f"/api/v1/incidents/{incident_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == incident_id

    def test_get_incident_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/incidents/9999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_update_incident_status(self, client, admin_headers):
        create = client.post("/api/v1/incidents", json=SAMPLE_INCIDENT, headers=admin_headers)
        incident_id = create.json()["data"]["id"]
        resp = client.put(
            f"/api/v1/incidents/{incident_id}",
            json={"status": "RESOLVED"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "RESOLVED"

    def test_response_has_standard_shape(self, client, auth_headers):
        resp = client.get("/api/v1/incidents", headers=auth_headers)
        body = resp.json()
        assert all(k in body for k in ("success", "message", "data"))

    def test_filter_incidents_by_severity(self, client, auth_headers):
        resp = client.get("/api/v1/incidents?severity=HIGH", headers=auth_headers)
        assert resp.status_code == 200

    def test_pagination_incidents(self, client, auth_headers):
        resp = client.get("/api/v1/incidents?page=1&limit=5", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)

    def test_priority_queue_and_feed(self, client, auth_headers):
        pq = client.get("/api/v1/incidents/priority-queue", headers=auth_headers)
        assert pq.status_code == 200
        assert isinstance(pq.json()["data"], list)

        feed = client.get("/api/v1/incidents/feed", headers=auth_headers)
        assert feed.status_code == 200
        assert isinstance(feed.json()["data"], list)

    def test_resource_deallocation_on_resolve(self, client, admin_headers):
        # Create incident
        inc_res = client.post("/api/v1/incidents", json=SAMPLE_INCIDENT, headers=admin_headers)
        inc_id = inc_res.json()["data"]["id"]

        # Create resource
        res_res = client.post("/api/v1/resources", json={
            "name": "Deallocation Boat",
            "resource_type": "RESCUE_BOAT",
            "quantity": 1,
            "status": "AVAILABLE"
        }, headers=admin_headers)
        resource_id = res_res.json()["data"]["id"]

        # Assign resource
        assign_res = client.post("/api/v1/resources/assign", json={
            "incident_id": inc_id,
            "resource_id": resource_id
        }, headers=admin_headers)
        assert assign_res.status_code == 200

        # Check resource status is ASSIGNED
        res_check = client.get(f"/api/v1/resources/{resource_id}", headers=admin_headers)
        assert res_check.json()["data"]["status"] == "ASSIGNED"

        # Resolve incident
        resolve_res = client.put(f"/api/v1/incidents/{inc_id}", json={"status": "RESOLVED"}, headers=admin_headers)
        assert resolve_res.status_code == 200

        # Check resource status returned to AVAILABLE
        res_after = client.get(f"/api/v1/resources/{resource_id}", headers=admin_headers)
        assert res_after.json()["data"]["status"] == "AVAILABLE"
