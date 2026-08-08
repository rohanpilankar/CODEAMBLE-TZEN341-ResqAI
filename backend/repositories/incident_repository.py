from sqlalchemy.orm import Session
from sqlalchemy import case
from typing import Optional, List
from backend.models.incident import Incident, IncidentImage, SeverityLevel, IncidentStatus

class IncidentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, incident_id: int) -> Optional[Incident]:
        return self.db.query(Incident).filter(Incident.id == incident_id).first()

    def get_all(self, status: Optional[str] = None, severity: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Incident]:
        query = self.db.query(Incident)
        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, incident: Incident) -> Incident:
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def update(self, incident: Incident) -> Incident:
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def delete(self, incident: Incident):
        self.db.delete(incident)
        self.db.commit()

    def add_image(self, image: IncidentImage) -> IncidentImage:
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def get_priority_queue(self, limit: int = 10) -> List[Incident]:
        """Fetch active incidents ordered by severity DESC for dispatch queue (SQL-level)."""
        severity_order = case(
            (Incident.severity == SeverityLevel.CRITICAL, 4),
            (Incident.severity == SeverityLevel.HIGH, 3),
            (Incident.severity == SeverityLevel.MEDIUM, 2),
            else_=1
        )
        return self.db.query(Incident)\
            .filter(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]))\
            .order_by(severity_order.desc())\
            .limit(limit).all()

    def get_citizen_feed(self, limit: int = 15) -> List[Incident]:
        """Fetch active incidents ordered by most recent first for citizen feed (SQL-level)."""
        return self.db.query(Incident)\
            .filter(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]))\
            .order_by(Incident.created_at.desc())\
            .limit(limit).all()
