"""
Unit and Integration Tests for Routing Service & Endpoints
"""
import pytest
from unittest.mock import AsyncMock, patch
from backend.services.routing_provider import RoutingProvider, OSRMProvider
from backend.services.safety_scoring_service import SafetyScoringService
from backend.services.routing_service import RoutingService


class DummyProvider(RoutingProvider):
    async def get_route(self, origin, destination, profile="driving", alternatives=True):
        return {
            "distance_meters": 5200,
            "distance_km": 5.2,
            "duration_seconds": 840,
            "duration_minutes": 14,
            "geometry": {
                "type": "LineString",
                "coordinates": [[72.8777, 19.0760], [72.8800, 19.0800]]
            },
            "steps": [
                {
                    "instruction": "Head north on Main St",
                    "distance": 500,
                    "duration": 60,
                    "name": "Main St",
                    "modifier": "straight",
                    "type": "depart",
                    "location": [72.8777, 19.0760]
                }
            ],
            "alternatives": []
        }


@pytest.mark.asyncio
async def test_routing_service_compute_route_success():
    service = RoutingService(provider=DummyProvider())
    res = await service.compute_route(19.0760, 72.8777, 19.0800, 72.8800)

    assert res["distance_meters"] == 5200
    assert res["distance_km"] == 5.2
    assert res["duration_minutes"] == 14
    assert "safety_score" in res
    assert "risk_level" in res
    assert res["cached"] is False


@pytest.mark.asyncio
async def test_routing_service_ttl_caching():
    service = RoutingService(provider=DummyProvider())
    # First call - cache miss
    res1 = await service.compute_route(19.0760, 72.8777, 19.0800, 72.8800)
    assert res1["cached"] is False

    # Second call - cache hit
    res2 = await service.compute_route(19.0760, 72.8777, 19.0800, 72.8800)
    assert res2["cached"] is True


@pytest.mark.asyncio
async def test_routing_service_identical_coordinates_raises():
    service = RoutingService(provider=DummyProvider())
    with pytest.raises(ValueError, match="cannot be identical"):
        await service.compute_route(19.0760, 72.8777, 19.0760, 72.8777)


@pytest.mark.asyncio
async def test_routing_service_invalid_bounds_raises():
    service = RoutingService(provider=DummyProvider())
    with pytest.raises(ValueError, match="Invalid start coordinates"):
        await service.compute_route(195.0, 72.8777, 19.0800, 72.8800)


def test_safety_scoring_service_evaluation():
    scoring = SafetyScoringService()
    coords = [[72.8777, 19.0760], [72.8680, 19.0820]]
    meta = scoring.evaluate_route_safety(coords)

    assert "safety_score" in meta
    assert meta["safety_score"] <= 100
    assert meta["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]


class TestRoutingEndpoint:
    def test_get_route_endpoint(self, client):
        resp = client.get("/api/v1/route?startLat=19.0760&startLng=72.8777&endLat=19.0800&endLng=72.8800")
        assert resp.status_code in [200, 503]  # 503 if live OSRM is unreachable, 200 if online
        if resp.status_code == 200:
            body = resp.json()
            assert body["success"] is True
            assert "geometry" in body["data"]

    def test_get_route_identical_coords_error(self, client):
        resp = client.get("/api/v1/route?startLat=19.0760&startLng=72.8777&endLat=19.0760&endLng=72.8777")
        assert resp.status_code == 400
        body = resp.json()
        assert body["success"] is False
