# backend/app/api/waste_reporting.py

import io
import json
import os
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api import deps
from app.models.user import User, UserRole
from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.household import Household
from app.schemas.waste_classes import (
    GUIDANCE_LOW_CONFIDENCE_THRESHOLD,
    WASTE_CLASS_IDS,
    get_waste_guidance,
)
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
    display_name: Optional[str] = None
    description: Optional[str] = None
    recyclable: bool
    stream: Optional[str] = None
    recycle_steps: Optional[List[str]] = None
    dispose_steps: Optional[List[str]] = None
    do_not: Optional[List[str]] = None
    where_to_take: Optional[List[str]] = None
    guidance_source: Optional[str] = None
    low_confidence_threshold: float = GUIDANCE_LOW_CONFIDENCE_THRESHOLD
    confidence: Optional[float] = None
    model_version: Optional[str] = None
    alternatives: Optional[List["WasteClassificationCandidate"]] = None


class WasteClassificationCandidate(BaseModel):
    id: str
    confidence: float
    display_name: Optional[str] = None
    recyclable: bool
    stream: Optional[str] = None
    recycle_steps: Optional[List[str]] = None
    dispose_steps: Optional[List[str]] = None
    do_not: Optional[List[str]] = None
    where_to_take: Optional[List[str]] = None
    guidance_source: Optional[str] = None
    low_confidence_threshold: float = GUIDANCE_LOW_CONFIDENCE_THRESHOLD


# -----------------------------------------------------------------------------
# ML model loading
# -----------------------------------------------------------------------------

try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as T
    from PIL import Image
except Exception:
    torch = None
    nn = None
    T = None
    Image = None

try:
    import timm
except Exception:
    timm = None


CLASS_NAMES: List[str] = list(WASTE_CLASS_IDS)


def _resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path

    cwd_path = Path.cwd() / path
    if cwd_path.exists():
        return cwd_path

    project_root = Path(__file__).resolve().parents[3]
    return project_root / path


def _parse_csv_floats(raw: str, *, expected: int) -> list[float]:
    vals = [x.strip() for x in str(raw).split(",") if x.strip()]
    if len(vals) != expected:
        raise ValueError(f"Expected {expected} values, got {len(vals)}")
    return [float(v) for v in vals]


def load_class_names_from_map(path: Path) -> list[str]:
    raw = json.loads(path.read_text(encoding="utf-8"))

    if isinstance(raw, dict):
        # Most training exports use class_to_idx: {"label": idx}
        if all(isinstance(v, int) for v in raw.values()):
            ordered = sorted(raw.items(), key=lambda item: item[1])
            names = [str(label).strip() for label, _ in ordered]
        else:
            # Also support idx_to_class: {"0": "label"} / {0: "label"}
            by_idx: list[tuple[int, str]] = []
            for k, v in raw.items():
                idx = int(k)
                label = str(v).strip()
                by_idx.append((idx, label))
            names = [label for _, label in sorted(by_idx, key=lambda item: item[0])]
    elif isinstance(raw, list):
        names = [str(x).strip() for x in raw]
    else:
        raise ValueError("Unsupported class map format")

    if not names or any(not n for n in names):
        raise ValueError("Class map contains empty labels")
    if len(set(names)) != len(names):
        raise ValueError("Class map contains duplicate labels")
    return names


def _extract_state_dict(state: Any) -> Any:
    if isinstance(state, dict):
        if "model_state" in state:
            return state["model_state"]
        if "model_state_dict" in state:
            return state["model_state_dict"]
        if "state_dict" in state:
            return state["state_dict"]
    return state


