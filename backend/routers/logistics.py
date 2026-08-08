from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.models.resource import Warehouse, ResourceTransfer
from backend.utils.response import api_response

router = APIRouter(prefix="/logistics", tags=["Warehouse & Logistics"])

@router.get("/warehouses")
def get_warehouses(db: Session = Depends(get_db)):
    warehouses = db.query(Warehouse).all()
    if not warehouses:
        demo = [
            Warehouse(name="Central Relief Depot", location="Dharavi Sector 4", capacity=5000, manager_name="Inspector R. Verma"),
            Warehouse(name="North Suburb Logistics Hub", location="Malad West", capacity=3000, manager_name="Capt. A. Deshmukh"),
        ]
        db.add_all(demo)
        db.commit()
        warehouses = db.query(Warehouse).all()

    data = [{"id": w.id, "name": w.name, "location": w.location, "capacity": w.capacity, "manager_name": w.manager_name} for w in warehouses]
    return api_response(success=True, message=f"Retrieved {len(data)} warehouses", data=data)

@router.get("/transfers")
def get_transfers(db: Session = Depends(get_db)):
    transfers = db.query(ResourceTransfer).all()
    data = [{"id": t.id, "resource_id": t.resource_id, "from_location": t.from_location, "to_location": t.to_location, "quantity": t.quantity, "status": t.status, "transferred_at": t.transferred_at.isoformat()} for t in transfers]
    return api_response(success=True, message=f"Retrieved {len(data)} supply transfers", data=data)
