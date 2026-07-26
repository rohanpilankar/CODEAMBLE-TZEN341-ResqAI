from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, RescueTeamResponse, AssignmentCreate
from backend.services.resource_service import ResourceService
from backend.auth.dependencies import require_roles
from backend.models.user import User

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("", response_model=List[ResourceResponse])
def get_resources(resource_type: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    service = ResourceService(db)
    return service.get_resources(resource_type=resource_type, status=status)

@router.post("", response_model=ResourceResponse)
def create_resource(req: ResourceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Government Authority", "Admin"]))):
    service = ResourceService(db)
    return service.create_resource(req)

@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(resource_id: int, req: ResourceUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))):
    service = ResourceService(db)
    return service.update_resource(resource_id, req)

@router.get("/teams", response_model=List[RescueTeamResponse])
def get_rescue_teams(db: Session = Depends(get_db)):
    service = ResourceService(db)
    return service.get_rescue_teams()

@router.post("/assign")
async def assign_resource(req: AssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Government Authority", "Admin"]))):
    service = ResourceService(db)
    assignment = await service.assign_resource(req)
    return {"message": "Resource/Team assigned successfully", "assignment_id": assignment.id}
