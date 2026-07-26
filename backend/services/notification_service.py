from sqlalchemy.orm import Session
from typing import List
from backend.repositories.notification_repository import NotificationRepository
from backend.models.notification import Notification, SystemLog
from backend.schemas.notification import NotificationCreate
from backend.websocket.manager import ws_manager
from backend.websocket.events import WSEvent, WSEventType

class NotificationService:
    def __init__(self, db: Session):
        self.repo = NotificationRepository(db)

    async def create_notification(self, req: NotificationCreate) -> Notification:
        n = Notification(
            user_id=req.user_id,
            title=req.title,
            message=req.message,
            type=req.type
        )
        created = self.repo.create_notification(n)

        # Broadcast personal notification event via WS
        event = WSEvent(
            event_type=WSEventType.NOTIFICATION,
            data={
                "id": created.id,
                "title": created.title,
                "message": created.message,
                "type": created.type
            },
            target_user_id=req.user_id
        )
        await ws_manager.send_personal_message(event, f"user_{req.user_id}")

        return created

    def get_user_notifications(self, user_id: int) -> List[Notification]:
        return self.repo.get_user_notifications(user_id)

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        return self.repo.mark_as_read(notification_id, user_id)

    def get_system_logs(self) -> List[SystemLog]:
        return self.repo.get_system_logs()
