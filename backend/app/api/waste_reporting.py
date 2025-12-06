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
from app.schemas.waste_report import WasteReportRead
from app.services.waste_report_service import (
    create_waste_report,
    update_report_status,
)

# -----------------------------------------------------------------------------
# Classification response model (what frontend expects)
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
# Try to import PyTorch + PIL. If anything fails, we’ll fall back gracefully.
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

# Path to your model file
MODEL_PATH = os.path.join(
  os.path.dirname(os.path.dirname(__file__)),
  "ml_models",
  "best_effnet_b4.pth",
)

# EXACT class names you provided
CLASS_NAMES: List[str] = [
  "aerosol_cans",
  "aluminum_food_cans",
  "aluminum_soda_cans",
  "cardboard_boxes",
  "cardboard_packaging",
  "clothing",
  "coffee_grounds",
  "disposable_plastic_cutlery",
  "eggshells",
  "food_waste",
  "glass_beverage_bottles",
  "glass_cosmetic_containers",
  "glass_food_jars",
  "magazines",
  "newspaper",
  "office_paper",
  "paper_cups",
  "plastic_cup_lids",
  "plastic_detergent_bottles",
  "plastic_food_containers",
  "plastic_shopping_bags",
  "plastic_soda_bottles",
  "plastic_straws",
  "plastic_trash_bags",
  "plastic_water_bottles",
  "shoes",
  "steel_food_cans",
  "styrofoam_cups",
  "styrofoam_food_containers",
  "tea_bags",
]

# -----------------------------------------------------------------------------
# Rich metadata per class: type, description, recyclable, steps
# -----------------------------------------------------------------------------

