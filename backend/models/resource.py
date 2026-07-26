from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database.session import Base

class ResourceType(str, enum.Enum):
    AMBULANCE = "AMBULANCE"
    FIRE_TRUCK = "FIRE_TRUCK"
    RESCUE_BOAT = "RESCUE_BOAT"
    MEDICAL_KIT = "MEDICAL_KIT"
    FOOD_SUPPLY = "FOOD_SUPPLY"
    WATER_SUPPLY = "WATER_SUPPLY"
    GENERATOR = "GENERATOR"
    VOLUNTEER = "VOLUNTEER"

class ResourceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    DEPLETED = "DEPLETED"

class RescueTeam(Base):
    __tablename__ = "rescue_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    leader_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    specialization = Column(String(100), nullable=True) # Flood Rescue, Fire, First Aid
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)

    incidents = relationship("Incident", back_populates="assigned_team")
    resources = relationship("Resource", back_populates="team")

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    resource_type = Column(SQLEnum(ResourceType), nullable=False, index=True)
    quantity = Column(Integer, default=1)
    status = Column(SQLEnum(ResourceStatus), default=ResourceStatus.AVAILABLE, index=True)
    location_name = Column(String(150), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("RescueTeam", back_populates="resources")
    assignments = relationship("Assignment", back_populates="resource")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), unique=True, nullable=False)
    vehicle_type = Column(String(50), nullable=False) # Ambulance, Fire Truck, Boat
    capacity = Column(Integer, default=4)
    status = Column(String(50), default="OPERATIONAL")

class Equipment(Base):
    __tablename__ = "equipments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    serial_number = Column(String(100), nullable=True)
    condition = Column(String(50), default="GOOD")

class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    skills = Column(String(255), nullable=True) # First Aid, Swimming, Driving
    availability_status = Column(String(50), default="AVAILABLE")
    assigned_location = Column(String(150), nullable=True)

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=True)
    rescue_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="ACTIVE") # ACTIVE, COMPLETED, CANCELLED

    incident = relationship("Incident", back_populates="assignments")
    resource = relationship("Resource", back_populates="assignments")
