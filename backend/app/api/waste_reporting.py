# backend/app/api/waste_reporting.py

import os
import io
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.household import Household
from app.schemas.waste_report import WasteReportRead
from app.services.waste_report_service import (
    create_waste_report,
    update_report_status,
)

# -----------------------------------------------------------------------------
# Classification response model
# -----------------------------------------------------------------------------

class WasteClassificationResponse(BaseModel):
    id: str
    type: str
    description: Optional[str] = None
    recyclable: bool
    recycle_steps: Optional[List[str]] = None
    dispose_steps: Optional[List[str]] = None
    confidence: Optional[float] = None


# -----------------------------------------------------------------------------
# ML model loading
# -----------------------------------------------------------------------------

try:
    import torch
    import torchvision.transforms as T
    from PIL import Image
except Exception:
    torch = None
    T = None
    Image = None

try:
    import timm
except Exception:
    timm = None


MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml_models",
    "best_effnet_b4.pth",
)

CLASS_NAMES: List[str] = [
    "aerosol_cans", "aluminum_food_cans", "aluminum_soda_cans",
    "cardboard_boxes", "cardboard_packaging", "clothing",
    "coffee_grounds", "disposable_plastic_cutlery", "eggshells",
    "food_waste", "glass_beverage_bottles", "glass_cosmetic_containers",
    "glass_food_jars", "magazines", "newspaper", "office_paper",
    "paper_cups", "plastic_cup_lids", "plastic_detergent_bottles",
    "plastic_food_containers", "plastic_shopping_bags", "plastic_soda_bottles",
    "plastic_straws", "plastic_trash_bags", "plastic_water_bottles",
    "shoes", "steel_food_cans", "styrofoam_cups",
    "styrofoam_food_containers", "tea_bags",
]

# -----------------------------------------------------------------------------
# Metadata for classification
# -----------------------------------------------------------------------------

CLASS_METADATA: Dict[str, Dict[str, object]] = {
    # (Your entire metadata unchanged)
    # ........
}

# -----------------------------------------------------------------------------
# Classification helpers
# -----------------------------------------------------------------------------

def build_classification_response(label: str, confidence: float) -> WasteClassificationResponse:
    meta = CLASS_METADATA.get(label)
    if not meta:
        readable = label.replace("_", " ").title()
        return WasteClassificationResponse(
            id=label,
            type=readable,
            description=None,
            recyclable=False,
            recycle_steps=None,
            dispose_steps=[
                "Keep this item in the dry waste stream.",
                "Avoid mixing with wet/organic waste.",
                "Follow local municipal guidance for final disposal.",
            ],
            confidence=confidence,
        )

    return WasteClassificationResponse(
        id=label,
        type=str(meta.get("type")),
        description=meta.get("description") or None,
        recyclable=bool(meta.get("recyclable", False)),
        recycle_steps=meta.get("recycle_steps") or None,
        dispose_steps=meta.get("dispose_steps") or None,
        confidence=confidence,
    )


def fallback_response() -> WasteClassificationResponse:
    return build_classification_response("plastic_water_bottles", 0.75)


