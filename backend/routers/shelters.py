from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.session import get_db
from backend.schemas.shelter import ShelterCreate, ShelterUpdate
from backend.services.shelter_service import ShelterService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/shelters", tags=["Shelters"])

def _serialize_shelter(s):
    return {
        "id": s.id, "name": s.name, "address": s.address,
        "latitude": s.latitude, "longitude": s.longitude,
        "contact_phone": s.contact_phone,
        "total_capacity": s.total_capacity, "current_occupancy": s.current_occupancy,
        "medical_available": s.medical_available,
        "food_available": s.food_available, "water_available": s.water_available,
        "is_active": s.is_active if hasattr(s, 'is_active') else True,
    }

@router.get("")
def get_shelters(is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    service = ShelterService(db)
    shelters = service.get_shelters(is_active=is_active)
    data = [_serialize_shelter(s) for s in shelters]
    return api_response(success=True, message=f"Retrieved {len(data)} shelters", data=data)

@router.get("/occupancy")
def get_shelter_occupancy(db: Session = Depends(get_db)):
    service = ShelterService(db)
    shelters = service.get_shelters(is_active=True)
    
    total_capacity = sum(s.total_capacity or 0 for s in shelters)
    total_occupancy = sum(s.current_occupancy or 0 for s in shelters)
    overall_pct = round((total_occupancy / (total_capacity or 1)) * 100, 1)

    items = []
    for s in shelters:
        cap = s.total_capacity or 100
        occ = s.current_occupancy or 0
        pct = round((occ / cap) * 100, 1)
        items.append({
            "id": s.id,
            "name": s.name,
            "address": s.address,
            "total_capacity": cap,
            "current_occupancy": occ,
            "occupancy_pct": pct,
            "status": "CRITICAL" if pct >= 90 else "HIGH" if pct >= 75 else "NORMAL",
            "medical": s.medical_available,
            "food": s.food_available,
            "water": s.water_available
        })

    return api_response(success=True, message="Shelter occupancy metrics retrieved", data={
        "total_capacity": total_capacity,
        "total_occupancy": total_occupancy,
        "overall_occupancy_pct": overall_pct,
        "shelters": items
    })

@router.get("/{shelter_id}")
def get_shelter(shelter_id: int, db: Session = Depends(get_db)):
    service = ShelterService(db)
    s = service.get_shelter_by_id(shelter_id)
    return api_response(success=True, message="Shelter retrieved", data=_serialize_shelter(s))


@router.post("")
def create_shelter(
    req: ShelterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    service = ShelterService(db)
    s = service.create_shelter(req)
    return api_response(success=True, message="Shelter created", data=_serialize_shelter(s), status_code=201)

@router.put("/{shelter_id}")
async def update_shelter(
    shelter_id: int, req: ShelterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))
):
    service = ShelterService(db)
    s = await service.update_shelter(shelter_id, req)
    return api_response(success=True, message="Shelter updated", data=_serialize_shelter(s))
