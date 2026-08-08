from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from backend.models.resource import ResourceType, ResourceStatus

class ResourceCreate(BaseModel):
    name: str
    resource_type: ResourceType
    quantity: int = Field(1, ge=0)
    status: ResourceStatus = ResourceStatus.AVAILABLE
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    team_id: Optional[int] = None

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    status: Optional[ResourceStatus] = None
    location_name: Optional[str] = None
    team_id: Optional[int] = None


class ResourceResponse(BaseModel):
    id: int
    name: str
    resource_type: ResourceType
    quantity: int
    status: ResourceStatus
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    team_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RescueTeamResponse(BaseModel):
    id: int
    name: str
    leader_name: str
    contact_phone: str
    specialization: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class AssignmentCreate(BaseModel):
    incident_id: int
    resource_id: Optional[int] = None
    rescue_team_id: Optional[int] = None
