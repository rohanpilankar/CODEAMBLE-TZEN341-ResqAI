from pydantic import BaseModel
from typing import Dict, List, Any

class AnalyticsOverviewResponse(BaseModel):
    total_incidents: int
    active_incidents: int
    resolved_incidents: int
    total_shelters: int
    shelter_occupancy_rate: float
    total_resources: int
    available_resources: int
    assigned_resources: int
    total_rescue_teams: int
    active_rescue_teams: int
    incidents_by_severity: Dict[str, int]
    incidents_by_disaster_type: Dict[str, int]
    daily_report_trends: List[Dict[str, Any]]
