"""
RoutingProvider Interface & OSRM Concrete Implementation
Follows Provider Pattern to allow swapping routing engines (OSRM, GraphHopper, Valhalla)
without changing application or frontend code.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
import httpx
from backend.utils.logger import app_logger

class RoutingProvider(ABC):
    """Abstract Base Class for Routing Engines."""

    @abstractmethod
    async def get_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "driving",
        alternatives: bool = True
    ) -> Dict[str, Any]:
        """
        Computes route geometry, distance, duration, and steps between origin and destination.
        origin: (lat, lng)
        destination: (lat, lng)
        """
        pass


class OSRMProvider(RoutingProvider):
    """OSRM Routing Engine Provider Implementation."""

    def __init__(self, base_url: str = "https://router.project-osrm.org"):
        self.base_url = base_url.rstrip("/")
        self.timeout = 8.0

    async def get_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "driving",
        alternatives: bool = True
    ) -> Dict[str, Any]:
        start_lat, start_lng = origin
        end_lat, end_lng = destination

        app_logger.info(f"[OSRMProvider] Incoming route request: origin=({start_lat}, {start_lng}), destination=({end_lat}, {end_lng}), profile={profile}")

        # OSRM expects coordinates in format: {start_lng},{start_lat};{end_lng},{end_lat}
        coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"
        
        # Profile mapping (OSRM default is driving)
        osrm_profile = "driving"
        if profile in ["walking", "foot"]:
            osrm_profile = "foot"
        elif profile in ["cycling", "bike"]:
            osrm_profile = "bike"

        alt_param = "true" if alternatives else "false"
        url = f"{self.base_url}/route/v1/{osrm_profile}/{coords}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives={alt_param}"

        app_logger.info(f"[OSRMProvider] Querying OSRM Server URL: {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                app_logger.info(f"[OSRMProvider] Received OSRM HTTP {response.status_code}")

                if response.status_code != 200:
                    app_logger.error(f"[OSRMProvider] HTTP error {response.status_code}: {response.text}")
                    raise RuntimeError(f"OSRM service returned HTTP {response.status_code}")

                data = response.json()
                if data.get("code") != "Ok" or not data.get("routes"):
                    app_logger.warning(f"[OSRMProvider] No route found or code not Ok: {data.get('code')}")
                    raise ValueError("Unable to calculate road route. No drivable road found.")

                routes = data["routes"]
                primary = routes[0]
                geometry = primary.get("geometry", {})
                coordinates = geometry.get("coordinates", [])

                app_logger.info(f"[OSRMProvider] OSRM primary route extracted. Total road coordinates: {len(coordinates)}")

                if len(coordinates) <= 2:
                    app_logger.warning(f"[OSRMProvider] Insufficient road coordinates returned ({len(coordinates)} points). Rejecting direct line.")
                    raise ValueError("Unable to calculate road route. Insufficient road geometry returned by routing engine.")

                alt_routes = []
                if len(routes) > 1:
                    for alt in routes[1:]:
                        alt_routes.append({
                            "distance_meters": round(alt.get("distance", 0)),
                            "distance_km": round(alt.get("distance", 0) / 1000.0, 2),
                            "duration_seconds": round(alt.get("duration", 0)),
                            "duration_minutes": max(1, round(alt.get("duration", 0) / 60.0)),
                            "geometry": alt.get("geometry", {}),
                        })

                steps_list = []
                legs = primary.get("legs", [])
                if legs:
                    for step in legs[0].get("steps", []):
                        maneuver = step.get("maneuver", {})
                        instruction = maneuver.get("instruction") or f"Proceed on {step.get('name') or 'road'}"
                        steps_list.append({
                            "instruction": instruction,
                            "distance": round(step.get("distance", 0)),
                            "duration": round(step.get("duration", 0)),
                            "name": step.get("name") or "Emergency Road",
                            "modifier": maneuver.get("modifier", "straight"),
                            "type": maneuver.get("type", "turn"),
                            "location": maneuver.get("location", [])
                        })

                distance_meters = primary.get("distance", 0.0)
                duration_seconds = primary.get("duration", 0.0)

                return {
                    "distance_meters": round(distance_meters),
                    "distance_km": round(distance_meters / 1000.0, 2),
                    "duration_seconds": round(duration_seconds),
                    "duration_minutes": max(1, round(duration_seconds / 60.0)),
                    "geometry": geometry,
                    "steps": steps_list,
                    "alternatives": alt_routes
                }

        except httpx.RequestError as exc:
            app_logger.error(f"[OSRMProvider] Network request failure: {exc}")
            raise ConnectionError(f"Unable to reach OSRM routing server: {str(exc)}")
