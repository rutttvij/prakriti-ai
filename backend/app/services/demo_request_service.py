from __future__ import annotations

from io import StringIO
import csv

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.leads import DemoRequest


def create_demo_request(
    db: Session,
    *,
    name: str,
    organization: str,
    org_type: str,
    email: str,
    phone: str | None,
    message: str | None,
) -> DemoRequest:
    row = DemoRequest(
        name=name,
        organization=organization,
        org_type=org_type,
        email=email,
        phone=phone,
        message=message,
        status="new",
    )
    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def list_demo_requests(
    db: Session,
    *,
    q: str | None,
    status: str | None,
    org_type: str | None,
    page: int,
    page_size: int,
) -> tuple[list[DemoRequest], int]:
    qry = db.query(DemoRequest)

    if status:
        qry = qry.filter(DemoRequest.status == status)
    if org_type:
        qry = qry.filter(DemoRequest.org_type == org_type)
    if q:
        pattern = f"%{q.strip()}%"
        qry = qry.filter(
            or_(
                DemoRequest.name.ilike(pattern),
                DemoRequest.organization.ilike(pattern),
                DemoRequest.email.ilike(pattern),
                DemoRequest.message.ilike(pattern),
            )
        )

    total = qry.count()
    rows = (
        qry.order_by(DemoRequest.created_at.desc(), DemoRequest.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total


def get_demo_request(db: Session, request_id: int) -> DemoRequest | None:
    return db.get(DemoRequest, request_id)


def update_demo_request(
    db: Session,
    row: DemoRequest,
    *,
    status: str | None,
    admin_notes: str | None,
) -> DemoRequest:
    if status is not None:
        row.status = status
    if admin_notes is not None:
        row.admin_notes = admin_notes
    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def export_demo_requests_csv(rows: list[DemoRequest]) -> str:
    out = StringIO()
    writer = csv.writer(out)
    writer.writerow(["id", "name", "organization", "org_type", "email", "phone", "status", "admin_notes", "created_at"])
    for r in rows:
        writer.writerow([
            r.id,
            r.name,
            r.organization,
            r.org_type,
            r.email,
            r.phone or "",
            r.status,
            r.admin_notes or "",
            r.created_at.isoformat() if r.created_at else "",
        ])
    return out.getvalue()