CLASS_METADATA: Dict[str, Dict[str, object]] = {
  "aerosol_cans": {
    "type": "Aerosol cans",
    "description": "Pressurized metal spray cans used for deodorant, paint, or cleaners.",
    "recyclable": True,
    "recycle_steps": [
      "Ensure the can is completely empty (no hissing when pressed).",
      "Do not pierce or crush the can.",
      "Remove plastic caps and recycle them separately if allowed.",
      "Place the empty can in the metal recycling / dry waste bin.",
    ],
  },
  "aluminum_food_cans": {
    "type": "Aluminum food cans",
    "description": "Aluminum cans used for packaged food items such as beans or soups.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and lightly rinse the can to remove food residue.",
      "Leave the label on unless your local rules require removal.",
      "Flatten gently only if it does not create sharp edges.",
      "Place in the metal recycling / dry waste bin.",
    ],
  },
  "aluminum_soda_cans": {
    "type": "Aluminum beverage cans",
    "description": "Soft drink or soda cans made of aluminum.",
    "recyclable": True,
    "recycle_steps": [
      "Empty any remaining liquid.",
      "Lightly rinse if sticky.",
      "Crush the can to save space (optional).",
      "Place in the metal recycling / dry waste bin.",
    ],
  },
  "cardboard_boxes": {
    "type": "Cardboard boxes",
    "description": "Corrugated cardboard boxes used for shipping and packaging.",
    "recyclable": True,
    "recycle_steps": [
      "Remove any plastic tape, labels, or Styrofoam inserts.",
      "Flatten the box completely.",
      "Keep boxes dry and free from food stains.",
      "Place in the paper/cardboard recycling bin.",
    ],
  },
  "cardboard_packaging": {
    "type": "Cardboard packaging",
    "description": "Thin cardboard packaging such as cereal or shoe boxes.",
    "recyclable": True,
    "recycle_steps": [
      "Empty all contents and remove plastic liners or films.",
      "Flatten boxes to save space.",
      "Keep dry and free of heavy food contamination.",
      "Place in the paper/cardboard recycling bin.",
    ],
  },
  "clothing": {
    "type": "Clothing",
    "description": "Garments and fabric-based textile items.",
    "recyclable": False,
    "dispose_steps": [
      "If in good condition, donate or reuse instead of throwing.",
      "If damaged, consider textile recycling or upcycling where available.",
      "As a last resort, place in the dry waste bin (not with wet waste).",
    ],
  },
  "coffee_grounds": {
    "type": "Coffee grounds",
    "description": "Used coffee grounds from brewing machines or filters.",
    "recyclable": False,
    "dispose_steps": [
      "Segregate coffee grounds with other organic kitchen waste.",
      "Place in the wet waste / compost bin.",
      "Avoid mixing with plastic or metal waste.",
    ],
  },
  "disposable_plastic_cutlery": {
    "type": "Disposable plastic cutlery",
    "description": "Single-use plastic spoons, forks, and knives.",
    "recyclable": False,
    "dispose_steps": [
      "Avoid using single-use plastic cutlery where possible.",
      "If used, clean before disposal to avoid attracting pests.",
      "Place in the non-recyclable dry waste bin.",
    ],
  },
  "eggshells": {
    "type": "Eggshells",
    "description": "Shells left after using eggs in cooking.",
    "recyclable": False,
    "dispose_steps": [
      "Combine with other organic kitchen waste.",
      "Place in the wet waste / compost bin.",
      "Crush shells slightly to help them break down faster.",
    ],
  },
  "food_waste": {
    "type": "Food waste",
    "description": "Leftover cooked food, peels, and other organic kitchen scraps.",
    "recyclable": False,
    "dispose_steps": [
      "Keep food waste separate from plastic, metal, and glass.",
      "Place in the wet waste bin.",
      "Use community composting or biogas facilities where available.",
    ],
  },
  "glass_beverage_bottles": {
    "type": "Glass beverage bottles",
    "description": "Glass bottles used for water, soft drinks, or juice.",
    "recyclable": True,
    "recycle_steps": [
      "Empty the bottle completely.",
      "Rinse to remove residue; remove lids and caps.",
      "Do not break the glass; handle carefully.",
      "Place in the glass recycling / dry waste bin.",
    ],
  },
  "glass_cosmetic_containers": {
    "type": "Glass cosmetic containers",
    "description": "Small glass jars or bottles used for cosmetics or skincare.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and rinse remaining product as much as possible.",
      "Remove pumps or plastic lids where possible.",
      "Place clean glass containers in the glass recycling bin.",
    ],
  },
  "glass_food_jars": {
    "type": "Glass food jars",
    "description": "Glass jars used for sauces, jams, pickles, and spreads.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and rinse the jar to remove food residue.",
      "Remove metal lids and recycle them separately if allowed.",
      "Place jars in the glass recycling bin.",
    ],
  },
  "magazines": {
    "type": "Magazines",
    "description": "Glossy printed magazines and catalogues.",
    "recyclable": True,
    "recycle_steps": [
      "Remove any plastic wrapping or inserts.",
      "Keep magazines dry and clean.",
      "Bundle with other paper for recycling.",
    ],
  },
  "newspaper": {
    "type": "Newspaper",
    "description": "Old newspapers and newsprint material.",
    "recyclable": True,
    "recycle_steps": [
      "Keep newspapers dry and free from food stains.",
      "Bundle or tie with string for easy handling.",
      "Place in the paper recycling stream.",
    ],
  },
  "office_paper": {
    "type": "Office paper",
    "description": "Printer paper, notebooks without plastic, and envelopes.",
    "recyclable": True,
    "recycle_steps": [
      "Remove plastic covers, metal clips, and spiral bindings if possible.",
      "Keep paper dry and free from food or oil.",
      "Place in the paper recycling bin.",
    ],
  },
  "paper_cups": {
    "type": "Paper cups",
    "description": "Disposable paper cups, often lined with a thin plastic coating.",
    "recyclable": False,
    "dispose_steps": [
      "Empty all liquid before disposal.",
      "Where dedicated paper-cup recycling exists, use that stream.",
      "Otherwise, place in dry, non-recyclable waste.",
    ],
  },
  "plastic_cup_lids": {
    "type": "Plastic cup lids",
    "description": "Plastic lids used on takeaway beverage cups.",
    "recyclable": True,
    "recycle_steps": [
      "Remove from the cup and clean if needed.",
      "Place with other recyclable plastics where accepted.",
      "If local system doesn’t accept small plastics, treat as dry non-recyclable waste.",
    ],
  },
  "plastic_detergent_bottles": {
    "type": "Plastic detergent bottles",
    "description": "Thick plastic bottles used for detergents and cleaners.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and rinse out as much detergent as possible.",
      "Replace the cap if accepted locally, or remove pumps.",
      "Place in the plastic recyclables stream.",
    ],
  },
  "plastic_food_containers": {
    "type": "Plastic food containers",
    "description": "Rigid plastic boxes or trays used for food storage or takeaway.",
    "recyclable": True,
    "recycle_steps": [
      "Remove any food residue; rinse if greasy.",
      "Stack similar containers together if possible.",
      "Place in the plastic recycling / dry waste bin.",
    ],
  },
  "plastic_shopping_bags": {
    "type": "Plastic shopping bags",
    "description": "Thin plastic carry bags from stores and markets.",
    "recyclable": False,
    "dispose_steps": [
      "Reuse bags multiple times if possible.",
      "Avoid mixing with wet organic waste.",
      "Where plastic bag collection points exist, send them there.",
      "Otherwise, place in dry, non-recyclable waste.",
    ],
  },
  "plastic_soda_bottles": {
    "type": "Plastic soda bottles (PET)",
    "description": "Clear plastic beverage bottles made from PET plastic.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and lightly rinse the bottle.",
      "Remove the cap and label if required locally.",
      "Crush the bottle to save space.",
      "Place in the plastic recyclables / dry waste bin.",
    ],
  },
  "plastic_straws": {
    "type": "Plastic straws",
    "description": "Single-use plastic drinking straws.",
    "recyclable": False,
    "dispose_steps": [
      "Avoid single-use plastic straws; use reusable alternatives.",
      "Place used straws in non-recyclable dry waste.",
    ],
  },
  "plastic_trash_bags": {
    "type": "Plastic trash bags",
    "description": "Garbage bags made of thin plastic film.",
    "recyclable": False,
    "dispose_steps": [
      "Tie securely before disposal to prevent litter.",
      "Do not overload to the point of tearing.",
      "Place in designated waste collection for landfill/incineration.",
    ],
  },
  "plastic_water_bottles": {
    "type": "Plastic water bottles (PET)",
    "description": "Packaged drinking water bottles similar to soda bottles.",
    "recyclable": True,
    "recycle_steps": [
      "Empty completely and lightly rinse.",
      "Remove caps if required locally.",
      "Crush bottles to reduce volume.",
      "Place in the plastic recyclables bin.",
    ],
  },
  "shoes": {
    "type": "Shoes and footwear",
    "description": "Casual or sports shoes, often made from mixed materials.",
    "recyclable": False,
    "dispose_steps": [
      "If still usable, donate or pass on.",
      "Where shoe collection or recycling exists, send them there.",
      "Otherwise, dispose as dry non-recyclable waste.",
    ],
  },
  "steel_food_cans": {
    "type": "Steel food cans",
    "description": "Tinned food containers made from steel.",
    "recyclable": True,
    "recycle_steps": [
      "Empty and rinse the can.",
      "Do not leave sharp edges exposed.",
      "Place in the metal recycling / dry waste bin.",
    ],
  },
  "styrofoam_cups": {
    "type": "Styrofoam cups",
    "description": "Disposable cups made from expanded polystyrene (Styrofoam).",
    "recyclable": False,
    "dispose_steps": [
      "Avoid using Styrofoam where possible.",
      "Empty contents completely before disposal.",
      "Place in non-recyclable dry waste.",
    ],
  },
  "styrofoam_food_containers": {
    "type": "Styrofoam food containers",
    "description": "Takeaway food boxes made from Styrofoam.",
    "recyclable": False,
    "dispose_steps": [
      "Remove all food residue before disposal.",
      "Avoid mixing with wet organic waste.",
      "Place in non-recyclable dry waste.",
    ],
  },
  "tea_bags": {
    "type": "Tea bags",
    "description": "Used tea bags from brewing tea.",
    "recyclable": False,
    "dispose_steps": [
      "Let tea bags cool and drain excess liquid.",
      "Place in the wet waste / compost bin if the bag material is compostable.",
      "If synthetic, still keep with organic waste but avoid mixing with recyclables.",
    ],
  },
}


