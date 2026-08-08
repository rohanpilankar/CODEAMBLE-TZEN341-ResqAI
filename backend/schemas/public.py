from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class NewsArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    author: Optional[str] = None
    published_at: datetime
    is_published: int

    model_config = ConfigDict(from_attributes=True)

class ContactMessageCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    message: str

class ContactMessageResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
