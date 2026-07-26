from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database.session import get_db
from backend.schemas.user import UserResponse, UserUpdate
from backend.services.user_service import UserService
from backend.auth.dependencies import require_roles
from backend.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin", "Government Authority"]))):
    service = UserService(db)
    return service.get_users(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin", "Government Authority"]))):
    service = UserService(db)
    return service.get_user_by_id(user_id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin"]))):
    service = UserService(db)
    return service.update_user(user_id, req)
