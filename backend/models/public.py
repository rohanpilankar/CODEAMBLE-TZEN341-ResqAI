from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from backend.database.session import Base

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(100), nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow)
    is_published = Column(Integer, default=1)

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    registration_number = Column(String(100), nullable=False)
    contact_email = Column(String(150), nullable=False)
    active_campaigns = Column(Integer, default=0)
    verified = Column(Integer, default=1)

class ReliefRequest(Base):
    __tablename__ = "relief_requests"

    id = Column(Integer, primary_key=True, index=True)
    ngo_name = Column(String(200), nullable=False)
    items_needed = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    urgency = Column(String(50), default="MEDIUM")
    status = Column(String(50), default="PENDING")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    ngo_name = Column(String(200), nullable=False)
    target_amount = Column(Integer, default=10000)
    raised_amount = Column(Integer, default=0)
    status = Column(String(50), default="ACTIVE")

