from sqlalchemy.orm import Session
from typing import Optional, List
from backend.models.resource import Resource, RescueTeam, Assignment, ResourceType, ResourceStatus

class ResourceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_resource_by_id(self, resource_id: int) -> Optional[Resource]:
        return self.db.query(Resource).filter(Resource.id == resource_id).first()

    def get_all_resources(self, resource_type: Optional[str] = None, status: Optional[str] = None) -> List[Resource]:
        query = self.db.query(Resource)
        if resource_type:
            query = query.filter(Resource.resource_type == resource_type)
        if status:
            query = query.filter(Resource.status == status)
        return query.all()

    def create_resource(self, resource: Resource) -> Resource:
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def update_resource(self, resource: Resource) -> Resource:
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def get_all_teams(self) -> List[RescueTeam]:
        return self.db.query(RescueTeam).filter(RescueTeam.is_active == True).all()

    def get_team_by_id(self, team_id: int) -> Optional[RescueTeam]:
        return self.db.query(RescueTeam).filter(RescueTeam.id == team_id).first()

    def create_assignment(self, assignment: Assignment) -> Assignment:
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def get_assignments_by_incident(self, incident_id: int) -> List[Assignment]:
        return self.db.query(Assignment).filter(Assignment.incident_id == incident_id).all()
