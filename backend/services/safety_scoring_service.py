"""
SafetyScoringService (AI-Ready)
Evaluates disaster intelligence modules (verified incidents, flood/fire/landslide danger zones,
road closures, weather alerts) to calculate safety scores and risk levels for navigation routes.
Designed so future AI/ML models can inject safety scores without modifying core routing logic.
"""

from typing import Dict, Any, List, Tuple, Optional
import math
from backend.utils.logger import app_logger

class SafetyScoringService:
    def __init__(self):
        # Sample hazard zones & road closures in memory (can be hydrated from DB/Firestore)
        self.active_hazard_zones = [
            {
                "id": "hz_flood_1",
                "type": "FLOOD",
                "center": (19.0760, 72.8777),
                "radius_km": 1.5,
                "severity_weight": 0.8
            },
            {
                "id": "hz_fire_1",
                "type": "FIRE",
                "center": (19.0820, 72.8680),
                "radius_km": 0.8,
                "severity_weight": 0.9
            }
        ]
        self.road_closures = [
            {
                "road_name": "Dharavi Link Road",
                "latitude": 19.0710,
                "longitude": 72.8700,
                "closure_reason": "High Water Level / Surge",
                "severity": "CRITICAL"
            }
        ]

    def evaluate_route_safety(
        self,
        coordinates: List[Tuple[float, float]],
        incidents: Optional[List[Dict[str, Any]]] = None,
        route_mode: str = "fastest"
    ) -> Dict[str, Any]:
        """
        Calculates a safety score (0 to 100) and risk level (LOW, MODERATE, HIGH, CRITICAL)
        for a given array of GeoJSON coordinates [[lng, lat], ...].
        """
        if not coordinates:
            return {
                "safety_score": 100,
                "risk_level": "LOW",
                "hazard_warnings": [],
                "route_mode": route_mode,
                "is_safe": True
            }

        total_penalty = 0.0
        warnings = []

        # Check coordinates against active hazard zones
        for coord in coordinates[::max(1, len(coordinates) // 20)]:  # sample points for efficiency
            lng, lat = coord[0], coord[1]

            for hazard in self.active_hazard_zones:
                h_lat, h_lng = hazard["center"]
                dist = self._haversine_km(lat, lng, h_lat, h_lng)
                if dist <= hazard["radius_km"]:
                    penalty = hazard["severity_weight"] * 25
                    total_penalty += penalty
                    warn_msg = f"Route passes through active {hazard['type']} hazard zone ({dist:.1f}km)"
                    if warn_msg not in warnings:
                        warnings.append(warn_msg)

            for closure in self.road_closures:
                c_lat, c_lng = closure["latitude"], closure["longitude"]
                dist = self._haversine_km(lat, lng, c_lat, c_lng)
                if dist <= 0.3:  # 300 meters proximity
                    total_penalty += 35
                    warn_msg = f"Route passes near reported road closure: {closure['road_name']} ({closure['closure_reason']})"
                    if warn_msg not in warnings:
                        warnings.append(warn_msg)

        if incidents:
            for inc in incidents:
                i_lat = inc.get("latitude")
                i_lng = inc.get("longitude")
                if i_lat is None or i_lng is None:
                    continue
                severity = inc.get("severity", "LOW")
                for coord in coordinates[::max(1, len(coordinates) // 15)]:
                    lng, lat = coord[0], coord[1]
                    dist = self._haversine_km(lat, lng, i_lat, i_lng)
                    if dist <= 0.5:
                        weight = 30 if severity == "CRITICAL" else 15 if severity == "HIGH" else 5
                        total_penalty += weight
                        warn_msg = f"Route passes near {severity} incident: {inc.get('title', 'Unspecified Incident')}"
                        if warn_msg not in warnings:
                            warnings.append(warn_msg)

        score = max(0, min(100, round(100 - total_penalty)))

        if score >= 85:
            risk_level = "LOW"
        elif score >= 65:
            risk_level = "MODERATE"
        elif score >= 40:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        return {
            "safety_score": score,
            "risk_level": risk_level,
            "hazard_warnings": warnings[:5],
            "route_mode": route_mode,
            "is_safe": score >= 50
        }

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2.0) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c


safety_scoring_service = SafetyScoringService()
