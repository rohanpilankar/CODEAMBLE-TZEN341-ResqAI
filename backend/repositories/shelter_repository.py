from sqlalchemy.orm import Session
from typing import Optional, List
from backend.models.shelter import Shelter, ShelterCapacity

class ShelterRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, shelter_id: int) -> Optional[Shelter]:
        return self.db.query(Shelter).filter(Shelter.id == shelter_id).first()

    def get_all(self, is_active: Optional[bool] = None, skip: int = 0, limit: int = 100) -> List[Shelter]:
        query = self.db.query(Shelter)
        if is_active is not None:
            query = query.filter(Shelter.is_active == is_active)
        return query.offset(skip).limit(limit).all()

    def create(self, shelter: Shelter) -> Shelter:
        self.db.add(shelter)
        self.db.commit()
        self.db.refresh(shelter)
        return shelter

    def update(self, shelter: Shelter) -> Shelter:
        self.db.commit()
        self.db.refresh(shelter)
        return shelter

    def log_capacity(self, capacity: ShelterCapacity) -> ShelterCapacity:
        self.db.add(capacity)
        self.db.commit()
        self.db.refresh(capacity)
        return capacity
