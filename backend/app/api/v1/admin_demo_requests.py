from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.schemas.demo_requests import DemoRequestListResponse, DemoRequestRead, DemoRequestUpdate
from app.services import demo_request_service

router = APIRouter(prefix="/admin/demo-requests", tags=["admin-demo-requests"])


@router.get("/", response_model=DemoRequestListResponse)
def list_requests(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    org_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    rows, total = demo_request_service.list_demo_requests(
        db,
        q=q,
        status=status,
        org_type=org_type,
        page=page,
        page_size=page_size,
    )
    return DemoRequestListResponse(items=rows, total=total, page=page, page_size=page_size)


@router.get("/export.csv", response_class=PlainTextResponse)
def export_csv(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    org_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    rows, _ = demo_request_service.list_demo_requests(
        db,
        q=q,
        status=status,
        org_type=org_type,
        page=1,
        page_size=10000,
    )
    return demo_request_service.export_demo_requests_csv(rows)


@router.get("/{request_id}", response_model=DemoRequestRead)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = demo_request_service.get_demo_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Demo request not found")
    return row


@router.patch("/{request_id}", response_model=DemoRequestRead)
def patch_request(
    request_id: int,
    payload: DemoRequestUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = demo_request_service.get_demo_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Demo request not found")

    try:
        row = demo_request_service.update_demo_request(
            db,
            row,
            status=payload.status,
            admin_notes=payload.admin_notes,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return row
