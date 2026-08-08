from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status
from backend.repositories.incident_repository import IncidentRepository
from backend.models.incident import Incident, IncidentImage, IncidentStatus
from backend.schemas.incident import IncidentCreate, IncidentUpdate
from backend.services.ai_service import ai_service
from backend.websocket.manager import ws_manager
from backend.websocket.events import WSEvent, WSEventType

class IncidentService:
    def __init__(self, db: Session):
        self.repo = IncidentRepository(db)

    def get_incidents(self, status_filter: Optional[str] = None, severity_filter: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Incident]:
        return self.repo.get_all(status=status_filter, severity=severity_filter, skip=skip, limit=limit)


    def get_incident_by_id(self, incident_id: int) -> Incident:
        incident = self.repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        return incident

    async def create_incident(self, req: IncidentCreate, user_id: int) -> Incident:
        # Run AI Severity prediction
        ai_res = ai_service.predict_severity(req.title, req.description, req.disaster_type)

        severity_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        user_sev_str = req.severity.value if hasattr(req.severity, 'value') else str(req.severity).upper()
        ai_sev_str = str(ai_res["predicted_severity"]).upper()

        user_rank = severity_rank.get(user_sev_str, 2)
        ai_rank = severity_rank.get(ai_sev_str, 2)

        final_severity = req.severity if user_rank >= ai_rank else ai_res["predicted_severity"]

        incident = Incident(
            title=req.title,
            description=req.description,
            disaster_type=req.disaster_type,
            severity=final_severity,
            status=IncidentStatus.REPORTED,
            latitude=req.latitude,
            longitude=req.longitude,
            address=req.address,
            phone_number=req.phone_number,
            people_affected=req.people_affected if req.people_affected is not None else 1,
            media_url=req.media_url,
            reported_by_id=user_id,
            is_ai_verified=1,
            ai_confidence_score=ai_res["confidence_score"]
        )

        created = self.repo.create(incident)


        # Broadcast real-time WebSocket event
        event = WSEvent(
            event_type=WSEventType.INCIDENT_CREATED,
            data={
                "id": created.id,
                "title": created.title,
                "disaster_type": created.disaster_type,
                "severity": created.severity.value,
                "latitude": created.latitude,
                "longitude": created.longitude,
                "status": created.status.value,
                "phone_number": created.phone_number,
                "people_affected": created.people_affected,
                "media_url": created.media_url
            }
        )
        await ws_manager.broadcast(event)

        return created

    async def update_incident(self, incident_id: int, req: IncidentUpdate) -> Incident:
        incident = self.get_incident_by_id(incident_id)

        if req.title is not None:
            incident.title = req.title
        if req.description is not None:
            incident.description = req.description
        if req.disaster_type is not None:
            incident.disaster_type = req.disaster_type
        if req.severity is not None:
            incident.severity = req.severity
        if req.status is not None:
            incident.status = req.status
        if req.assigned_team_id is not None:
            incident.assigned_team_id = req.assigned_team_id
        if req.address is not None:
            incident.address = req.address
        if req.phone_number is not None:
            incident.phone_number = req.phone_number
        if req.people_affected is not None:
            incident.people_affected = req.people_affected
        if req.media_url is not None:
            incident.media_url = req.media_url

        updated = self.repo.update(incident)

        # Broadcast update
        event = WSEvent(
            event_type=WSEventType.INCIDENT_UPDATED,
            data={
                "id": updated.id,
                "status": updated.status.value,
                "assigned_team_id": updated.assigned_team_id
            }
        )
        await ws_manager.broadcast(event)

        return updated

    def delete_incident(self, incident_id: int):
        incident = self.get_incident_by_id(incident_id)
        self.repo.delete(incident)

    def add_incident_image(self, incident_id: int, image_url: str) -> IncidentImage:
        incident = self.get_incident_by_id(incident_id)
        incident.media_url = image_url
        self.repo.update(incident)
        img = IncidentImage(incident_id=incident.id, image_url=image_url)
        return self.repo.add_image(img)

