from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database.session import get_db
from backend.models.resource import Volunteer
from backend.utils.response import api_response

router = APIRouter(prefix="/volunteers", tags=["Volunteer Center"])

class VolunteerCreate(BaseModel):
    full_name: str
    phone: str
    skills: str
    availability_status: Optional[str] = "AVAILABLE"

@router.get("")
def list_volunteers(db: Session = Depends(get_db)):
    volunteers = db.query(Volunteer).all()
    if not volunteers:
        demo = [
            Volunteer(full_name="Priya Sharma", phone="+91-9876543210", skills="First Aid, Search & Rescue", availability_status="AVAILABLE"),
            Volunteer(full_name="Rohan Verma", phone="+91-9876543211", skills="Boat Driver, Heavy Lifting", availability_status="ASSIGNED"),
            Volunteer(full_name="Amit Patel", phone="+91-9876543212", skills="Medical Nurse, Counseling", availability_status="AVAILABLE"),
        ]
        db.add_all(demo)
        db.commit()
        volunteers = db.query(Volunteer).all()

    data = [{"id": v.id, "name": v.full_name, "skills": v.skills, "phone_number": v.phone, "status": v.availability_status} for v in volunteers]
    return api_response(success=True, message=f"Retrieved {len(data)} volunteers", data=data)

@router.post("")
def add_volunteer(req: VolunteerCreate, db: Session = Depends(get_db)):
    v = Volunteer(full_name=req.full_name, phone=req.phone, skills=req.skills, availability_status=req.availability_status or "AVAILABLE")
    db.add(v)
    db.commit()
    db.refresh(v)
    return api_response(success=True, message="Volunteer registered successfully", data={"id": v.id, "name": v.full_name})

@router.put("/{volunteer_id}/status")
def update_volunteer_status(volunteer_id: int, status: str, db: Session = Depends(get_db)):
    v = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    v.availability_status = status
    db.commit()
    return api_response(success=True, message=f"Volunteer #{volunteer_id} status updated to {status}", data={"id": v.id, "status": v.availability_status})
