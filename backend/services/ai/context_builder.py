from typing import Dict, Any, List, Optional
import math
from backend.database.session import SessionLocal
from backend.models.shelter import Shelter, Hospital, MedicalFacility
from backend.models.emergency import EmergencyContact
from backend.models.incident import Incident
from backend.utils.logger import app_logger

class ContextBuilder:
    """Encapsulates all Database Queries for AI Prompt Context Assembly.
    Strict Rule: AI Providers NEVER touch DB directly; all DB fetching happens here.
    """

    @staticmethod
    def _calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate approximate distance in KM using Haversine formula."""
        if not lat1 or not lng1 or not lat2 or not lng2:
            return 999.0
        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    def build_context(self, user_lat: Optional[float] = 19.0760, user_lng: Optional[float] = 72.8777) -> Dict[str, Any]:
        """Fetch active shelters, alerts, emergency contacts, hospitals, fire stations, and police stations."""
        db = SessionLocal()
        try:
            # 1. Active Shelters
            raw_shelters = db.query(Shelter).filter(Shelter.is_active == True).all()
            shelters = []
            for s in raw_shelters:
                dist = self._calculate_distance(user_lat, user_lng, s.latitude, s.longitude)
                avail_beds = max(0, (s.total_capacity or 100) - (s.current_occupancy or 0))
                shelters.append({
                    "id": s.id,
                    "name": s.name,
                    "address": s.address,
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "contact_phone": s.contact_phone or "+91-1800-RESQAI",
                    "total_capacity": s.total_capacity,
                    "current_occupancy": s.current_occupancy,
                    "available_beds": avail_beds,
                    "status": "OPEN" if avail_beds > 0 else "FULL",
                    "distance_km": dist,
                    "medical_available": bool(s.medical_available),
                    "food_available": bool(s.food_available),
                    "water_available": bool(s.water_available)
                })
            # Sort by distance
            shelters.sort(key=lambda x: x["distance_km"])

            # 2. Disaster Alerts / Active Critical Incidents
            raw_incidents = db.query(Incident).filter(Incident.status.in_(["REPORTED", "VERIFIED", "IN_PROGRESS"])).all()
            alerts = []
            for inc in raw_incidents[:5]:
                alerts.append({
                    "id": inc.id,
                    "title": inc.title,
                    "disaster_type": inc.disaster_type,
                    "severity": inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity),
                    "status": inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                    "address": inc.address or "Nearby Location"
                })

            # 3. Emergency Contacts
            raw_contacts = db.query(EmergencyContact).filter(EmergencyContact.is_active == 1).all()
            contacts = []
            police_list = []
            fire_list = []
            for c in raw_contacts:
                c_item = {
                    "id": c.id,
                    "agency_name": c.agency_name,
                    "category": c.category,
                    "phone_number": c.phone_number,
                    "location": c.location or "City Wide"
                }
                contacts.append(c_item)
                if "police" in c.category.lower():
                    police_list.append(c_item)
                elif "fire" in c.category.lower():
                    fire_list.append(c_item)

            # Default police/fire if empty
            if not police_list:
                police_list.append({"agency_name": "Emergency Police Dept", "category": "Police", "phone_number": "100", "location": "City Headquarters"})
            if not fire_list:
                fire_list.append({"agency_name": "Fire & Rescue Brigade", "category": "Fire", "phone_number": "101", "location": "Central Fire Station"})

            # 4. Hospitals
            raw_hospitals = db.query(Hospital).all()
            hospitals = []
            for h in raw_hospitals:
                hospitals.append({
                    "id": h.id,
                    "name": h.name,
                    "address": h.address,
                    "phone": h.phone_number or "108",
                    "icu_beds": h.icu_beds,
                    "available_beds": max(0, h.total_beds - h.occupied_beds)
                })

            if not hospitals:
                hospitals.append({
                    "id": 1,
                    "name": "Central Emergency Trauma Hospital",
                    "address": "Civic Hospital Campus, City Center",
                    "phone": "108",
                    "available_beds": 35
                })

            return {
                "shelters": shelters,
                "alerts": alerts,
                "hospitals": hospitals,
                "contacts": contacts,
                "fireStations": fire_list,
                "policeStations": police_list
            }

        except Exception as e:
            app_logger.error(f"ContextBuilder Error: {e}")
            return {
                "shelters": [],
                "alerts": [],
                "hospitals": [],
                "contacts": [
                    {"agency_name": "Emergency Police", "category": "Police", "phone_number": "100"},
                    {"agency_name": "Fire Brigade", "category": "Fire", "phone_number": "101"},
                    {"agency_name": "Ambulance", "category": "Ambulance", "phone_number": "108"}
                ],
                "fireStations": [],
                "policeStations": []
            }
        finally:
            db.close()
