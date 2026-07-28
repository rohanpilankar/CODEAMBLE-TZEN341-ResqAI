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
