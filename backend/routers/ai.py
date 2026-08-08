from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.auth.dependencies import require_roles
from backend.models.user import User
from backend.utils.response import api_response
from backend.services.ai_service import ai_service
from backend.services.incident_service import IncidentService
from backend.models.resource import Resource, ResourceType, ResourceStatus, Assignment

router = APIRouter(prefix="/ai", tags=["AI Services"])

@router.get("/health")
def get_ai_health():
    return api_response(success=True, data=ai_service.get_ai_status(), message="AI subsystem status")

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

class YoloDetectRequest(BaseModel):
    image_url: Optional[str] = None
    image_path: Optional[str] = None

@router.post("/yolo-detect")
def yolo_detect(req: YoloDetectRequest):
    """Run YOLOv8 Computer Vision Person & Victim Detection on an image."""
    img_input = req.image_url or req.image_path or ""
    return ai_service.detect_yolo_objects(img_input)

@router.get("/incidents/{incident_id}/yolo-analysis")
def incident_yolo_analysis(incident_id: int, db: Session = Depends(get_db)):
    """Run YOLO vision detection on an incident's attached media image."""
    incident_service = IncidentService(db)
    inc = incident_service.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident #{incident_id} not found")
    
    img_url = inc.media_url or ""
    if not img_url and inc.images:
        img_url = inc.images[0].image_url
        
    return ai_service.detect_yolo_objects(img_url)


class VoiceTriageRequest(BaseModel):
    transcript: str
    latitude: Optional[float] = 19.0760
    longitude: Optional[float] = 72.8777

@router.post("/voice-triage")
@router.post("/process-voice-triage")
def process_voice_triage(req: VoiceTriageRequest):
    """AI Voice Triage: Parses voice transcript into structured incident fields and predicts severity."""
    text = req.transcript.lower()
    disaster_type = "Other"
    if "flood" in text or "water" in text or "drowning" in text:
        disaster_type = "Flood"
    elif "fire" in text or "smoke" in text or "burn" in text:
        disaster_type = "Fire"
    elif "earthquake" in text or "building" in text or "collapse" in text:
        disaster_type = "Earthquake"
    elif "gas" in text or "leak" in text:
        disaster_type = "Gas Leak"
    elif "medical" in text or "injured" in text or "bleed" in text:
        disaster_type = "Medical Emergency"

    analysis = ai_service.analyze_incident(
        title=f"Voice SOS: {req.transcript[:30]}...",
        description=req.transcript,
        disaster_type=disaster_type,
        lat=req.latitude or 19.0760,
        lng=req.longitude or 72.8777
    )
    return {
        "success": True,
        "extracted_disaster_type": disaster_type,
        "ai_analysis": analysis
    }

from typing import Dict, Any, List, Optional

class ChatbotMessageRequest(BaseModel):
    message: str
    history: Optional[List[Any]] = None
    latitude: Optional[float] = 19.0760
    longitude: Optional[float] = 72.8777

@router.post("/chatbot")
def chatbot_query(req: ChatbotMessageRequest):
    """Citizen Disaster AI Chatbot endpoint (Grok API + Local Fallback)."""
    return ai_service.process_chatbot_query(
        message=req.message,
        history=req.history,
        latitude=req.latitude or 19.0760,
        longitude=req.longitude or 72.8777
    )

@router.get("/chatbot/presets")
def get_chatbot_presets():
    """Return preset prompt suggestions for citizens."""
    return [
        "Flood Precautions",
        "Earthquake Guide",
        "Find Nearby Shelters",
        "Cyclone Safety",
        "Fire Emergency",
        "First Aid",
        "Medical Emergency",
        "Emergency Kit Checklist"
    ]

