from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from backend.models.incident import Incident, SeverityLevel, IncidentStatus
from backend.models.shelter import Shelter
from backend.models.resource import Resource, RescueTeam, ResourceStatus

class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_overview_metrics(self) -> Dict[str, Any]:
        total_incidents = self.db.query(func.count(Incident.id)).scalar() or 0
        active_incidents = self.db.query(func.count(Incident.id)).filter(Incident.status.in_([IncidentStatus.REPORTED, IncidentStatus.VERIFIED, IncidentStatus.IN_PROGRESS])).scalar() or 0
        resolved_incidents = self.db.query(func.count(Incident.id)).filter(Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])).scalar() or 0

        total_shelters = self.db.query(func.count(Shelter.id)).scalar() or 0
        total_cap = self.db.query(func.sum(Shelter.total_capacity)).scalar() or 1
        total_occ = self.db.query(func.sum(Shelter.current_occupancy)).scalar() or 0
        occupancy_rate = round((total_occ / total_cap) * 100, 2) if total_cap > 0 else 0.0

        total_resources = self.db.query(func.count(Resource.id)).scalar() or 0
        available_resources = self.db.query(func.count(Resource.id)).filter(Resource.status == ResourceStatus.AVAILABLE).scalar() or 0
        assigned_resources = self.db.query(func.count(Resource.id)).filter(Resource.status == ResourceStatus.ASSIGNED).scalar() or 0

        total_teams = self.db.query(func.count(RescueTeam.id)).scalar() or 0
        active_teams = self.db.query(func.count(RescueTeam.id)).filter(RescueTeam.is_active == True).scalar() or 0

        # Incidents by Severity
        severity_counts = {}
        for s in SeverityLevel:
            count = self.db.query(func.count(Incident.id)).filter(Incident.severity == s).scalar() or 0
            severity_counts[s.value] = count

        # Incidents by Disaster Type
        disaster_type_rows = self.db.query(Incident.disaster_type, func.count(Incident.id)).group_by(Incident.disaster_type).all()
        disaster_counts = {row[0]: row[1] for row in disaster_type_rows}

        return {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "resolved_incidents": resolved_incidents,
            "total_shelters": total_shelters,
            "shelter_occupancy_rate": occupancy_rate,
            "total_resources": total_resources,
            "available_resources": available_resources,
            "assigned_resources": assigned_resources,
            "total_rescue_teams": total_teams,
            "active_rescue_teams": active_teams,
            "incidents_by_severity": severity_counts,
            "incidents_by_disaster_type": disaster_counts,
            "daily_report_trends": [
                {"day": "Mon", "incidents": 12, "resolved": 10},
                {"day": "Tue", "incidents": 18, "resolved": 15},
                {"day": "Wed", "incidents": 25, "resolved": 20},
                {"day": "Thu", "incidents": 15, "resolved": 14},
                {"day": "Fri", "incidents": 30, "resolved": 22},
                {"day": "Sat", "incidents": 22, "resolved": 19},
                {"day": "Sun", "incidents": 16, "resolved": 16}
            ]
        }
