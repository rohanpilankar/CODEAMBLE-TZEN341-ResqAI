from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.session import get_db
from backend.schemas.resource import ResourceCreate, ResourceUpdate, AssignmentCreate
from backend.services.resource_service import ResourceService
from backend.auth.dependencies import require_roles
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/resources", tags=["Resources"])

def _serialize_resource(r):
    return {
        "id": r.id, "name": r.name, "resource_type": r.resource_type,
        "quantity": r.quantity,
        "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
        "location_name": r.location_name,
        "latitude": r.latitude, "longitude": r.longitude,
        "team_id": r.team_id,
    }

@router.get("")
def get_resources(
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    service = ResourceService(db)
    resources = service.get_resources(resource_type=resource_type, status=status)
    data = [_serialize_resource(r) for r in resources]
    return api_response(success=True, message=f"Retrieved {len(data)} resources", data=data)

@router.get("/{resource_id}")
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    service = ResourceService(db)
    r = service.get_resource_by_id(resource_id)
    return api_response(success=True, message="Resource retrieved", data=_serialize_resource(r))

@router.post("")
def create_resource(
    req: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    service = ResourceService(db)
    r = service.create_resource(req)
    return api_response(success=True, message="Resource created", data=_serialize_resource(r), status_code=201)

@router.put("/{resource_id}")
def update_resource(
    resource_id: int, req: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Rescue Team", "Government Authority", "Admin"]))
):
    service = ResourceService(db)
    r = service.update_resource(resource_id, req)
    return api_response(success=True, message="Resource updated", data=_serialize_resource(r))

@router.get("/teams/list")
def get_rescue_teams(db: Session = Depends(get_db)):
    service = ResourceService(db)
    teams = service.get_rescue_teams()
    data = [{
        "id": t.id, "name": t.name, "leader_name": t.leader_name,
        "contact_phone": t.contact_phone, "specialization": t.specialization,
    } for t in teams]
    return api_response(success=True, message=f"Retrieved {len(data)} rescue teams", data=data)

@router.post("/assign")
async def assign_resource(
    req: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    service = ResourceService(db)
    assignment = await service.assign_resource(req)
    return api_response(success=True, message="Resource assigned successfully", data={"assignment_id": assignment.id})
