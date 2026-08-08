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
    images_list = [img.image_url for img in inc.images] if hasattr(inc, 'images') and inc.images else []
    primary_media = inc.media_url or (images_list[0] if images_list else None)
    if primary_media and primary_media not in images_list:
        images_list.insert(0, primary_media)

    return {
        "id": inc.id, "title": inc.title, "description": inc.description,
        "disaster_type": inc.disaster_type,
        "severity": inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity),
        "status": inc.status.value if hasattr(inc.status, 'value') else str(inc.status),
        "latitude": inc.latitude, "longitude": inc.longitude,
        "address": inc.address,
        "phone_number": getattr(inc, "phone_number", None),
        "people_affected": getattr(inc, "people_affected", 1),
        "media_url": primary_media,
        "images": images_list,
        "reported_by_id": inc.reported_by_id,
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
    skip = (page - 1) * limit
    incidents = service.get_incidents(status_filter=status_filter, severity_filter=severity, skip=skip, limit=limit)
    data = [_serialize_incident(i) for i in incidents]

    return api_response(success=True, message=f"Retrieved {len(data)} incidents", data=data)

@router.get("/priority-queue")
def get_priority_queue(db: Session = Depends(get_db)):
    service = IncidentService(db)
    sorted_incidents = service.repo.get_priority_queue(limit=10)

    queue = []
    for inc in sorted_incidents:
        queue.append({
            "id": inc.id,
            "title": inc.title,
            "severity": inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity),
            "address": inc.address or "Sector 4 Command Area",
            "score": round((inc.ai_confidence_score or 0.9) * 100, 1),
            "status": inc.status.value if hasattr(inc.status, 'value') else str(inc.status),
            "reported_time": str(inc.created_at) if inc.created_at else "Just now"
        })
    return api_response(success=True, message="Priority queue retrieved", data=queue)

@router.get("/feed")
def get_citizen_feed(db: Session = Depends(get_db)):
    service = IncidentService(db)
    active_incidents = service.repo.get_citizen_feed(limit=15)

    feed = []
    for inc in active_incidents:
        feed.append({
            "id": inc.id,
            "title": inc.title,
            "description": inc.description,
            "disaster_type": inc.disaster_type,
            "severity": inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity),
            "status": inc.status.value if hasattr(inc.status, 'value') else str(inc.status),
            "location": inc.address or f"{inc.latitude}, {inc.longitude}",
            "time": str(inc.created_at) if inc.created_at else "Recently"
        })
    return api_response(success=True, message="Citizen distress feed retrieved", data=feed)

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
    from backend.websocket.manager import ws_manager
    from backend.websocket.events import WSEvent, WSEventType

    service = IncidentService(db)
    created = await service.create_incident(req, user_id=current_user.id)
    serialized = _serialize_incident(created)

    try:
        await ws_manager.broadcast(WSEvent(
            event_type=WSEventType.INCIDENT_CREATED,
            data=serialized
        ))
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")

    return api_response(success=True, message="Incident reported successfully", data=serialized, status_code=201)

@router.put("/{incident_id}")
async def update_incident(
    incident_id: int, req: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from backend.websocket.manager import ws_manager
    from backend.websocket.events import WSEvent, WSEventType

    service = IncidentService(db)
    inc = service.get_incident_by_id(incident_id)
    role_name = current_user.role_rel.name.lower() if (current_user and current_user.role_rel) else ""
    if current_user.id != inc.reported_by_id and role_name not in ["rescue team", "government authority", "admin"] and role_name != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this incident")

    updated = await service.update_incident(incident_id, req)
    serialized = _serialize_incident(updated)

    try:
        await ws_manager.broadcast(WSEvent(
            event_type=WSEventType.INCIDENT_UPDATED,
            data=serialized
        ))
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")

    return api_response(success=True, message="Incident updated", data=serialized)



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

@router.post("/{incident_id}/merge")
def merge_incidents(
    incident_id: int,
    duplicate_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    from backend.models.incident import Incident
    primary = db.query(Incident).filter(Incident.id == incident_id).first()
    if not primary:
        raise HTTPException(status_code=404, detail="Primary incident not found")

    merged_count = 0
    for dup_id in duplicate_ids:
        dup = db.query(Incident).filter(Incident.id == dup_id).first()
        if dup:
            dup.status = "CLOSED"
            dup.description += f" [Merged into Incident #{primary.id}]"
            merged_count += 1
    db.commit()
    return api_response(
        success=True,
        message=f"Merged {merged_count} duplicate reports into Incident #{primary.id}",
        data={"primary_id": primary.id, "merged_count": merged_count}
    )

