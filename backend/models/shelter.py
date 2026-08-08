from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.session import Base

class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    
    total_capacity = Column(Integer, nullable=False, default=100)
    current_occupancy = Column(Integer, nullable=False, default=0)
    
    medical_available = Column(Boolean, default=True)
    food_available = Column(Boolean, default=True)
    water_available = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    capacities = relationship("ShelterCapacity", back_populates="shelter", cascade="all, delete-orphan")

class ShelterCapacity(Base):
    __tablename__ = "shelter_capacities"

    id = Column(Integer, primary_key=True, index=True)
    shelter_id = Column(Integer, ForeignKey("shelters.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    occupied_beds = Column(Integer, nullable=False)
    available_beds = Column(Integer, nullable=False)

    shelter = relationship("Shelter", back_populates="capacities")

class MedicalFacility(Base):
    __tablename__ = "medical_facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    facility_type = Column(String(50), nullable=False, default="Hospital") # Hospital, Clinic, Trauma Center
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    available_beds = Column(Integer, default=20)
    phone = Column(String(20), nullable=True)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    total_beds = Column(Integer, default=100)
    icu_beds = Column(Integer, default=15)
    occupied_beds = Column(Integer, default=45)
    phone_number = Column(String(20), nullable=True)

class BloodBank(Base):
    __tablename__ = "blood_banks"

    id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(100), nullable=False)
    blood_group = Column(String(10), nullable=False) # A+, O-, B+, etc.
    units_available = Column(Integer, default=50)

class EvacuationRequest(Base):
    __tablename__ = "evacuation_requests"

    id = Column(Integer, primary_key=True, index=True)
    citizen_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=False)
    pickup_address = Column(String(255), nullable=False)
    target_shelter_id = Column(Integer, ForeignKey("shelters.id"), nullable=True)
    people_count = Column(Integer, default=1)
    status = Column(String(50), default="PENDING") # PENDING, ASSIGNED, COMPLETED
    requested_at = Column(DateTime, default=datetime.utcnow)

