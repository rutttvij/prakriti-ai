from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api import auth as auth_router
from app.api import training as training_router
from app.api import segregation as segregation_router
from app.api import waste_reporting as waste_router
from app.api import facilities as facilities_router
from app.api import city_ops as city_router

from app import models

def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Base.metadata.create_all(bind=engine)

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    # Include auth routes under /api/v1
    app.include_router(auth_router.router, prefix=settings.API_V1_STR)
    app.include_router(training_router.router, prefix=settings.API_V1_STR)
    app.include_router(segregation_router.router, prefix=settings.API_V1_STR)
    app.include_router(waste_router.router, prefix=settings.API_V1_STR)
    app.include_router(facilities_router.router, prefix=settings.API_V1_STR)
    app.include_router(city_router.router, prefix=settings.API_V1_STR)

    return app


app = create_app()
