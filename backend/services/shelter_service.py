from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status
from backend.repositories.shelter_repository import ShelterRepository
from backend.models.shelter import Shelter, ShelterCapacity
from backend.schemas.shelter import ShelterCreate, ShelterUpdate
from backend.websocket.manager import ws_manager
from backend.websocket.events import WSEvent, WSEventType

class ShelterService:
    def __init__(self, db: Session):
        self.repo = ShelterRepository(db)

    def get_shelters(self, is_active: Optional[bool] = None) -> List[Shelter]:
        return self.repo.get_all(is_active=is_active)

    def get_shelter_by_id(self, shelter_id: int) -> Shelter:
        shelter = self.repo.get_by_id(shelter_id)
        if not shelter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelter not found")
        return shelter

    def create_shelter(self, req: ShelterCreate) -> Shelter:
        shelter = Shelter(
            name=req.name,
            address=req.address,
            latitude=req.latitude,
            longitude=req.longitude,
            contact_phone=req.contact_phone,
            total_capacity=req.total_capacity,
            current_occupancy=req.current_occupancy,
            medical_available=req.medical_available,
            food_available=req.food_available,
            water_available=req.water_available
        )
        return self.repo.create(shelter)

    async def update_shelter(self, shelter_id: int, req: ShelterUpdate) -> Shelter:
        shelter = self.get_shelter_by_id(shelter_id)

        if req.name is not None:
            shelter.name = req.name
        if req.address is not None:
            shelter.address = req.address
        if req.total_capacity is not None:
            shelter.total_capacity = req.total_capacity
        if req.current_occupancy is not None:
            effective_capacity = req.total_capacity if req.total_capacity is not None else shelter.total_capacity
            if req.current_occupancy > effective_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Current occupancy ({req.current_occupancy}) cannot exceed total capacity ({effective_capacity})"
                )
            shelter.current_occupancy = req.current_occupancy
        if req.medical_available is not None:
            shelter.medical_available = req.medical_available
        if req.food_available is not None:
            shelter.food_available = req.food_available
        if req.water_available is not None:
            shelter.water_available = req.water_available
        if req.is_active is not None:
            shelter.is_active = req.is_active

        updated = self.repo.update(shelter)

        # Log capacity history snapshot
        avail = max(0, updated.total_capacity - updated.current_occupancy)
        self.repo.log_capacity(ShelterCapacity(
            shelter_id=updated.id,
            occupied_beds=updated.current_occupancy,
            available_beds=avail
        ))

        # Broadcast WS event
        event = WSEvent(
            event_type=WSEventType.SHELTER_UPDATED,
            data={
                "id": updated.id,
                "name": updated.name,
                "current_occupancy": updated.current_occupancy,
                "total_capacity": updated.total_capacity
            }
        )
        await ws_manager.broadcast(event)

        return updated
