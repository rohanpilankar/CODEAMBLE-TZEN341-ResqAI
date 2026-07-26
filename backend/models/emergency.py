from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime
from backend.database.session import Base

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    agency_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False) # Police, Ambulance, Fire, Disaster Mgmt
    phone_number = Column(String(20), nullable=False)
    location = Column(String(150), nullable=True)
    is_active = Column(Integer, default=1)

class RouteHistory(Base):
    __tablename__ = "route_histories"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, nullable=False)
    incident_id = Column(Integer, nullable=False)
    waypoints_json = Column(Text, nullable=False) # JSON encoded lat/lng waypoints
    estimated_time_minutes = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