def classify_image_with_model(image_bytes: bytes) -> WasteClassificationResponse:
    if torch is None or T is None or Image is None:
        print("[ML] Torch/PIL unavailable — fallback.")
        return fallback_response()

    if not os.path.exists(MODEL_PATH):
        print(f"[ML] Model missing at {MODEL_PATH} — fallback.")
        return fallback_response()

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        print("[ML] Invalid image — fallback.")
        return fallback_response()

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        state = torch.load(MODEL_PATH, map_location=device)

        # Handle multiple checkpoint formats
        if isinstance(state, (torch.nn.Module, torch.jit.ScriptModule)):
            model = state
        elif isinstance(state, dict) and isinstance(state.get("model"), torch.nn.Module):
            model = state["model"]
        else:
            if timm is None:
                print("[ML] timm missing — fallback.")
                return fallback_response()

            model = timm.create_model(
                "tf_efficientnet_b4_ns",
                pretrained=False,
                num_classes=len(CLASS_NAMES),
            )

            if "model_state_dict" in state:
                state_dict = state["model_state_dict"]
            elif "state_dict" in state:
                state_dict = state["state_dict"]
            else:
                state_dict = state

            fixed_dict = {
                (k[len("module."):] if k.startswith("module.") else k): v
                for k, v in state_dict.items()
            }
            model.load_state_dict(fixed_dict, strict=False)

        model.to(device)
        model.eval()

        transform = T.Compose([
            T.Resize((380, 380)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        x = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            logits = model(x)
            if isinstance(logits, (list, tuple)):
                logits = logits[0]
            probs = torch.softmax(logits, dim=1)[0].cpu()

        idx = int(probs.argmax())
        confidence = float(probs[idx])
        label = CLASS_NAMES[idx]

        return build_classification_response(label, confidence)

    except Exception as e:
        print("[ML ERROR]", e)
        return fallback_response()


# -----------------------------------------------------------------------------
# ROUTER
# -----------------------------------------------------------------------------

router = APIRouter(prefix="/waste", tags=["waste_reporting"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "..", "uploads", "waste_reports",
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================================
# STATIC ROUTES FIRST (IMPORTANT!)
# ============================================================================

@router.get("/reports/available", response_model=List[WasteReportRead])
def list_available_reports_for_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Waste worker: list OPEN & unassigned reports."""
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Only waste workers can access this.")

    return (
        db.query(WasteReport)
        .filter(
            WasteReport.status == WasteReportStatus.OPEN.value,
            WasteReport.assigned_worker_id.is_(None),
        )
        .order_by(WasteReport.created_at.asc())
        .all()
    )


@router.get("/reports/assigned/me", response_model=List[WasteReportRead])
def list_reports_assigned_to_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Waste worker: reports assigned to the user."""
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Only waste workers can access this.")

    return (
        db.query(WasteReport)
        .filter(WasteReport.assigned_worker_id == current_user.id)
        .order_by(WasteReport.created_at.desc())
        .all()
    )


# ============================================================================
# CREATE REPORT (CITIZEN)
# ============================================================================

@router.post("/reports", response_model=WasteReportRead)
async def create_report(
    description: str = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: UploadFile = File(...),
    classification_id: Optional[str] = Form(None),
    household_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Citizen creates a waste report."""
    try:
        image_bytes = await image.read()
    except Exception:
        raise HTTPException(400, "Could not read image.")

    # Save file locally
    filename = image.filename or "waste.jpg"
    base, ext = os.path.splitext(filename)
    save_path = os.path.join(UPLOAD_DIR, filename)
    counter = 1

    while os.path.exists(save_path):
        filename = f"{base}_{counter}{ext}"
        save_path = os.path.join(UPLOAD_DIR, filename)
        counter += 1

    with open(save_path, "wb") as f:
        f.write(image_bytes)

    rel = os.path.relpath(save_path, os.path.dirname(os.path.dirname(__file__)))

    # AI classification
    classification = classify_image_with_model(image_bytes)

    # Household linking
    resolved_household_id = household_id

    if household_id:
        hh = db.query(Household).filter(Household.id == household_id).first()
        if not hh:
            raise HTTPException(404, "Household not found")
        if hh.owner_user_id != current_user.id:
            raise HTTPException(403, "Not authorized for this household")
    else:
        primary = (
            db.query(Household)
            .filter(Household.owner_user_id == current_user.id)
            .order_by(Household.created_at)
            .first()
        )
        if primary:
            resolved_household_id = primary.id

    return create_waste_report(
        db=db,
        reporter_id=current_user.id,
        image_path=rel,
        description=description,
        latitude=latitude,
        longitude=longitude,
        classification_label=classification.id,
        classification_confidence=classification.confidence,
        classification_recyclable=classification.recyclable,
        household_id=resolved_household_id,
    )


# ============================================================================
# CITIZEN: OWN REPORTS
# ============================================================================

@router.get("/reports/me", response_model=List[WasteReportRead])
def list_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return (
        db.query(WasteReport)
        .filter(WasteReport.reporter_id == current_user.id)
        .order_by(WasteReport.created_at.desc())
        .all()
    )


# ============================================================================
# DYNAMIC ROUTES BELOW ALL STATIC ONES
# ============================================================================

@router.get("/reports/{report_id}", response_model=WasteReportRead)
def get_single_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get a single report with role-based access control."""
    report = db.query(WasteReport).filter(WasteReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if current_user.role == UserRole.SUPER_ADMIN:
        return report

    if current_user.role == UserRole.WASTE_WORKER:
        if report.assigned_worker_id != current_user.id:
            raise HTTPException(403, "Not assigned to this report")
        return report

    if report.reporter_id != current_user.id:
        raise HTTPException(403, "Forbidden")

    return report


# ============================================================================
# SUPER ADMIN: LIST / UPDATE
# ============================================================================

@router.get("/reports", response_model=List[WasteReportRead])
def list_all_reports(
    status: Optional[WasteReportStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    q = db.query(WasteReport)
    if status:
        q = q.filter(WasteReport.status == status.value)
    return q.order_by(WasteReport.created_at.desc()).all()


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
        return update_report_status(
            db=db,
            report_id=report_id,
            new_status=body.status,
            assigned_worker_id=body.assigned_worker_id,
        )
    except ValueError:
        raise HTTPException(404, "Report not found")


# ============================================================================
# WORKER ACTIONS
# ============================================================================

@router.post("/reports/{report_id}/claim", response_model=WasteReportRead)
def worker_claim_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Workers only")

    report = db.query(WasteReport).filter(WasteReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if report.assigned_worker_id and report.assigned_worker_id != current_user.id:
        raise HTTPException(400, "Already assigned to another worker")

    if report.status != WasteReportStatus.OPEN.value:
        raise HTTPException(400, "Only OPEN reports may be claimed")

    report.assigned_worker_id = current_user.id
    report.status = WasteReportStatus.IN_PROGRESS.value

    db.commit()
    db.refresh(report)
    return report


class WorkerStatusUpdateBody(BaseModel):
    status: WasteReportStatus


@router.patch("/reports/{report_id}/worker-status", response_model=WasteReportRead)
def worker_update_report_status(
    report_id: int,
    body: WorkerStatusUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Workers only")

    report = db.query(WasteReport).filter(WasteReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if current_user.role == UserRole.WASTE_WORKER and report.assigned_worker_id != current_user.id:
        raise HTTPException(403, "Not assigned to this report")

    if body.status not in (WasteReportStatus.IN_PROGRESS, WasteReportStatus.RESOLVED):
        raise HTTPException(400, "Workers can only set IN_PROGRESS or RESOLVED")

    updated = update_report_status(
        db=db,
        report_id=report_id,
        new_status=body.status,
        assigned_worker_id=report.assigned_worker_id or current_user.id,
    )

    return updated


# ============================================================================
# CLASSIFY ONLY
# ============================================================================

@router.post("/classify", response_model=WasteClassificationResponse)
async def classify_endpoint(
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        raw = await image.read()
    except Exception:
        return fallback_response()

    return classify_image_with_model(raw)
