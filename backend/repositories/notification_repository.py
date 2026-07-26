from sqlalchemy.orm import Session
from typing import List, Optional
from backend.models.notification import Notification, SystemLog, AuditLog

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_user_notifications(self, user_id: int, limit: int = 50) -> List[Notification]:
        return self.db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit).all()

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        n = self.db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if n:
            n.is_read = True
            self.db.commit()
            return True
        return False

    def create_system_log(self, level: str, module: str, message: str) -> SystemLog:
        log = SystemLog(level=level, module=module, message=message)
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_system_logs(self, limit: int = 100) -> List[SystemLog]:
        return self.db.query(SystemLog).order_by(SystemLog.created_at.desc()).limit(limit).all()
