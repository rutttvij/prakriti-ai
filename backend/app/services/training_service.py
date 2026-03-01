from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.models.training import TrainingLesson, TrainingModule
from app.schemas.training_cms import (
    LessonReorderRequest,
    TrainingLessonCreate,
    TrainingLessonUpdate,
    TrainingModuleCreate,
    TrainingModuleListItem,
    TrainingModuleListResponse,
    TrainingModuleUpdate,
)


def create_module(db: Session, payload: TrainingModuleCreate) -> TrainingModule:
    row = TrainingModule(
        audience=payload.audience,
        title=payload.title,
        summary=payload.summary,
        difficulty=payload.difficulty,
        est_minutes=payload.est_minutes,
        cover_image_url=payload.cover_image_url,
        is_published=payload.is_published,
        description=payload.summary,
        is_active=payload.is_published,
    )
    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def list_modules(
    db: Session,
    *,
    audience: str | None,
    published: bool | None,
    q: str | None,
    page: int,
    page_size: int,
) -> TrainingModuleListResponse:
    base_q = db.query(TrainingModule)

    if audience:
        base_q = base_q.filter(TrainingModule.audience == audience)
    if published is not None:
        base_q = base_q.filter(TrainingModule.is_published == published)
    if q:
        pattern = f"%{q.strip()}%"
        base_q = base_q.filter(
            or_(TrainingModule.title.ilike(pattern), TrainingModule.summary.ilike(pattern))
        )

    total = base_q.count()
    rows = (
        base_q.options(selectinload(TrainingModule.lessons))
        .order_by(TrainingModule.updated_at.desc(), TrainingModule.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        TrainingModuleListItem(
            id=r.id,
            audience=r.audience.value if hasattr(r.audience, "value") else str(r.audience),
            title=r.title,
            summary=r.summary,
            difficulty=r.difficulty.value if hasattr(r.difficulty, "value") else str(r.difficulty),
            est_minutes=r.est_minutes,
            cover_image_url=r.cover_image_url,
            is_published=bool(r.is_published),
            lessons_count=len(r.lessons),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]

    return TrainingModuleListResponse(items=items, total=total, page=page, page_size=page_size)


def get_module(db: Session, module_id: int) -> TrainingModule | None:
    return (
        db.query(TrainingModule)
        .options(selectinload(TrainingModule.lessons))
        .filter(TrainingModule.id == module_id)
        .first()
    )


def update_module(db: Session, module: TrainingModule, payload: TrainingModuleUpdate) -> TrainingModule:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(module, k, v)

    if "summary" in data:
        module.description = module.summary
    if "is_published" in data:
        module.is_active = module.is_published

    db.add(module)
    db.flush()
    db.refresh(module)
    return module


def delete_module(db: Session, module: TrainingModule) -> None:
    db.delete(module)
    db.flush()


def add_lesson(db: Session, module_id: int, payload: TrainingLessonCreate) -> TrainingLesson:
    if payload.order_index <= 0:
        max_order = (
            db.query(func.max(TrainingLesson.order_index))
            .filter(TrainingLesson.module_id == module_id)
            .scalar()
        ) or 0
        order_index = max_order + 1
    else:
        order_index = payload.order_index

    lesson = TrainingLesson(
        module_id=module_id,
        order_index=order_index,
        lesson_type=payload.lesson_type,
        title=payload.title,
        content=payload.content,
    )
    db.add(lesson)
    db.flush()
    db.refresh(lesson)
    return lesson


def update_lesson(db: Session, lesson: TrainingLesson, payload: TrainingLessonUpdate) -> TrainingLesson:
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, k, v)
    db.add(lesson)
    db.flush()
    db.refresh(lesson)
    return lesson


def delete_lesson(db: Session, lesson: TrainingLesson) -> None:
    db.delete(lesson)
    db.flush()


def reorder_lessons(db: Session, module_id: int, payload: LessonReorderRequest) -> list[TrainingLesson]:
    rows = (
        db.query(TrainingLesson)
        .filter(TrainingLesson.module_id == module_id)
        .order_by(TrainingLesson.order_index.asc(), TrainingLesson.id.asc())
        .with_for_update()
        .all()
    )
    existing_ids = [r.id for r in rows]

    if sorted(existing_ids) != sorted(payload.lesson_ids):
        raise ValueError("lesson_ids must include exactly all lesson IDs for this module")

    by_id = {r.id: r for r in rows}
    for idx, lesson_id in enumerate(payload.lesson_ids, start=1):
        by_id[lesson_id].order_index = idx
        db.add(by_id[lesson_id])

    db.flush()
    return [by_id[x] for x in payload.lesson_ids]


def list_published_modules(db: Session, audience: str | None) -> list[TrainingModule]:
    q = (
        db.query(TrainingModule)
        .options(selectinload(TrainingModule.lessons))
        .filter(TrainingModule.is_published == True)  # noqa: E712
    )
    if audience:
        q = q.filter(TrainingModule.audience == audience)
    return q.order_by(TrainingModule.updated_at.desc(), TrainingModule.id.desc()).all()


def get_published_module(db: Session, module_id: int) -> TrainingModule | None:
    return (
        db.query(TrainingModule)
        .options(selectinload(TrainingModule.lessons))
        .filter(TrainingModule.id == module_id, TrainingModule.is_published == True)  # noqa: E712
        .first()
    )