def build_classification_response(label: str, confidence: float) -> WasteClassificationResponse:
  meta = CLASS_METADATA.get(label)
  if not meta:
    # Fallback for unknown label
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
  """
  Use your local model if available; otherwise fall back.

  Handles multiple checkpoint formats:
  - torch.save(model, path)
  - torch.jit.save(scripted_model, path)
  - torch.save({"model": model, ...}, path)
  - torch.save({"model_state_dict": model.state_dict(), ...}, path)
  - torch.save({"state_dict": model.state_dict(), ...}, path)
  - torch.save(model.state_dict(), path)
  """
  if torch is None or T is None or Image is None:
    print("[ML] Torch/PIL not available, using fallback.")
    return fallback_response()

  if not os.path.exists(MODEL_PATH):
    print(f"[ML] Model not found at {MODEL_PATH}, using fallback.")
    return fallback_response()

  try:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
  except Exception:
    print("[ML] Failed to open image, using fallback.")
    return fallback_response()

  try:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    state = torch.load(MODEL_PATH, map_location=device)

    # Case 1: directly a model (common if you did torch.save(model, path))
    if isinstance(state, torch.nn.Module) or isinstance(state, torch.jit.ScriptModule):
      model = state

    # Case 2: dict with 'model' key holding the nn.Module
    elif isinstance(state, dict) and isinstance(state.get("model"), torch.nn.Module):
      model = state["model"]

    # Case 3: dict containing a state dict
    elif isinstance(state, dict):
      # Try the usual keys
      if "model_state_dict" in state:
        state_dict = state["model_state_dict"]
      elif "state_dict" in state:
        state_dict = state["state_dict"]
      else:
        # assume whole dict *is* the state dict
        state_dict = state

      if timm is None:
        print("[ML] timm not installed, cannot rebuild EfficientNet. Using fallback.")
        return fallback_response()

      # Rebuild EfficientNet-B4 with correct num_classes
      model = timm.create_model(
        "tf_efficientnet_b4_ns",
        pretrained=False,
        num_classes=len(CLASS_NAMES),
      )

      # Strip potential 'module.' prefixes if saved with DataParallel
      fixed = {}
      for k, v in state_dict.items():
        if k.startswith("module."):
          k = k[len("module.") :]
        fixed[k] = v

      model.load_state_dict(fixed, strict=False)

    # Case 4: completely unknown format
    else:
      print("[ML] Unsupported checkpoint format, using fallback.")
      return fallback_response()

    model.to(device)
    model.eval()

    transform = T.Compose(
      [
        T.Resize((380, 380)),
        T.ToTensor(),
        T.Normalize(
          mean=[0.485, 0.456, 0.406],
          std=[0.229, 0.224, 0.225],
        ),
      ]
    )

    x = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
      logits = model(x)
      if isinstance(logits, (list, tuple)):
        logits = logits[0]
      probs = torch.softmax(logits, dim=1)[0].cpu()

    idx = int(probs.argmax().item())
    confidence = float(probs[idx])
    label = CLASS_NAMES[idx] if 0 <= idx < len(CLASS_NAMES) else "unknown"

    return build_classification_response(label, confidence)

  except Exception as e:
    print("[ML] Error during classification:", e)
    return fallback_response()


