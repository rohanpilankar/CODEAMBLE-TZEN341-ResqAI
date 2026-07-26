from sqlalchemy.orm import Session
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
