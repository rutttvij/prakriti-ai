# app/main.py:

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401  # ensure SQLAlchemy models are imported
from app.core.config import settings
from app.core.database import Base, engine

# API routers
from app.api import admin as admin_router
from app.api import auth as auth_router
from app.api import citizen as citizen_router
from app.api import city_ops as city_router
from app.api import contact as contact_router
from app.api import facilities as facilities_router
from app.api import segregation as segregation_router
from app.api import training as training_router
from app.api import waste_reporting as waste_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
    )

    # --- CORS ---
    # In settings.BACKEND_CORS_ORIGINS you can keep:
    # ["http://localhost:5173", "http://127.0.0.1:5173", ...]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Database ---
    # For dev: auto-create tables. In production you might switch to Alembic.
    Base.metadata.create_all(bind=engine)

    # --- Health check ---
    @app.get("/health", tags=["health"])
    def health_check():
        return {"status": "ok"}

    # --- Static uploads (waste report images, etc.) ---
    uploads_dir = Path(settings.MEDIA_ROOT).resolve()
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads",
        StaticFiles(directory=str(uploads_dir)),
        name="uploads",
    )

    # --- API routers under /api/v1 ---
    api_prefix = settings.API_V1_STR  # usually "/api/v1"

    # Auth first (required for protected routes)
    app.include_router(auth_router.router, prefix=api_prefix)

    # Citizen routes (dashboard summary etc.)
    app.include_router(citizen_router.router, prefix=api_prefix)

    # Core modules
    app.include_router(training_router.router, prefix=api_prefix)
    app.include_router(segregation_router.router, prefix=api_prefix)
    app.include_router(waste_router.router, prefix=api_prefix)
    app.include_router(facilities_router.router, prefix=api_prefix)

    # Admin / city ops
    app.include_router(city_router.router, prefix=api_prefix)
    app.include_router(admin_router.router, prefix=api_prefix)

    # Public utilities
    app.include_router(contact_router.router, prefix=api_prefix)

    return app


app = create_app()
