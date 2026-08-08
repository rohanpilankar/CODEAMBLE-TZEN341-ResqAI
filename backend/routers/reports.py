from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.models.incident import Incident
from backend.utils.response import api_response
import csv
import io

router = APIRouter(prefix="/reports", tags=["Reports Center"])

@router.get("/export/csv")
def export_incidents_csv(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Disaster Type", "Severity", "Status", "Address", "Created At"])

    for inc in incidents:
        writer.writerow([inc.id, inc.title, inc.disaster_type, inc.severity, inc.status, inc.address, inc.created_at])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ResQAI_Incidents_Report.csv"}
    )

@router.get("/export/summary")
def get_report_summary(db: Session = Depends(get_db)):
    from backend.models.resource import Resource, RescueTeam
    from backend.models.shelter import Shelter

    total_inc = db.query(Incident).count()
    total_resources = db.query(Resource).count()
    total_teams = db.query(RescueTeam).count()
    total_shelters = db.query(Shelter).count()

    return api_response(
        success=True,
        message="Report summary statistics generated",
        data={
            "total_incidents": total_inc,
            "total_resources": total_resources,
            "total_rescue_teams": total_teams,
            "total_shelters": total_shelters,
            "generated_at": "2026-08-05T01:30:00Z"
        }
    )
