from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.schemas.user import UserUpdate
from backend.services.user_service import UserService
from backend.auth.dependencies import require_roles
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Government Authority"]))
):
    service = UserService(db)
    users = service.get_users(skip=skip, limit=limit)
    data = []
    for u in users:
        data.append({
            "id": u.id, "email": u.email, "full_name": u.full_name,
            "phone_number": u.phone_number, "role": u.role_rel.name,
            "is_active": u.is_active, "avatar_url": u.avatar_url
        })
    return api_response(success=True, message=f"Retrieved {len(data)} users", data=data)

@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Government Authority"]))
):
    service = UserService(db)
    u = service.get_user_by_id(user_id)
    return api_response(success=True, message="User details retrieved", data={
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "phone_number": u.phone_number, "role": u.role_rel.name,
        "is_active": u.is_active, "avatar_url": u.avatar_url
    })

@router.put("/{user_id}")
def update_user(
    user_id: int, req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    service = UserService(db)
    u = service.update_user(user_id, req)
    return api_response(success=True, message="User updated", data={
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "phone_number": u.phone_number, "role": u.role_rel.name,
        "is_active": u.is_active
    })
