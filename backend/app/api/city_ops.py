from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.facility import Facility
from app.models.waste_report import WasteReport
from app.models.household import SegregationLog
from app.models.carbon import CarbonActivity

router = APIRouter(prefix="/city", tags=["city_ops"])

# endpoint

@router.get("/metrics")
def get_city_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(deps.require_super_admin),
):
    return {
        "users_total": db.query(User).count(),
        "facilities_total": db.query(Facility).count(),
        "waste_reports_open": db.query(WasteReport).filter(WasteReport.status == "OPEN").count(),
        "waste_reports_resolved": db.query(WasteReport).filter(WasteReport.status == "RESOLVED").count(),
        "carbon_activities_total": db.query(CarbonActivity).count(),
        "segregation_logs_total": db.query(SegregationLog).count(),
    }
