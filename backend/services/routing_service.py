"""
RoutingService Manager
Orchestrates routing operations by utilizing a RoutingProvider (OSRMProvider)
and SafetyScoringService with TTL caching (capacity: 1000, 10-minute expiration).
"""

from typing import Dict, Any, List, Optional, Tuple
import time
from backend.services.routing_provider import RoutingProvider, OSRMProvider
from backend.services.safety_scoring_service import safety_scoring_service, SafetyScoringService
from backend.utils.logger import app_logger

class TTLCacheItem:
    def __init__(self, value: Any, ttl_seconds: int = 600):
        self.value = value
        self.expires_at = time.time() + ttl_seconds

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class RoutingService:
    def __init__(
        self,
        provider: Optional[RoutingProvider] = None,
        scoring_service: Optional[SafetyScoringService] = None,
        max_cache_size: int = 1000,
        ttl_seconds: int = 600
    ):
        self.provider = provider or OSRMProvider()
        self.scoring_service = scoring_service or safety_scoring_service
        self.cache: Dict[str, TTLCacheItem] = {}
        self.max_cache_size = max_cache_size
        self.ttl_seconds = ttl_seconds

    def _make_cache_key(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        profile: str,
        route_mode: str
    ) -> str:
        # Round coordinates to 4 decimal places (~11 meters precision) for caching
        return f"{start_lat:.4f},{start_lng:.4f};{end_lat:.4f},{end_lng:.4f};{profile};{route_mode}"

    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        item = self.cache.get(key)
        if item:
            if item.is_expired():
                del self.cache[key]
                return None
            return item.value
        return None

    def _set_in_cache(self, key: str, value: Dict[str, Any]):
        if len(self.cache) >= self.max_cache_size:
            # Purge expired items first
            expired_keys = [k for k, v in self.cache.items() if v.is_expired()]
            for k in expired_keys:
                del self.cache[k]
            # If still full, remove oldest key
            if len(self.cache) >= self.max_cache_size:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]

        self.cache[key] = TTLCacheItem(value, self.ttl_seconds)

    async def compute_route(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        profile: str = "driving",
        route_mode: str = "fastest",
        incidents: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Validates inputs, queries the RoutingProvider (with caching), scores the route safety,
        and returns a standardized response payload.
        """
        # Coordinate Bounds Validation
        if not (-90.0 <= start_lat <= 90.0) or not (-180.0 <= start_lng <= 180.0):
            raise ValueError(f"Invalid start coordinates: ({start_lat}, {start_lng})")
        if not (-90.0 <= end_lat <= 90.0) or not (-180.0 <= end_lng <= 180.0):
            raise ValueError(f"Invalid destination coordinates: ({end_lat}, {end_lng})")

        # Identical point check
        if round(start_lat, 5) == round(end_lat, 5) and round(start_lng, 5) == round(end_lng, 5):
            raise ValueError("Start and destination coordinates cannot be identical.")

        cache_key = self._make_cache_key(start_lat, start_lng, end_lat, end_lng, profile, route_mode)
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            app_logger.info(f"[RoutingService] Cache HIT for key: {cache_key}")
            cached_copy = dict(cached_result)
            cached_copy["cached"] = True
            return cached_copy

        # Call RoutingProvider
        raw_route = await self.provider.get_route(
            origin=(start_lat, start_lng),
            destination=(end_lat, end_lng),
            profile=profile,
            alternatives=True
        )

        coordinates = raw_route.get("geometry", {}).get("coordinates", [])

        # Evaluate safety score using SafetyScoringService
        safety_meta = self.scoring_service.evaluate_route_safety(
            coordinates=coordinates,
            incidents=incidents,
            route_mode=route_mode
        )

        # Process alternative routes with safety scores
        alt_routes = []
        for alt in raw_route.get("alternatives", []):
            alt_coords = alt.get("geometry", {}).get("coordinates", [])
            alt_safety = self.scoring_service.evaluate_route_safety(
                coordinates=alt_coords,
                incidents=incidents,
                route_mode=route_mode
            )
            alt_routes.append({
                "distance_meters": alt["distance_meters"],
                "distance_km": alt["distance_km"],
                "duration_seconds": alt["duration_seconds"],
                "duration_minutes": alt["duration_minutes"],
                "geometry": alt["geometry"],
                "safety_score": alt_safety["safety_score"],
                "risk_level": alt_safety["risk_level"]
            })

        response_payload = {
            "distance_meters": raw_route["distance_meters"],
            "distance_km": raw_route["distance_km"],
            "duration_seconds": raw_route["duration_seconds"],
            "duration_minutes": raw_route["duration_minutes"],
            "profile": profile,
            "route_mode": route_mode,
            "safety_score": safety_meta["safety_score"],
            "risk_level": safety_meta["risk_level"],
            "hazard_warnings": safety_meta["hazard_warnings"],
            "is_safe": safety_meta["is_safe"],
            "geometry": raw_route["geometry"],
            "steps": raw_route["steps"],
            "alternative_routes": alt_routes,
            "cached": False
        }

        self._set_in_cache(cache_key, response_payload)
        return response_payload


routing_service = RoutingService()
