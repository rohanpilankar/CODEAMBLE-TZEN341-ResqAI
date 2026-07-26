from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database.session import get_db
from backend.schemas.notification import NotificationCreate, NotificationResponse, SystemLogResponse
from backend.services.notification_service import NotificationService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = NotificationService(db)
    return service.get_user_notifications(current_user.id)

@router.post("", response_model=NotificationResponse)
async def create_notification(req: NotificationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Government Authority", "Admin"]))):
    service = NotificationService(db)
    return await service.create_notification(req)

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = NotificationService(db)
    service.mark_as_read(notification_id, current_user.id)
    return {"message": "Notification marked as read"}

@router.get("/system-logs", response_model=List[SystemLogResponse])
def get_system_logs(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Admin"]))):
    service = NotificationService(db)
    return service.get_system_logs()
