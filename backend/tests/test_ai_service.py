import pytest
from backend.services.ai_service import AIService

ai = AIService()

def test_predict_severity_critical():
    result = ai.predict_severity("Building Collapse", "People trapped under rubble, casualties reported", "Earthquake")
    assert result["predicted_severity"] in {"MEDIUM", "HIGH", "CRITICAL"}
    assert result["confidence_score"] >= 0.9

def test_predict_severity_low():
    result = ai.predict_severity("Road Pothole", "Small pothole reported near junction", "Other")
    assert result["predicted_severity"] == "LOW"

def test_detect_no_duplicate():
    result = ai.detect_duplicate(19.0760, 72.8777, [])
    assert result["is_duplicate"] == False

def test_detect_duplicate_found():
    existing = [{"id": 42, "latitude": 19.0761, "longitude": 72.8778}]
    result = ai.detect_duplicate(19.0760, 72.8777, existing)
    assert result["is_duplicate"] == True
    assert result["matched_incident_id"] == 42

def test_recommend_resources_critical():
    result = ai.recommend_resources("CRITICAL", "Flood")
    recs = result["recommended_resources"]
    types = [r["resource_type"] for r in recs]
    assert "AMBULANCE" in types
    assert "RESCUE_BOAT" in types

def test_optimize_route():
    result = ai.optimize_route(19.0760, 72.8777, 19.0450, 72.8545)
    assert "waypoints" in result
    assert result["estimated_time_minutes"] > 0
    assert result["distance_km"] > 0
