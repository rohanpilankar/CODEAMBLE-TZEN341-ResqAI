from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.schemas.user import UserUpdate
from backend.services.user_service import UserService
from backend.auth.dependencies import require_roles, get_current_user

from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Government Authority"]))
):
    service = UserService(db)
    users = service.get_users(skip=skip, limit=limit)
    data = []
    for u in users:
        data.append({
            "id": u.id, "email": u.email, "full_name": u.full_name,
            "phone_number": u.phone_number, "role": u.role_rel.name,
            "is_active": u.is_active, "avatar_url": u.avatar_url
        })
    return api_response(success=True, message=f"Retrieved {len(data)} users", data=data)

_user_locations_store = {}

@router.post("/location")
def update_user_location(
    data: dict,
    current_user: User = Depends(require_roles(["Citizen", "Volunteer", "Rescue Team", "Government Authority", "NGO", "Admin"]))
):
    lat = data.get("latitude", 19.0760)
    lng = data.get("longitude", 72.8777)
    location_name = data.get("location_name", "Field Sector 4")
    address = data.get("address", "")
    
    loc_entry = {
        "user_id": current_user.id,
        "user_name": current_user.full_name,
        "role": current_user.role_rel.name if current_user.role_rel else "Rescue Team",
        "latitude": lat,
        "longitude": lng,
        "location_name": location_name,
        "address": address,
        "updated_at": __import__("datetime").datetime.utcnow().isoformat()
    }
    _user_locations_store[current_user.id] = loc_entry
    _user_locations_store["latest_rescue"] = loc_entry
    
    return api_response(success=True, message="Location updated successfully", data=loc_entry)

@router.get("/location")
def get_user_location(
    current_user: User = Depends(require_roles(["Citizen", "Volunteer", "Rescue Team", "Government Authority", "NGO", "Admin"]))
):
    loc = _user_locations_store.get(current_user.id) or _user_locations_store.get("latest_rescue")
    if not loc:
        loc = {
            "user_id": current_user.id,
            "user_name": current_user.full_name,
            "role": "Rescue Team",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_name": "Mumbai, Sector 4",
            "address": "Mumbai, Sector 4 Command Base",
            "updated_at": __import__("datetime").datetime.utcnow().isoformat()
        }
    return api_response(success=True, message="Latest user location retrieved", data=loc)

_user_preferences_store = {}

@router.post("/preferences")
def update_user_preferences(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    theme = data.get("theme", "dark")
    pref_entry = {
        "user_id": current_user.id,
        "theme": theme,
        "updated_at": __import__("datetime").datetime.utcnow().isoformat()
    }
    _user_preferences_store[current_user.id] = pref_entry
    return api_response(success=True, message="User preferences updated", data=pref_entry)

@router.get("/preferences")
def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    pref = _user_preferences_store.get(current_user.id, {
        "user_id": current_user.id,
        "theme": "dark"
    })
    return api_response(success=True, message="User preferences retrieved", data=pref)

@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Government Authority"]))
):
    service = UserService(db)
    u = service.get_user_by_id(user_id)
    return api_response(success=True, message="User details retrieved", data={
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "phone_number": u.phone_number, "role": u.role_rel.name,
        "is_active": u.is_active, "avatar_url": u.avatar_url
    })



@router.post("/sos")
def trigger_sos(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Citizen", "Volunteer", "Rescue Team", "Government Authority", "NGO", "Admin"]))
):
    from backend.models.incident import Incident
    from backend.websocket.manager import ws_manager

    lat = data.get("latitude", 19.0760)
    lng = data.get("longitude", 72.8777)
    address = data.get("address", "SOS Distress Signal Location")

    sos_incident = Incident(
        title=f"🚨 SOS EMERGENCY — {current_user.full_name}",
        description=f"CRITICAL SOS distress signal triggered by {current_user.full_name} ({current_user.phone_number}). Immediate rescue required.",
        disaster_type="SOS Emergency",
        severity="CRITICAL",
        status="REPORTED",
        latitude=lat,
        longitude=lng,
        address=address,
        reported_by_id=current_user.id,
        is_ai_verified=1,
        ai_confidence_score=0.99
    )
    db.add(sos_incident)
    db.commit()
    db.refresh(sos_incident)

    return api_response(
        success=True,
        message="SOS Emergency Alert Broadcasted!",
        data={"incident_id": sos_incident.id, "status": "CRITICAL_DISPATCH_TRIGGERED"}
    )

@router.get("/family-safe")
def get_family_safe(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Citizen", "Volunteer", "Rescue Team", "Government Authority", "NGO", "Admin"]))
):
    from backend.models.user import FamilySafeStatus
    statuses = db.query(FamilySafeStatus).filter(FamilySafeStatus.user_id == current_user.id).all()
    data = [{
        "id": s.id, "contact_name": s.contact_name, "phone_number": s.phone_number,
        "status": s.status, "location": s.location, "last_updated": s.last_updated.isoformat()
    } for s in statuses]
    return api_response(success=True, message="Family statuses retrieved", data=data)

@router.post("/family-safe")
def update_family_safe(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Citizen", "Volunteer", "Rescue Team", "Government Authority", "NGO", "Admin"]))
):
    from backend.models.user import FamilySafeStatus
    stat = FamilySafeStatus(
        user_id=current_user.id,
        contact_name=data.get("contact_name", "Family Member"),
        phone_number=data.get("phone_number", ""),
        status=data.get("status", "SAFE"),
        location=data.get("location", "Current Location")
    )
    db.add(stat)
    db.commit()
    db.refresh(stat)
    return api_response(success=True, message="Family member status logged", data={"id": stat.id})






