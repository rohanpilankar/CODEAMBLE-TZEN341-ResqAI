from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database.session import get_db
from backend.models.emergency import EmergencyContact
from backend.utils.response import api_response

router = APIRouter(prefix="/citizen", tags=["Citizen Safety Network"])

class FamilyCheckIn(BaseModel):
    family_member_name: str
    phone_number: str
    status: str  # SAFE, UNSAFE, NEED_RESCUE
    location_name: Optional[str] = "Mumbai"

class VictimReportCreate(BaseModel):
    incident_id: int
    victim_count: int
    medical_condition: str
    notes: str

# In-memory storage for active family check-ins
FAMILY_CHECK_INS = [
    {"id": 1, "family_member_name": "Sunita Sharma", "phone_number": "+91-9820011223", "status": "SAFE", "location_name": "Northern Relief Camp", "updated_at": "2026-08-05 01:20:00"},
    {"id": 2, "family_member_name": "Rajesh Kumar", "phone_number": "+91-9820011224", "status": "NEED_RESCUE", "location_name": "Dharavi Sector 3", "updated_at": "2026-08-05 01:25:00"},
]

@router.get("/family-check")
def get_family_checkins():
    return api_response(success=True, message=f"Retrieved {len(FAMILY_CHECK_INS)} family check-in statuses", data=FAMILY_CHECK_INS)

@router.post("/family-check")
def post_family_checkin(req: FamilyCheckIn):
    new_entry = {
        "id": len(FAMILY_CHECK_INS) + 1,
        "family_member_name": req.family_member_name,
        "phone_number": req.phone_number,
        "status": req.status,
        "location_name": req.location_name or "Mumbai",
        "updated_at": "2026-08-05 01:45:00"
    }
    FAMILY_CHECK_INS.insert(0, new_entry)
    return api_response(success=True, message="Family member safety check-in recorded", data=new_entry)

@router.get("/contacts")
def get_emergency_contacts(db: Session = Depends(get_db)):
    contacts = db.query(EmergencyContact).all()
    data = [{"id": c.id, "agency_name": c.agency_name, "category": c.category, "phone_number": c.phone_number, "location": c.location} for c in contacts]
    return api_response(success=True, message=f"Retrieved {len(data)} emergency hotlines", data=data)

@router.post("/victim-report")
def submit_victim_report(req: VictimReportCreate):
    return api_response(
        success=True,
        message=f"Victim report submitted for Incident #{req.incident_id}. Rescue teams notified.",
        data={"incident_id": req.incident_id, "victim_count": req.victim_count, "status": "DISPATCHED"}
    )
