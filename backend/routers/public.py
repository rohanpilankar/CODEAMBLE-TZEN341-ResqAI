from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.database.session import get_db
from backend.models.public import NewsArticle, ContactMessage
from backend.models.emergency import EmergencyContact
from backend.schemas.public import NewsArticleResponse, ContactMessageCreate, ContactMessageResponse
from backend.utils.response import api_response

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/news", response_model=dict)
def get_news(db: Session = Depends(get_db)):
    articles = db.query(NewsArticle).filter(NewsArticle.is_published == 1).order_by(NewsArticle.published_at.desc()).all()
    # Serialize for standard response
    data = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "author": a.author,
            "published_at": a.published_at.isoformat()
        } for a in articles
    ]
    return api_response(success=True, message="News retrieved", data=data)

@router.post("/contact", response_model=dict)
def submit_contact(req: ContactMessageCreate, db: Session = Depends(get_db)):
    msg = ContactMessage(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        message=req.message
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return api_response(success=True, message="Message received successfully", data={"id": msg.id})

@router.get("/emergency-contacts", response_model=dict)
def get_emergency_contacts(db: Session = Depends(get_db)):
    contacts = db.query(EmergencyContact).filter(EmergencyContact.is_active == 1).all()
    data = [
        {
            "id": c.id,
            "agency_name": c.agency_name,
            "category": c.category,
            "phone_number": c.phone_number,
            "location": c.location
        } for c in contacts
    ]
    return api_response(success=True, message="Emergency contacts retrieved", data=data)

import urllib.request
import json
from backend.config import settings

@router.get("/weather", response_model=dict)
def get_weather_advisory(lat: float = 19.0760, lng: float = 72.8777):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m"

        
        req = urllib.request.Request(url, headers={'User-Agent': 'ResQAI/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            wdata = json.loads(resp.read().decode('utf-8'))
            curr = wdata.get("current", {})
            data = {
                "location": "Regional Command Area",
                "temperature_c": curr.get("temperature_2m", 28.5),
                "condition": f"WMO Code {curr.get('weathercode', 0)}",
                "wind_speed_kmh": curr.get("windspeed_10m", 42.0),
                "humidity_pct": curr.get("relative_humidity_2m", 89),
                "precipitation_mm": curr.get("precipitation", 0.0),
                "alert_level": "WARNING" if curr.get("precipitation", 0) > 30 or curr.get("windspeed_10m", 0) > 40 else "NORMAL",
                "advisory": "Live Open-Meteo weather integrated."
            }
            return api_response(success=True, message="Weather advisory retrieved from Open-Meteo", data=data)
    except Exception as e:
        data = {
            "location": "Regional Command Area",
            "temperature_c": 28.5,
            "condition": "Heavy Rainfall & High Wind Warning",
            "wind_speed_kmh": 42.0,
            "humidity_pct": 89,
            "alert_level": "WARNING",
            "advisory": f"Fallback mode active. Error fetching Open-Meteo data: {str(e)}"
        }
        return api_response(success=True, message="Weather advisory retrieved (fallback)", data=data)