class _PrakritiConvNeXt(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        if timm is None:
            raise RuntimeError("timm missing")

        self.backbone = timm.create_model(
            "convnext_tiny",
            pretrained=False,
            num_classes=0,
        )
        # Matches checkpoint key layout: head.2, head.4, head.6, head.8.
        self.head = nn.Sequential(
            nn.Identity(),      # 0
            nn.Dropout(0.2),    # 1
            nn.BatchNorm1d(768),  # 2
            nn.ReLU(inplace=True),  # 3
            nn.Linear(768, 512),  # 4
            nn.Dropout(0.2),    # 5
            nn.BatchNorm1d(512),  # 6
            nn.ReLU(inplace=True),  # 7
            nn.Linear(512, num_classes),  # 8
        )

    def forward(self, x):
        feats = self.backbone(x)
        return self.head(feats)


def _build_model(*, arch: str, num_classes: int):
    if timm is None:
        raise RuntimeError("timm missing")

    arch_key = str(arch or "").strip().lower()

    if arch_key == "convnext_tiny":
        return timm.create_model(
            "convnext_tiny",
            pretrained=False,
            num_classes=num_classes,
        )

    if arch_key in {"efficientnetv2", "efficientnetv2_s", "effnetv2", "tf_efficientnetv2_s"}:
        return timm.create_model(
            "tf_efficientnetv2_s",
            pretrained=False,
            num_classes=num_classes,
        )

    raise ValueError(f"Unsupported ML_MODEL_ARCH={arch}")


def _is_prakriti_wrapper_state(state_dict: dict[str, Any]) -> bool:
    keys = set(state_dict.keys())
    return any(k.startswith("backbone.") for k in keys) and any(k.startswith("head.") for k in keys)

# -----------------------------------------------------------------------------
# Classification helpers
# -----------------------------------------------------------------------------

def build_classification_response(label: str, confidence: float) -> WasteClassificationResponse:
    meta = get_waste_guidance(label)
    display_name = str(meta.get("display_name") or label.replace("_", " ").title())
    return WasteClassificationResponse(
        id=label,
        type=display_name,
        display_name=display_name,
        description=meta.get("description") or None,
        recyclable=bool(meta.get("recyclable", False)),
        stream=meta.get("stream") or None,
        recycle_steps=meta.get("recycle_steps") or None,
        dispose_steps=meta.get("dispose_steps") or None,
        do_not=meta.get("do_not") or None,
        where_to_take=meta.get("where_to_take") or None,
        guidance_source=str(meta.get("guidance_source") or "fallback"),
        low_confidence_threshold=float(meta.get("low_confidence_threshold") or settings.ML_CONF_THRESHOLD),
        confidence=confidence,
        model_version=settings.ML_MODEL_VERSION,
    )


def _build_candidate(label: str, confidence: float) -> WasteClassificationCandidate:
    meta = get_waste_guidance(label)
    display_name = str(meta.get("display_name") or label.replace("_", " ").title())
    return WasteClassificationCandidate(
        id=label,
        confidence=max(0.0, min(1.0, confidence)),
        display_name=display_name,
        recyclable=bool(meta.get("recyclable", False)),
        stream=meta.get("stream") or None,
        recycle_steps=meta.get("recycle_steps") or None,
        dispose_steps=meta.get("dispose_steps") or None,
        do_not=meta.get("do_not") or None,
        where_to_take=meta.get("where_to_take") or None,
        guidance_source=str(meta.get("guidance_source") or "fallback"),
        low_confidence_threshold=float(meta.get("low_confidence_threshold") or settings.ML_CONF_THRESHOLD),
    )


def fallback_response() -> WasteClassificationResponse:
    return build_classification_response("plastic_water_bottles", 0.75)


def classify_image_with_model(image_bytes: bytes) -> WasteClassificationResponse:
    if torch is None or T is None or Image is None:
        print("[ML] Torch/PIL unavailable — fallback.")
        return fallback_response()

    model_path = _resolve_path(settings.ML_MODEL_PATH)
    class_map_path = _resolve_path(settings.ML_CLASS_MAP_PATH)

    if not model_path.exists():
        print(f"[ML] Model missing at {model_path} — fallback.")
        return fallback_response()

    if not class_map_path.exists():
        print(f"[ML] Class-map missing at {class_map_path} — fallback.")
        return fallback_response()

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        print("[ML] Invalid image — fallback.")
        return fallback_response()

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        class_names = load_class_names_from_map(class_map_path)
        if set(class_names) != set(WASTE_CLASS_IDS):
            print("[ML] Class-map labels do not match WASTE_CLASS_IDS — fallback.")
            return fallback_response()

        state = torch.load(model_path, map_location=device)
        if isinstance(state, (torch.nn.Module, torch.jit.ScriptModule)):
            model = state
        elif isinstance(state, dict) and isinstance(state.get("model"), torch.nn.Module):
            model = state["model"]
        else:
            state_dict = _extract_state_dict(state)
            if not isinstance(state_dict, dict):
                print("[ML] Unsupported checkpoint state dict type — fallback.")
                return fallback_response()

            if _is_prakriti_wrapper_state(state_dict):
                if nn is None:
                    print("[ML] torch.nn unavailable — fallback.")
                    return fallback_response()
                model = _PrakritiConvNeXt(num_classes=len(class_names))
            else:
                model = _build_model(
                    arch=settings.ML_MODEL_ARCH,
                    num_classes=len(class_names),
                )

            fixed_dict = {
                (k[len("module."):] if k.startswith("module.") else k): v
                for k, v in state_dict.items()
            }
            load_result = model.load_state_dict(fixed_dict, strict=False)
            matched_count = len(fixed_dict) - len(load_result.unexpected_keys)
            # Guardrail: low match ratio usually means wrong architecture/keys.
            if len(fixed_dict) == 0 or matched_count / max(1, len(fixed_dict)) < 0.90:
                print("[ML] Low checkpoint key match ratio — fallback.")
                return fallback_response()

        model.to(device)
        model.eval()

        mean = _parse_csv_floats(settings.ML_MEAN, expected=3)
        std = _parse_csv_floats(settings.ML_STD, expected=3)
        transform = T.Compose(
            [
                T.Resize((settings.ML_INPUT_SIZE, settings.ML_INPUT_SIZE)),
                T.ToTensor(),
                T.Normalize(mean=mean, std=std),
            ]
        )

        x = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            logits = model(x)
            if isinstance(logits, (list, tuple)):
                logits = logits[0]
            probs = torch.softmax(logits, dim=1)[0].cpu()

        idx = int(probs.argmax())
        confidence = max(0.0, min(1.0, float(probs[idx])))
        label = class_names[idx]
        # Expose near alternatives so users can override a wrong top-1 prediction.
        prob_vals = probs.tolist()
        ranked = sorted(enumerate(prob_vals), key=lambda x: x[1], reverse=True)
        alternatives = [
            _build_candidate(class_names[i], float(p))
            for i, p in ranked[:5]
        ]

        out = build_classification_response(label, confidence)
        out.alternatives = alternatives
        return out

    except Exception as e:
        print("[ML ERROR]", e)
        return fallback_response()


# -----------------------------------------------------------------------------
# ROUTER
# -----------------------------------------------------------------------------

router = APIRouter(prefix="/waste", tags=["waste_reporting"])

UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, "waste_reports")
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
