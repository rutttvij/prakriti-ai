from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.api import deps
from app.api.waste_reporting import classify_image_with_model
from app.models.user import User

router = APIRouter(prefix="/waste", tags=["waste"])

UPLOAD_DIR = Path("uploads") / "waste_reports"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class WasteFileClassificationOut(BaseModel):
    label: str
    confidence: float
    file_path: str


@router.post("/classify-file", response_model=WasteFileClassificationOut)
async def classify_file(
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(deps.get_current_user),
) -> WasteFileClassificationOut:
    # JWT-protected endpoint via get_current_user dependency.
    _ = current_user

    if file is None:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = (file.filename or "").strip()
    ext = Path(filename).suffix.lower() if filename else ""
    if not ext:
        ext = ".jpg"

    safe_name = f"{uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / safe_name

    try:
        file_bytes = await file.read()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail="Could not read uploaded file") from exc

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    save_path.write_bytes(file_bytes)

    ml_result = classify_image_with_model(file_bytes)
    confidence = float(ml_result.confidence or 0.0)
    confidence = max(0.0, min(1.0, confidence))

    return WasteFileClassificationOut(
        label=str(ml_result.id),
        confidence=confidence,
        file_path=str(save_path).replace("\\", "/"),
    )
