from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.models.resource import Vehicle
from backend.utils.response import api_response

router = APIRouter(prefix="/fleet", tags=["Vehicle Fleet"])

@router.get("/vehicles")
def list_fleet_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    if not vehicles:
        demo = [
            Vehicle(vehicle_number="AMB-101", vehicle_type="Ambulance", capacity=4, status="OPERATIONAL"),
            Vehicle(vehicle_number="FIRE-201", vehicle_type="Fire Truck", capacity=6, status="OPERATIONAL"),
            Vehicle(vehicle_number="BOAT-301", vehicle_type="Rescue Boat", capacity=8, status="OPERATIONAL"),
            Vehicle(vehicle_number="HELI-401", vehicle_type="Helicopter", capacity=5, status="STANDBY"),
        ]
        db.add_all(demo)
        db.commit()
        vehicles = db.query(Vehicle).all()

    data = [{"id": v.id, "vehicle_number": v.vehicle_number, "vehicle_type": v.vehicle_type, "capacity": v.capacity, "status": v.status} for v in vehicles]
    return api_response(success=True, message=f"Retrieved {len(data)} fleet vehicles", data=data)
