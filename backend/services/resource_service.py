from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status
from backend.repositories.resource_repository import ResourceRepository
from backend.models.resource import Resource, RescueTeam, Assignment, ResourceStatus
from backend.schemas.resource import ResourceCreate, ResourceUpdate, AssignmentCreate
from backend.websocket.manager import ws_manager
from backend.websocket.events import WSEvent, WSEventType

class ResourceService:
    def __init__(self, db: Session):
        self.repo = ResourceRepository(db)

    def get_resources(self, resource_type: Optional[str] = None, status: Optional[str] = None) -> List[Resource]:
        return self.repo.get_all_resources(resource_type=resource_type, status=status)

    def get_resource_by_id(self, resource_id: int) -> Resource:
        resource = self.repo.get_resource_by_id(resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
        return resource

    def create_resource(self, req: ResourceCreate) -> Resource:
        resource = Resource(
            name=req.name,
            resource_type=req.resource_type,
            quantity=req.quantity,
            status=req.status,
            location_name=req.location_name,
            latitude=req.latitude,
            longitude=req.longitude,
            team_id=req.team_id
        )
        return self.repo.create_resource(resource)

    def update_resource(self, resource_id: int, req: ResourceUpdate) -> Resource:
        resource = self.get_resource_by_id(resource_id)
        if req.name is not None:
            resource.name = req.name
        if req.quantity is not None:
            resource.quantity = req.quantity
        if req.status is not None:
            resource.status = req.status
        if req.location_name is not None:
            resource.location_name = req.location_name
        if req.team_id is not None:
            resource.team_id = req.team_id

        return self.repo.update_resource(resource)

    def get_rescue_teams(self) -> List[RescueTeam]:
        return self.repo.get_all_teams()

    async def assign_resource(self, req: AssignmentCreate) -> Assignment:
        assignment = Assignment(
            incident_id=req.incident_id,
            resource_id=req.resource_id,
            rescue_team_id=req.rescue_team_id,
            status="ACTIVE"
        )
        
        if req.resource_id:
            res = self.get_resource_by_id(req.resource_id)
            res.status = ResourceStatus.ASSIGNED
            self.repo.update_resource(res)

        created = self.repo.create_assignment(assignment)

        # Broadcast WS Event
        event = WSEvent(
            event_type=WSEventType.RESOURCE_ASSIGNED,
            data={
                "incident_id": req.incident_id,
                "resource_id": req.resource_id,
                "rescue_team_id": req.rescue_team_id
            }
        )
        await ws_manager.broadcast(event)

        return created
