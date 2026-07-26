from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.schemas.analytics import AnalyticsOverviewResponse
from backend.services.analytics_service import AnalyticsService
from backend.auth.dependencies import require_roles
from backend.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["Government Authority", "Admin"]))):
    service = AnalyticsService(db)
    return service.get_overview()
