import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_full_disaster_response_lifecycle():
    # 1. Citizen registers and logs in
    citizen_payload = {
        "email": "e2e_citizen@resqai.org",
        "password": "Password123!",
        "full_name": "E2E Citizen Tester",
        "phone_number": "+919876543210",
        "role": "Citizen"
    }
    reg_res = client.post("/api/v1/auth/register", json=citizen_payload)
    if reg_res.status_code == 200:
        citizen_token = reg_res.json()["data"]["access_token"]
    else:
        login_res = client.post("/api/v1/auth/login", json={"email": citizen_payload["email"], "password": citizen_payload["password"]})
        assert login_res.status_code == 200
        citizen_token = login_res.json()["data"]["access_token"]

    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    # Admin / Government login using preseeded credentials
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@resqai.com", "password": "password123"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Citizen reports incident
    inc_payload = {
        "title": "E2E Emergency Flood in Sector 9",
        "description": "Rising water levels trapped 4 people in basement.",
        "disaster_type": "Flood",
        "address": "Sector 9, Central Ave",
        "latitude": 19.0760,
        "longitude": 72.8777
    }
    inc_res = client.post("/api/v1/incidents/", json=inc_payload, headers=citizen_headers)
    assert inc_res.status_code in (200, 201)
    inc_data = inc_res.json()["data"]
    incident_id = inc_data["id"]
    assert incident_id is not None

    # 3. Government Verification (Update status & severity)
    verify_res = client.put(f"/api/v1/incidents/{incident_id}", json={
        "status": "IN_PROGRESS",
        "severity": "CRITICAL"
    }, headers=admin_headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["status"] == "IN_PROGRESS"

    # 4. Resource Allocation
    assign_res = client.post("/api/v1/resources/assign", json={
        "incident_id": incident_id,
        "resource_id": 1
    }, headers=admin_headers)
    assert assign_res.status_code == 200

    # 5. Rescue Team Mission Update & Victim Casualty Report
    victim_res = client.post("/api/v1/citizen/victim-report", json={
        "incident_id": incident_id,
        "victim_count": 4,
        "medical_condition": "Minor / Stable (Green)",
        "notes": "All 4 victims safely evacuated to high ground."
    })
    assert victim_res.status_code == 200
    assert victim_res.json()["success"] is True

    # 6. Mission Completion (Mark Resolved)
    resolve_res = client.put(f"/api/v1/incidents/{incident_id}", json={
        "status": "RESOLVED"
    }, headers=admin_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["data"]["status"] == "RESOLVED"

    # 7. Summary & Audit Report
    summary_res = client.get("/api/v1/reports/export/summary")
    assert summary_res.status_code == 200
    assert summary_res.json()["data"]["total_incidents"] > 0
