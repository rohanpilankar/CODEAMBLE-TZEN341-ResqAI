from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.services.analytics_service import AnalyticsService
from backend.auth.dependencies import require_roles
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Government Authority", "Admin"]))
):
    service = AnalyticsService(db)
    data = service.get_overview()
    return api_response(success=True, message="Analytics overview retrieved", data=data)
