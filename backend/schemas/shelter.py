from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ShelterCreate(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    contact_phone: Optional[str] = None
    total_capacity: int = 100
    current_occupancy: int = 0
    medical_available: bool = True
    food_available: bool = True
    water_available: bool = True

class ShelterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    total_capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    medical_available: Optional[bool] = None
    food_available: Optional[bool] = None
    water_available: Optional[bool] = None
    is_active: Optional[bool] = None

class ShelterResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    contact_phone: Optional[str] = None
    is_active: bool
    total_capacity: int
    current_occupancy: int
    medical_available: bool
    food_available: bool
    water_available: bool
    created_at: datetime

    class Config:
        from_attributes = True