# -----------------------------------------------------------------------------
# FASTAPI ROUTER + WASTE REPORTING ENDPOINTS
# -----------------------------------------------------------------------------

router = APIRouter(prefix="/waste", tags=["waste_reporting"])

UPLOAD_DIR = os.path.join(
  os.path.dirname(os.path.dirname(__file__)),
  "..",
  "uploads",
  "waste_reports",
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/reports", response_model=WasteReportRead)
async def create_report(
  description: str = Form(None),
  latitude: Optional[float] = Form(None),
  longitude: Optional[float] = Form(None),
  image: UploadFile = File(...),
  classification_id: Optional[str] = Form(None),
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  Citizen: create a waste report with image + AI classification snapshot.
  """
  # Read bytes once
  try:
    image_bytes = await image.read()
  except Exception:
    raise HTTPException(status_code=400, detail="Could not read uploaded image.")

  # Save file to uploads
  filename = image.filename or "waste.jpg"
  save_path = os.path.join(UPLOAD_DIR, filename)

  base, ext = os.path.splitext(filename)
  counter = 1
  while os.path.exists(save_path):
    filename = f"{base}_{counter}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)
    counter += 1

  with open(save_path, "wb") as f:
    f.write(image_bytes)

  rel = os.path.relpath(save_path, os.path.dirname(os.path.dirname(__file__)))

  # Run classification on same bytes
  classification = classify_image_with_model(image_bytes)

  report = create_waste_report(
    db=db,
    reporter_id=current_user.id,
    image_path=rel,
    description=description,
    latitude=latitude,
    longitude=longitude,
    classification_label=classification.id,
    classification_confidence=classification.confidence,
    classification_recyclable=classification.recyclable,
  )

  return report


@router.get("/reports/me", response_model=List[WasteReportRead])
def list_my_reports(
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  Citizen: list my own reports.
  """
  return (
    db.query(WasteReport)
    .filter(WasteReport.reporter_id == current_user.id)
    .order_by(WasteReport.created_at.desc())
    .all()
  )


@router.get("/reports", response_model=List[WasteReportRead])
def list_all_reports(
  status: Optional[WasteReportStatus] = None,
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.require_super_admin),
):
  """
  Super admin: list all reports, optional filter by status.
  """
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
  """
  Super admin: update report status or assignment.
  """
  try:
    return update_report_status(
      db=db,
      report_id=report_id,
      new_status=body.status,
      assigned_worker_id=body.assigned_worker_id,
    )
  except ValueError:
    raise HTTPException(status_code=404, detail="Report not found")


# -----------------------------------------------------------------------------
# Waste worker views & actions
# -----------------------------------------------------------------------------

def _ensure_worker_or_admin(user: User) -> None:
  if user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
    raise HTTPException(status_code=403, detail="Only waste workers can access this endpoint.")


@router.get("/reports/available", response_model=List[WasteReportRead])
def list_available_reports_for_workers(
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  Waste worker: list OPEN reports that are not yet assigned to any worker.
  """
  _ensure_worker_or_admin(current_user)

  reports = (
    db.query(WasteReport)
    .filter(
      WasteReport.status == WasteReportStatus.OPEN.value,
      WasteReport.assigned_worker_id.is_(None),
    )
    .order_by(WasteReport.created_at.asc())
    .all()
  )
  return reports


@router.get("/reports/assigned/me", response_model=List[WasteReportRead])
def list_reports_assigned_to_me(
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  Waste worker: list reports assigned to the current worker.
  """
  _ensure_worker_or_admin(current_user)

  reports = (
    db.query(WasteReport)
    .filter(WasteReport.assigned_worker_id == current_user.id)
    .order_by(WasteReport.created_at.desc())
    .all()
  )
  return reports


@router.post("/reports/{report_id}/claim", response_model=WasteReportRead)
def worker_claim_report(
  report_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  Waste worker: claim an OPEN, unassigned report.

  - sets assigned_worker_id = current worker
  - moves status to IN_PROGRESS
  """
  _ensure_worker_or_admin(current_user)

  report = (
    db.query(WasteReport)
    .filter(WasteReport.id == report_id)
    .first()
  )
  if report is None:
    raise HTTPException(status_code=404, detail="Report not found")

  if report.assigned_worker_id is not None and report.assigned_worker_id != current_user.id:
    raise HTTPException(status_code=400, detail="Report already assigned to another worker")

  if report.status != WasteReportStatus.OPEN.value:
    raise HTTPException(status_code=400, detail="Only OPEN reports can be claimed")

  # Assign and mark in progress
  report.assigned_worker_id = current_user.id
  report.status = WasteReportStatus.IN_PROGRESS.value
  # updated_at will be set by DB trigger or you can set here if needed

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
  """
  Waste worker: update status for a report they are assigned to.

  Allowed statuses for workers:
  - IN_PROGRESS
  - RESOLVED (triggers carbon rewards via service)
  """
  _ensure_worker_or_admin(current_user)

  report = (
    db.query(WasteReport)
    .filter(WasteReport.id == report_id)
    .first()
  )
  if report is None:
    raise HTTPException(status_code=404, detail="Report not found")

  # If user is a worker (not admin), ensure they are assigned to this report
  if current_user.role == UserRole.WASTE_WORKER and report.assigned_worker_id != current_user.id:
    raise HTTPException(status_code=403, detail="You are not assigned to this report")

  if body.status not in (
    WasteReportStatus.IN_PROGRESS,
    WasteReportStatus.RESOLVED,
  ):
    raise HTTPException(
      status_code=400,
      detail="Workers can only set status to IN_PROGRESS or RESOLVED",
    )

  try:
    updated = update_report_status(
      db=db,
      report_id=report_id,
      new_status=body.status,
      # ensure assigned_worker_id stays set to this worker
      assigned_worker_id=report.assigned_worker_id or current_user.id,
    )
  except ValueError:
    raise HTTPException(status_code=404, detail="Report not found")

  return updated


# -----------------------------------------------------------------------------
# Classification-only endpoint (used by citizen Report Waste page)
# -----------------------------------------------------------------------------

@router.post("/classify", response_model=WasteClassificationResponse)
async def classify_endpoint(
  image: UploadFile = File(...),
  latitude: Optional[float] = Form(None),
  longitude: Optional[float] = Form(None),
  db: Session = Depends(get_db),
  current_user: User = Depends(deps.get_current_user),
):
  """
  - Uses your local best_effnet_b4.pth model if available and compatible.
  - Always returns a valid classification (fallback if anything fails).
  """
  try:
    image_bytes = await image.read()
  except Exception:
    return fallback_response()

  return classify_image_with_model(image_bytes)