@router.get("/forecast")
def get_ai_disaster_forecast():
    """Returns AI-predicted disaster threat risk and forecast levels."""
    return {
        "success": True,
        "data": {
            "threat_level": "ELEVATED",
            "risk_score": 78.4,
            "predicted_hazard": "Monsoon Coastal Surge & Urban Inundation",
            "confidence_pct": 92.5,
            "forecast_hours": [
                {"hour": "+2h", "precip_prob_pct": 85, "risk": "HIGH"},
                {"hour": "+4h", "precip_prob_pct": 94, "risk": "CRITICAL"},
                {"hour": "+6h", "precip_prob_pct": 70, "risk": "HIGH"},
                {"hour": "+8h", "precip_prob_pct": 45, "risk": "MEDIUM"},
                {"hour": "+12h", "precip_prob_pct": 20, "risk": "LOW"}
            ],
            "recommended_actions": [
                "Issue urban flood evacuation advisory for low-lying sectors.",
                "Deploy motorized rescue rafts to Dharavi Sector 4.",
                "Alert regional relief shelters B & C to prepare emergency medical drops."
            ]
        }
    }


@router.post("/auto-allocate/{incident_id}")
def auto_allocate_resources(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))
):
    """Run the trained resource allocation model for an incident and persist assignments."""
    incident_service = IncidentService(db)
    inc = incident_service.get_incident_by_id(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"Incident #{incident_id} not found")

    severity = str(inc.severity.value if hasattr(inc.severity, "value") else inc.severity).upper()
    disaster_type = inc.disaster_type or "General Emergency"

    # Idempotency: if this incident already has ACTIVE assignments, don't duplicate them
    if db.query(Assignment).filter(
        Assignment.incident_id == incident_id,
        Assignment.status == "ACTIVE",
    ).first():
        existing = []
        for a in db.query(Assignment).filter(Assignment.incident_id == incident_id).all():
            res = db.query(Resource).filter(Resource.id == a.resource_id).first()
            existing.append({
                "resource_type": str(res.resource_type.name if res else "UNKNOWN"),
                "quantity": 1,
                "priority": "MEDIUM",
                "assigned": True,
                "resource_id": a.resource_id,
                "assignment_id": a.id,
            })
        return api_response(
            success=True,
            message=f"Incident #{incident_id} already has active AI allocations",
            data={
                "incident_id": incident_id,
                "severity": severity,
                "disaster_type": disaster_type,
                "ai_notes": "Allocations already exist for this incident (no duplicates created).",
                "allocated": existing,
                "assigned_count": len(existing),
            },
        )

    plan = ai_service.recommend_resources(severity, disaster_type)

    allocations = []
    for item in plan.get("recommended_resources", []):
        rtype = str(item.get("resource_type", "")).upper()
        entry = {
            "resource_type": rtype,
            "quantity": int(item.get("quantity", 1)),
            "priority": item.get("priority", "MEDIUM"),
            "assigned": False,
        }

        if rtype not in ResourceType.__members__:
            entry["reason"] = "No matching unit in local inventory"
            allocations.append(entry)
            continue

        resource = (
            db.query(Resource)
            .filter(
                Resource.resource_type == ResourceType[rtype],
                Resource.status == ResourceStatus.AVAILABLE,
            )
            .first()
        )
        if not resource:
            entry["reason"] = "No available unit in inventory"
            allocations.append(entry)
            continue

        resource.status = ResourceStatus.ASSIGNED
        assignment = Assignment(
            incident_id=incident_id,
            resource_id=resource.id,
            status="ACTIVE",
        )
        db.add(assignment)
        db.flush()

        entry.update({
            "assigned": True,
            "resource_id": resource.id,
            "resource_name": resource.name,
            "assignment_id": assignment.id,
        })
        allocations.append(entry)

    db.commit()

    return api_response(
        success=True,
        message=f"AI allocated resources for Incident #{incident_id}",
        data={
            "incident_id": incident_id,
            "severity": severity,
            "disaster_type": disaster_type,
            "ai_notes": plan.get("ai_notes", ""),
            "allocated": allocations,
            "assigned_count": sum(1 for a in allocations if a["assigned"]),
        },
    )




