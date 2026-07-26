from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status
from backend.repositories.user_repository import UserRepository
from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate

class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repo.get_all(skip=skip, limit=limit)

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def update_user(self, user_id: int, req: UserUpdate) -> User:
        user = self.get_user_by_id(user_id)
        if req.full_name is not None:
            user.full_name = req.full_name
        if req.phone_number is not None:
            user.phone_number = req.phone_number
        if req.role_id is not None:
            user.role_id = req.role_id
        if req.is_active is not None:
            user.is_active = req.is_active

        return self.repo.update(user)
