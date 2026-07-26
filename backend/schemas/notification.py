from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    type: str = "INFO"

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SystemLogResponse(BaseModel):
    id: int
    level: str
    module: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
