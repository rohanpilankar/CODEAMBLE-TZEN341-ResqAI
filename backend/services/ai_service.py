from typing import Dict, Any, List
import math

class SeverityPredictor:
    """Mock AI model for predicting incident severity based on text description and disaster type."""
    def predict(self, title: str, description: str, disaster_type: str) -> Dict[str, Any]:
        text = f"{title} {description}".lower()
        
        if any(w in text for w in ["trapped", "collapse", "drowning", "casualty", "fire", "explosion", "critical"]):
            severity = "CRITICAL"
            confidence = 0.94
        elif any(w in text for w in ["flood", "rising water", "damage", "severe", "urgent"]):
            severity = "HIGH"
            confidence = 0.88
        elif any(w in text for w in ["blocked", "minor", "leak", "power outage"]):
            severity = "MEDIUM"
            confidence = 0.82
        else:
            severity = "LOW"
            confidence = 0.75
            
        return {
            "predicted_severity": severity,
            "confidence_score": confidence,
            "analysis": f"AI text processing identified high-risk terms relating to {disaster_type}."
        }

class DuplicateDetector:
    """Mock AI model for detecting duplicate incident reports in close spatial & temporal proximity."""
    def check_duplicate(self, lat: float, lng: float, existing_incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
        for inc in existing_incidents:
            dist = math.sqrt((lat - inc.get("latitude", 0))**2 + (lng - inc.get("longitude", 0))**2)
            if dist < 0.005: # Proximity threshold ~500m
                return {
                    "is_duplicate": True,
                    "matched_incident_id": inc.get("id"),
                    "similarity_score": 0.91,
                    "message": "Nearby active report found within 500m radius."
                }
        return {
            "is_duplicate": False,
            "matched_incident_id": None,
            "similarity_score": 0.12,
            "message": "Unique emergency incident verified."
        }

class ResourceRecommender:
    """Mock AI model for recommending optimal emergency equipment & rescue personnel allocation."""
    def recommend(self, severity: str, disaster_type: str) -> Dict[str, Any]:
        recommendations = []
        if severity in ["CRITICAL", "HIGH"]:
            recommendations.append({"resource_type": "AMBULANCE", "quantity": 2, "priority": "IMMEDIATE"})
            recommendations.append({"resource_type": "MEDICAL_KIT", "quantity": 5, "priority": "IMMEDIATE"})
            if "flood" in disaster_type.lower():
                recommendations.append({"resource_type": "RESCUE_BOAT", "quantity": 2, "priority": "HIGH"})
            elif "fire" in disaster_type.lower():
                recommendations.append({"resource_type": "FIRE_TRUCK", "quantity": 2, "priority": "IMMEDIATE"})
        else:
            recommendations.append({"resource_type": "VOLUNTEER", "quantity": 3, "priority": "MEDIUM"})
            recommendations.append({"resource_type": "FOOD_SUPPLY", "quantity": 10, "priority": "LOW"})

        return {
            "severity": severity,
            "disaster_type": disaster_type,
            "recommended_resources": recommendations,
            "ai_notes": "Recommendation generated based on historical disaster response protocols."
        }

class RouteOptimizer:
    """Mock AI model for calculating optimal emergency response route avoiding hazards and flooded zones."""
    def optimize(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
        mid_lat = (origin_lat + dest_lat) / 2
        mid_lng = (origin_lng + dest_lng) / 2
        
        waypoints = [
            {"lat": origin_lat, "lng": origin_lng, "step": "Dispatch Station"},
            {"lat": mid_lat + 0.002, "lng": mid_lng - 0.001, "step": "Bypass Hazard Zone Alpha"},
            {"lat": dest_lat, "lng": dest_lng, "step": "Incident Location Target"}
        ]
        
        return {
            "waypoints": waypoints,
            "estimated_time_minutes": 8.5,
            "distance_km": 4.2,
            "hazard_avoidance": True,
            "ai_status": "Optimal hazard-free route calculated."
        }

class AIService:
    """Master AI Service Interface composing specialized predictors for plug-and-play AI model integration."""
    def __init__(self):
        self.severity_predictor = SeverityPredictor()
        self.duplicate_detector = DuplicateDetector()
        self.resource_recommender = ResourceRecommender()
        self.route_optimizer = RouteOptimizer()

    def analyze_incident(self, title: str, description: str, disaster_type: str, lat: float, lng: float, existing_incidents: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        existing_incidents = existing_incidents or []
        severity_res = self.severity_predictor.predict(title, description, disaster_type)
        duplicate_res = self.duplicate_detector.check_duplicate(lat, lng, existing_incidents)
        resource_res = self.resource_recommender.recommend(severity_res["predicted_severity"], disaster_type)

        return {
            "severity_analysis": severity_res,
            "duplicate_analysis": duplicate_res,
            "resource_recommendations": resource_res,
            "timestamp": "2026-07-26T14:00:00Z"
        }

    def predict_severity(self, title: str, description: str, disaster_type: str) -> Dict[str, Any]:
        return self.severity_predictor.predict(title, description, disaster_type)

    def detect_duplicate(self, lat: float, lng: float, existing_incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
        return self.duplicate_detector.check_duplicate(lat, lng, existing_incidents)

    def recommend_resources(self, severity: str, disaster_type: str) -> Dict[str, Any]:
        return self.resource_recommender.recommend(severity, disaster_type)

    def optimize_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
        return self.route_optimizer.optimize(origin_lat, origin_lng, dest_lat, dest_lng)

ai_service = AIService()
