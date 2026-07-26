from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database.session import Base

class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    VERIFIED = "VERIFIED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class DisasterType(Base):
    __tablename__ = "disaster_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False) # Flood, Earthquake, Fire, Hurricane, Landslide
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    disaster_type = Column(String(50), nullable=False, default="General Emergency")
    severity = Column(SQLEnum(SeverityLevel), default=SeverityLevel.MEDIUM, index=True)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.REPORTED, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    
    is_ai_verified = Column(Integer, default=0) # 0: unverified, 1: verified
    ai_confidence_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", back_populates="incidents")
    assigned_team = relationship("RescueTeam", back_populates="incidents")
    images = relationship("IncidentImage", back_populates="incident", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="incident")

class IncidentImage(Base):
    __tablename__ = "incident_images"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="images")
