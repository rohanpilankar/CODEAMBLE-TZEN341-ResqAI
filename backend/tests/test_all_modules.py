import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_fleet_vehicles():
    res = client.get("/api/v1/fleet/vehicles")
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert len(res.json()["data"]) > 0

def test_logistics_warehouses():
    res = client.get("/api/v1/logistics/warehouses")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_medical_hospitals():
    res = client.get("/api/v1/medical/hospitals")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_reports_summary():
    res = client.get("/api/v1/reports/export/summary")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_comms_broadcast():
    res = client.post("/api/v1/comms/broadcast", json={
        "title": "Test Alert",
        "message": "Heavy rainfall warning in effect",
        "target_role": "ALL",
        "channel": "BROADCAST"
    })
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_volunteers_list():
    res = client.get("/api/v1/volunteers")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_ngo_list():
    res = client.get("/api/v1/ngo/list")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_audit_logs():
    res = client.get("/api/v1/audit/logs")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_citizen_family_check():
    res = client.get("/api/v1/citizen/family-check")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_blockchain_donations():
    res = client.get("/api/v1/blockchain/donations")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_voice_triage():
    res = client.post("/api/v1/ai/process-voice-triage", json={
        "transcript": "Flash flood building up rapidly in Dharavi area",
        "latitude": 19.0450,
        "longitude": 72.8545
    })
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_user_location_endpoints(auth_headers):
    # Test POST location update
    post_res = client.post("/api/v1/users/location", json={
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_name": "Mumbai Sector 4 Rescue Unit",
        "address": "Sector 4 Main HQ"
    }, headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True
    assert post_res.json()["data"]["location_name"] == "Mumbai Sector 4 Rescue Unit"

    # Test GET location retrieval
    get_res = client.get("/api/v1/users/location", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["success"] is True
    assert get_res.json()["data"]["latitude"] == 19.0760

def test_user_preferences_endpoints(auth_headers):
    # Test POST preference update
    post_res = client.post("/api/v1/users/preferences", json={"theme": "light"}, headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True
    assert post_res.json()["data"]["theme"] == "light"

    # Test GET preference retrieval
    get_res = client.get("/api/v1/users/preferences", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["success"] is True
    assert get_res.json()["data"]["theme"] == "light"


