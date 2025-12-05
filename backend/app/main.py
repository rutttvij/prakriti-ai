# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.core.database import Base, engine
from app.api import auth as auth_router
from app.api import training as training_router
from app.api import segregation as segregation_router
from app.api import waste_reporting as waste_router
from app.api import facilities as facilities_router
from app.api import city_ops as city_router
from app.api import admin as admin_router  # ⬅ NEW
from app.api import auth

from app import models  # noqa: F401  (ensure models are imported)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # DB
    Base.metadata.create_all(bind=engine)

    # HEALTH
    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    # STATIC UPLOADS  👉 for waste report images
    uploads_dir = Path(settings.MEDIA_ROOT).resolve()
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    # API ROUTERS under /api/v1
    app.include_router(auth_router.router, prefix=settings.API_V1_STR)
    app.include_router(training_router.router, prefix=settings.API_V1_STR)
    app.include_router(segregation_router.router, prefix=settings.API_V1_STR)
    app.include_router(waste_router.router, prefix=settings.API_V1_STR)
    app.include_router(facilities_router.router, prefix=settings.API_V1_STR)
    app.include_router(city_router.router, prefix=settings.API_V1_STR)
    app.include_router(admin_router.router, prefix=settings.API_V1_STR)

    # Legacy auth (no prefix) if you still need it:
    app.include_router(auth.router)

    return app


app = create_app()
