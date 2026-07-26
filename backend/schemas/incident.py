from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend.models.incident import SeverityLevel, IncidentStatus

class IncidentImageSchema(BaseModel):
    id: int
    image_url: str

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    title: str
    description: str
    disaster_type: str = "General Emergency"
    severity: SeverityLevel = SeverityLevel.MEDIUM
    latitude: float
    longitude: float
    address: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    disaster_type: Optional[str] = None
    severity: Optional[SeverityLevel] = None
    status: Optional[IncidentStatus] = None
    assigned_team_id: Optional[int] = None
    address: Optional[str] = None

class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    disaster_type: str
    severity: SeverityLevel
    status: IncidentStatus
    latitude: float
    longitude: float
    address: Optional[str] = None
    reported_by_id: int
    assigned_team_id: Optional[int] = None
    is_ai_verified: int
    ai_confidence_score: float
    created_at: datetime
    updated_at: datetime
    images: List[IncidentImageSchema] = []

    class Config:
        from_attributes = True
