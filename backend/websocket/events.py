from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timezone

class WSEventType:
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_UPDATED = "INCIDENT_UPDATED"
    SHELTER_UPDATED = "SHELTER_UPDATED"
    RESOURCE_ASSIGNED = "RESOURCE_ASSIGNED"
    MISSION_COMPLETED = "MISSION_COMPLETED"
    NOTIFICATION = "NOTIFICATION"
    RESCUE_LOCATION_UPDATE = "RESCUE_LOCATION_UPDATE"


class WSEvent(BaseModel):
    event_type: str
    data: Dict[str, Any]
    timestamp: str = datetime.now(timezone.utc).isoformat()
    target_role: Optional[str] = None
    target_user_id: Optional[int] = None
