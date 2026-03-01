from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.admin_ops import AuditLog
from app.models.user import User


def log_admin_action(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity: str,
    entity_id: str | int | None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        meta_json=metadata or {},
    )
    db.add(row)
    db.flush()
    return row
