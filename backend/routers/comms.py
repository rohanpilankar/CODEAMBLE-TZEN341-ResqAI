from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database.session import get_db
from backend.models.notification import Notification, SystemLog
from backend.models.user import User
from backend.utils.response import api_response
from backend.websocket.manager import ws_manager

router = APIRouter(prefix="/comms", tags=["Emergency Communication Center"])

class BroadcastRequest(BaseModel):
    title: str
    message: str
    target_role: Optional[str] = "ALL"
    channel: str = "BROADCAST"  # BROADCAST, SMS, EMAIL, PUSH

@router.post("/broadcast")
async def send_broadcast(req: BroadcastRequest, db: Session = Depends(get_db)):
    admin_user = db.query(User).first()
    admin_id = admin_user.id if admin_user else 1

    notif = Notification(
        user_id=admin_id,
        title=f"[{req.channel}] {req.title}",
        message=req.message,
        type="ALERT",
        is_read=False
    )
    db.add(notif)
    sys_log = SystemLog(level="INFO", module="COMMS", message=f"Broadcast sent: {req.title} via {req.channel}")
    db.add(sys_log)
    db.commit()

    await ws_manager.broadcast({
        "event": "EMERGENCY_BROADCAST",
        "title": req.title,
        "message": req.message,
        "channel": req.channel,
        "target_role": req.target_role
    })

    return api_response(
        success=True,
        message=f"Broadcast successfully transmitted via {req.channel} to target role '{req.target_role}'",
        data={"id": notif.id, "title": req.title, "channel": req.channel}
    )

@router.get("/logs")
def get_comms_logs(db: Session = Depends(get_db)):
    logs = db.query(Notification).order_by(Notification.id.desc()).limit(20).all()
    data = [{"id": n.id, "title": n.title, "message": n.message, "created_at": str(n.created_at)} for n in logs]
    return api_response(success=True, message=f"Retrieved {len(data)} broadcast logs", data=data)
