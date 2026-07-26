from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.shelter import ShelterCreate, ShelterUpdate, ShelterResponse
from backend.services.shelter_service import ShelterService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User

router = APIRouter(prefix="/shelters", tags=["Shelters"])

@router.get("", response_model=List[ShelterResponse])
def get_shelters(is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    service = ShelterService(db)
    return service.get_shelters(is_active=is_active)

@router.get("/{shelter_id}", response_model=ShelterResponse)
def get_shelter(shelter_id: int, db: Session = Depends(get_db)):
    service = ShelterService(db)
    return service.get_shelter_by_id(shelter_id)

@router.post("", response_model=ShelterResponse)
def create_shelter(req: ShelterCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Government Authority", "Admin"]))):
    service = ShelterService(db)
    return service.create_shelter(req)

@router.put("/{shelter_id}", response_model=ShelterResponse)
async def update_shelter(shelter_id: int, req: ShelterUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))):
    service = ShelterService(db)
    return await service.update_shelter(shelter_id, req)
