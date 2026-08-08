from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database.session import get_db
from backend.models.public import NGO, ReliefRequest, Campaign
from backend.utils.response import api_response

router = APIRouter(prefix="/ngo", tags=["NGO Operations"])

class NGORequestCreate(BaseModel):
    items_needed: str
    quantity: int
    urgency: str
    delivery_location: str

class CampaignCreate(BaseModel):
    title: str
    target_amount: float
    description: str

@router.get("/list")
def list_ngos(db: Session = Depends(get_db)):
    ngos = db.query(NGO).all()
    if not ngos:
        demo = [
            NGO(name="Relief India Foundation", registration_number="NGO-IND-902", contact_email="contact@reliefindia.org", active_campaigns=3, verified=True),
            NGO(name="Disaster Aid Alliance", registration_number="NGO-IND-405", contact_email="info@disasteraid.org", active_campaigns=2, verified=True),
        ]
        db.add_all(demo)
        db.commit()
        ngos = db.query(NGO).all()

    data = [{"id": n.id, "name": n.name, "registration_number": n.registration_number, "contact_email": n.contact_email, "active_campaigns": n.active_campaigns, "verified": n.verified} for n in ngos]
    return api_response(success=True, message=f"Retrieved {len(data)} registered NGOs", data=data)

@router.get("/requests")
def get_relief_requests(db: Session = Depends(get_db)):
    requests = db.query(ReliefRequest).all()
    if not requests:
        demo = [
            ReliefRequest(ngo_name="Relief India Foundation", items_needed="Dry Rations & Tarpaulin Sheets", quantity=500, urgency="CRITICAL", status="PENDING"),
            ReliefRequest(ngo_name="Disaster Aid Alliance", items_needed="First Aid & Water Purification Tablets", quantity=1000, urgency="HIGH", status="FULFILLED"),
        ]
        db.add_all(demo)
        db.commit()
        requests = db.query(ReliefRequest).all()

    data = [{"id": r.id, "ngo_name": r.ngo_name, "items_needed": r.items_needed, "quantity": r.quantity, "urgency": r.urgency, "status": r.status} for r in requests]
    return api_response(success=True, message=f"Retrieved {len(data)} relief requests", data=data)

@router.post("/requests")
def create_relief_request(req: NGORequestCreate, db: Session = Depends(get_db)):
    rr = ReliefRequest(
        ngo_name="Relief NGO Partner",
        items_needed=req.items_needed,
        quantity=req.quantity,
        urgency=req.urgency,
        status="PENDING"
    )
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return api_response(success=True, message="Relief request submitted successfully", data={"id": rr.id, "items": rr.items_needed})

@router.get("/campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).all()
    if not campaigns:
        demo = [
            Campaign(title="Monsoon Flood Relief Fund", ngo_name="Relief India Foundation", target_amount=50000.0, raised_amount=32400.0, status="ACTIVE"),
            Campaign(title="Emergency Medical Supply Drive", ngo_name="Disaster Aid Alliance", target_amount=25000.0, raised_amount=18900.0, status="ACTIVE"),
        ]
        db.add_all(demo)
        db.commit()
        campaigns = db.query(Campaign).all()

    data = [{"id": c.id, "title": c.title, "ngo_name": c.ngo_name, "target_amount": c.target_amount, "raised_amount": c.raised_amount, "status": c.status} for c in campaigns]
    return api_response(success=True, message=f"Retrieved {len(data)} campaigns", data=data)

@router.post("/campaigns")
def create_campaign(req: CampaignCreate, db: Session = Depends(get_db)):
    c = Campaign(
        title=req.title,
        ngo_name="Relief NGO Partner",
        target_amount=req.target_amount,
        raised_amount=0.0,
        status="ACTIVE"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return api_response(success=True, message="Campaign created successfully", data={"id": c.id, "title": c.title})
