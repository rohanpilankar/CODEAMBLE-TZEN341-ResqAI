import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.session import get_db
from backend.schemas.incident import IncidentCreate, IncidentUpdate
from backend.services.incident_service import IncidentService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User
from backend.config import settings
from backend.utils.response import api_response

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def _serialize_incident(inc):
    return {
        "id": inc.id, "title": inc.title, "description": inc.description,
        "disaster_type": inc.disaster_type,
        "severity": inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity),
        "status": inc.status.value if hasattr(inc.status, 'value') else str(inc.status),
        "latitude": inc.latitude, "longitude": inc.longitude,
        "address": inc.address, "reported_by_id": inc.reported_by_id,
        "assigned_team_id": inc.assigned_team_id,
        "is_ai_verified": inc.is_ai_verified,
        "ai_confidence_score": inc.ai_confidence_score,
        "created_at": str(inc.created_at) if inc.created_at else None,
        "updated_at": str(inc.updated_at) if inc.updated_at else None,
    }

@router.get("")
def get_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    service = IncidentService(db)
    incidents = service.get_incidents(status_filter=status_filter, severity_filter=severity)
    data = [_serialize_incident(i) for i in incidents]
    return api_response(success=True, message=f"Retrieved {len(data)} incidents", data=data)

@router.get("/{incident_id}")
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    service = IncidentService(db)
    inc = service.get_incident_by_id(incident_id)
    return api_response(success=True, message="Incident retrieved", data=_serialize_incident(inc))

@router.post("")
async def create_incident(
    req: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = IncidentService(db)
    created = await service.create_incident(req, user_id=current_user.id)
    return api_response(success=True, message="Incident reported successfully", data=_serialize_incident(created), status_code=201)

@router.put("/{incident_id}")
async def update_incident(
    incident_id: int, req: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))
):
    service = IncidentService(db)
    updated = await service.update_incident(incident_id, req)
    return api_response(success=True, message="Incident updated", data=_serialize_incident(updated))

@router.delete("/{incident_id}")
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    service = IncidentService(db)
    service.delete_incident(incident_id)
    return api_response(success=True, message=f"Incident #{incident_id} deleted")

@router.post("/{incident_id}/upload-image")
async def upload_incident_image(
    incident_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = IncidentService(db)
    service.get_incident_by_id(incident_id)

    upload_dir = os.path.join(settings.UPLOAD_DIR, "incidents")
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"inc_{incident_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/static/uploads/incidents/{filename}"
    img = service.add_incident_image(incident_id, image_url)
    return api_response(success=True, message="Image uploaded", data={
        "id": img.id, "incident_id": img.incident_id, "image_url": img.image_url
    })
