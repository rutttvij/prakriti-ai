from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.training import TrainingLesson
from app.schemas.training_cms import (
    LessonReorderRequest,
    TrainingLessonCreate,
    TrainingLessonRead,
    TrainingLessonUpdate,
    TrainingModuleCreate,
    TrainingModuleListResponse,
    TrainingModuleRead,
    TrainingModuleUpdate,
)
from app.services import training_service

router = APIRouter(prefix="/admin/training", tags=["admin-training"])


@router.post("/modules", response_model=TrainingModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    payload: TrainingModuleCreate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    try:
        row = training_service.create_module(db, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    row = training_service.get_module(db, row.id)
    assert row is not None
    return row


@router.get("/modules", response_model=TrainingModuleListResponse)
def list_modules(
    audience: str | None = Query(default=None),
    published: bool | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    return training_service.list_modules(
        db,
        audience=audience,
        published=published,
        q=q,
        page=page,
        page_size=page_size,
    )


@router.get("/modules/{module_id}", response_model=TrainingModuleRead)
def get_module(
    module_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = training_service.get_module(db, module_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training module not found")
    return row


@router.patch("/modules/{module_id}", response_model=TrainingModuleRead)
def patch_module(
    module_id: int,
    payload: TrainingModuleUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = training_service.get_module(db, module_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    try:
        training_service.update_module(db, row, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    row = training_service.get_module(db, module_id)
    assert row is not None
    return row


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = training_service.get_module(db, module_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    try:
        training_service.delete_module(db, row)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return None


@router.post("/modules/{module_id}/lessons", response_model=TrainingLessonRead, status_code=status.HTTP_201_CREATED)
def create_lesson(
    module_id: int,
    payload: TrainingLessonCreate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    module = training_service.get_module(db, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    try:
        row = training_service.add_lesson(db, module_id, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return row


@router.patch("/lessons/{lesson_id}", response_model=TrainingLessonRead)
def patch_lesson(
    lesson_id: int,
    payload: TrainingLessonUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    lesson = db.get(TrainingLesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    try:
        row = training_service.update_lesson(db, lesson, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return row


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    lesson = db.get(TrainingLesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    try:
        training_service.delete_lesson(db, lesson)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return None


@router.post("/modules/{module_id}/reorder-lessons", response_model=list[TrainingLessonRead])
def reorder_lessons(
    module_id: int,
    payload: LessonReorderRequest,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    module = training_service.get_module(db, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    try:
        rows = training_service.reorder_lessons(db, module_id, payload)
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        db.rollback()
        raise

    return rows
