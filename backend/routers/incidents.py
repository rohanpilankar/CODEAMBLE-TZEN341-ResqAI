import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse, IncidentImageSchema
from backend.services.incident_service import IncidentService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User
from backend.config import settings

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
def get_incidents(status: Optional[str] = None, severity: Optional[str] = None, db: Session = Depends(get_db)):
    service = IncidentService(db)
    return service.get_incidents(status_filter=status, severity_filter=severity)

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    service = IncidentService(db)
    return service.get_incident_by_id(incident_id)

@router.post("", response_model=IncidentResponse)
async def create_incident(req: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncidentService(db)
    return await service.create_incident(req, user_id=current_user.id)

@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(incident_id: int, req: IncidentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))):
    service = IncidentService(db)
    return await service.update_incident(incident_id, req)

@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin"]))):
    service = IncidentService(db)
    service.delete_incident(incident_id)
    return {"message": f"Incident {incident_id} deleted successfully"}

@router.post("/{incident_id}/upload-image", response_model=IncidentImageSchema)
async def upload_incident_image(incident_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncidentService(db)
    incident = service.get_incident_by_id(incident_id)

    upload_dir = os.path.join(settings.UPLOAD_DIR, "incidents")
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"inc_{incident_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/static/uploads/incidents/{filename}"
    img_record = service.add_incident_image(incident_id, image_url)
    return img_record
