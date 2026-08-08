from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.schemas.notification import NotificationCreate
from backend.services.notification_service import NotificationService
from backend.auth.dependencies import get_current_user, require_roles
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    notes = service.get_user_notifications(current_user.id)
    data = [{
        "id": n.id, "title": n.title, "message": n.message,
        "type": n.type, "is_read": n.is_read,
        "created_at": str(n.created_at) if n.created_at else None
    } for n in notes]
    return api_response(success=True, message=f"Retrieved {len(data)} notifications", data=data)

@router.post("")
async def create_notification(
    req: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    service = NotificationService(db)
    created = await service.create_notification(req)
    return api_response(success=True, message="Notification sent", data={
        "id": created.id, "title": created.title, "message": created.message
    }, status_code=201)

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    service.mark_as_read(notification_id, current_user.id)
    return api_response(success=True, message="Notification marked as read", data={"id": notification_id})

@router.post("/broadcast")
async def broadcast_alert(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    from backend.websocket.manager import ws_manager
    from backend.models.user import User
    from backend.models.notification import Notification

    title = data.get("title", "EMERGENCY BROADCAST")
    message = data.get("message", "High priority system alert broadcasted by Command Center.")
    notif_type = data.get("type", "CRITICAL")

    # Broadcast to all connected WebSockets
    await ws_manager.broadcast({
        "event": "BROADCAST_ALERT",
        "data": {"title": title, "message": message, "type": notif_type}
    })

    # Also persist to database for active users
    users = db.query(User).filter(User.is_active == True).all()
    for u in users:
        n = Notification(user_id=u.id, title=title, message=message, type=notif_type)
        db.add(n)
    db.commit()

    return api_response(success=True, message=f"Broadcast sent to all active users.", data={"broadcast_count": len(users)})

