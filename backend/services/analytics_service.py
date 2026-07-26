from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.repositories.analytics_repository import AnalyticsRepository

class AnalyticsService:
    def __init__(self, db: Session):
        self.repo = AnalyticsRepository(db)

    def get_overview(self) -> Dict[str, Any]:
        return self.repo.get_overview_metrics()
