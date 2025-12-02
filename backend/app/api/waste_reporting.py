import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.waste_report import WasteReport, WasteReportStatus
from app.schemas.waste_report import WasteReportRead
from app.services.waste_report_service import (
    create_waste_report,
    update_report_status,
)

router = APIRouter(prefix="/waste", tags=["waste_reporting"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads", "waste_reports")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Citizen: create waste report (with photo) endpoint

@router.post("/reports", response_model=WasteReportRead)
async def create_report(
    description: str = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # save file
    filename = image.filename or "waste.jpg"
    save_path = os.path.join(UPLOAD_DIR, filename)

    # ensure unique filename
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(save_path):
        filename = f"{base}_{counter}{ext}"
        save_path = os.path.join(UPLOAD_DIR, filename)
        counter += 1

    with open(save_path, "wb") as f:
        f.write(await image.read())

    # store relative path
    rel_path = os.path.relpath(save_path, os.path.dirname(os.path.dirname(__file__)))

    report = create_waste_report(
        db=db,
        reporter_id=current_user.id,
        image_path=rel_path,
        description=description,
        latitude=latitude,
        longitude=longitude,
    )

    return report

# Citizen: list my reports endpoint

@router.get("/reports/me", response_model=List[WasteReportRead])
def list_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    reports = (
        db.query(WasteReport)
        .filter(WasteReport.reporter_id == current_user.id)
        .order_by(WasteReport.created_at.desc())
        .all()
    )
    return reports

# Super Admin: list all reports (optionally filter by status) endpoint

@router.get("/reports", response_model=List[WasteReportRead])
def list_all_reports(
    status: Optional[WasteReportStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    q = db.query(WasteReport)
    if status:
        q = q.filter(WasteReport.status == status.value)
    reports = q.order_by(WasteReport.created_at.desc()).all()
    return reports

# Super Admin: update report status (assign worker, resolve) endpoint

from pydantic import BaseModel


class UpdateReportStatusBody(BaseModel):
    status: WasteReportStatus
    assigned_worker_id: Optional[int] = None


@router.patch("/reports/{report_id}/status", response_model=WasteReportRead)
def update_report_status_endpoint(
    report_id: int,
    body: UpdateReportStatusBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    try:
        report = update_report_status(
            db=db,
            report_id=report_id,
            new_status=body.status,
            assigned_worker_id=body.assigned_worker_id,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")

    return report
