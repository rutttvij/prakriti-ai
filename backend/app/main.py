# app/main.py:

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app import models  # noqa: F401  # ensure SQLAlchemy models are imported
from app.core.config import settings
from app.core.database import Base, engine

# API routers
from app.api import admin as admin_router
from app.api import auth as auth_router
from app.api import bulk as bulk_router
from app.api import citizen as citizen_router
from app.api import city_ops as city_router
from app.api import contact as contact_router
from app.api import facilities as facilities_router
from app.api import segregation as segregation_router
from app.api import training as training_router
from app.api import waste_reporting as waste_router
from app.api.v1 import admin_content as admin_content_router
from app.api.v1 import public as public_router
from app.routers import pcc as pcc_router
from app.core.database import SessionLocal
from app.services.marketing_service import seed_marketing_content


def ensure_postgres_enum_values() -> None:
    """
    Development-friendly enum patching for existing databases.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'BULK_MANAGER';
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'BULK_STAFF';
                  END IF;
                END $$;
                """
            )
        )


def ensure_pcc_schema_compat() -> None:
    """
    Adds newer PCC/badge columns if the local DB is behind latest schema.
    Safe to run repeatedly in development.
    """
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS logged_weight DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL;"))

        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS verifier_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS verified_weight DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS contamination_rate DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION NOT NULL DEFAULT 1.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500) NULL;"))

        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS balance_pcc DOUBLE PRECISION NOT NULL DEFAULT 0.0;"))

        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS amount_pcc DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS reason VARCHAR(500) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS ref_type VARCHAR(50) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS ref_id INTEGER NULL;"))

        conn.execute(text("ALTER TABLE IF EXISTS badges ADD COLUMN IF NOT EXISTS code VARCHAR(120) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS badges ADD COLUMN IF NOT EXISTS threshold DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS badges ADD COLUMN IF NOT EXISTS rule_json JSONB NOT NULL DEFAULT '{}'::jsonb;"))
        conn.execute(text("ALTER TABLE IF EXISTS badges ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;"))

        conn.execute(text("ALTER TABLE IF EXISTS user_badges ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS user_badges ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS marketing_partners (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    logo_url VARCHAR(600) NOT NULL,
                    href VARCHAR(600) NULL,
                    "order" INTEGER NOT NULL DEFAULT 0,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS marketing_testimonials (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    title VARCHAR(255) NULL,
                    org VARCHAR(255) NULL,
                    quote TEXT NOT NULL,
                    avatar_url VARCHAR(600) NULL,
                    "order" INTEGER NOT NULL DEFAULT 0,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS marketing_case_studies (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(300) NOT NULL,
                    org VARCHAR(255) NOT NULL,
                    metric_1 VARCHAR(255) NULL,
                    metric_2 VARCHAR(255) NULL,
                    summary TEXT NOT NULL,
                    href VARCHAR(600) NULL,
                    "order" INTEGER NOT NULL DEFAULT 0,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS marketing_faqs (
                    id SERIAL PRIMARY KEY,
                    question VARCHAR(500) NOT NULL,
                    answer TEXT NOT NULL,
                    "order" INTEGER NOT NULL DEFAULT 0,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS marketing_config (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(120) UNIQUE NOT NULL,
                    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS leads (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    org_name VARCHAR(255) NOT NULL,
                    org_type VARCHAR(64) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(50) NULL,
                    message TEXT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'new',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'subscribed',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NULL;"))


def seed_marketing_defaults() -> None:
    db = SessionLocal()
    try:
        with db.begin():
            seed_marketing_content(db)
    finally:
        db.close()


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
    ensure_postgres_enum_values()
    ensure_pcc_schema_compat()
    Base.metadata.create_all(bind=engine)
    seed_marketing_defaults()

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
    app.include_router(bulk_router.router, prefix=api_prefix)

    # Admin / city ops
    app.include_router(city_router.router, prefix=api_prefix)
    app.include_router(admin_router.router, prefix=api_prefix)

    # Public utilities
    app.include_router(contact_router.router, prefix=api_prefix)
    app.include_router(pcc_router.router, prefix=api_prefix)
    app.include_router(public_router.router, prefix=api_prefix)
    app.include_router(admin_content_router.router, prefix=api_prefix)

    return app


app = create_app()
