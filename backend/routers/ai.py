from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from backend.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Services"])

class AnalyzeIncidentRequest(BaseModel):
    title: str
    description: str
    disaster_type: str
    latitude: float
    longitude: float

class SeverityRequest(BaseModel):
    title: str
    description: str
    disaster_type: str

class DuplicateRequest(BaseModel):
    latitude: float
    longitude: float

class ResourceRecommendRequest(BaseModel):
    severity: str
    disaster_type: str

class RouteOptimizeRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float

@router.post("/analyze-incident")
def analyze_incident(req: AnalyzeIncidentRequest):
    """Full AI analysis: severity + duplicate check + resource recommendation."""
    return ai_service.analyze_incident(
        title=req.title,
        description=req.description,
        disaster_type=req.disaster_type,
        lat=req.latitude,
        lng=req.longitude
    )

@router.post("/predict-severity")
def predict_severity(req: SeverityRequest):
    """Predict incident severity level using AI text analysis."""
    return ai_service.predict_severity(req.title, req.description, req.disaster_type)

@router.post("/detect-duplicate")
def detect_duplicate(req: DuplicateRequest):
    """Check if a nearby active incident already exists."""
    return ai_service.detect_duplicate(req.latitude, req.longitude, [])

@router.post("/recommend-resources")
def recommend_resources(req: ResourceRecommendRequest):
    """AI-powered recommendation of emergency resources based on severity and type."""
    return ai_service.recommend_resources(req.severity, req.disaster_type)

@router.post("/optimize-route")
def optimize_route(req: RouteOptimizeRequest):
    """Calculate optimal emergency response route avoiding hazard zones."""
    return ai_service.optimize_route(req.origin_lat, req.origin_lng, req.dest_lat, req.dest_lng)
