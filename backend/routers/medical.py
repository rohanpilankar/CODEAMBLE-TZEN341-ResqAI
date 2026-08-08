from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.models.shelter import Hospital, BloodBank
from backend.utils.response import api_response

router = APIRouter(prefix="/medical", tags=["Medical Operations"])

@router.get("/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    if not hospitals:
        # Seed initial demo hospital data
        demo = [
            Hospital(name="City Trauma & Emergency Center", address="101 Civic Center Rd, Mumbai", total_beds=250, icu_beds=30, occupied_beds=180, phone_number="+91-22-2401-9000"),
            Hospital(name="St. Mary Emergency Hospital", address="45 Parkside Ave, Mumbai", total_beds=120, icu_beds=15, occupied_beds=85, phone_number="+91-22-2402-9000"),
        ]
        db.add_all(demo)
        db.commit()
        hospitals = db.query(Hospital).all()

    data = [{
        "id": h.id, "name": h.name, "address": h.address,
        "total_beds": h.total_beds, "icu_beds": h.icu_beds,
        "occupied_beds": h.occupied_beds, "available_beds": h.total_beds - h.occupied_beds,
        "phone_number": h.phone_number
    } for h in hospitals]
    return api_response(success=True, message=f"Retrieved {len(data)} hospitals", data=data)

@router.get("/blood-banks")
def get_blood_banks(db: Session = Depends(get_db)):
    banks = db.query(BloodBank).all()
    if not banks:
        demo = [
            BloodBank(hospital_name="Central Blood Bank", blood_group="O+", units_available=45),
            BloodBank(hospital_name="Central Blood Bank", blood_group="A+", units_available=32),
            BloodBank(hospital_name="Central Blood Bank", blood_group="B+", units_available=28),
            BloodBank(hospital_name="Central Blood Bank", blood_group="AB+", units_available=15),
            BloodBank(hospital_name="Central Blood Bank", blood_group="O-", units_available=12),
        ]
        db.add_all(demo)
        db.commit()
        banks = db.query(BloodBank).all()

    data = [{"id": b.id, "hospital_name": b.hospital_name, "blood_group": b.blood_group, "units_available": b.units_available} for b in banks]
    return api_response(success=True, message=f"Retrieved {len(data)} blood bank units", data=data)
