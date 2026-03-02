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
from app.api import waste as waste_file_router
from app.api import waste_reporting as waste_router
from app.api import worker_jobs as worker_jobs_router
from app.api.v1 import admin_content as admin_content_router
from app.api.v1 import admin_ops as admin_ops_router
from app.api.v1 import admin_contact_messages as admin_contact_messages_router
from app.api.v1 import admin_demo_requests as admin_demo_requests_router
from app.api.v1 import admin_training as admin_training_router
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
                  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pickuprequeststatus') THEN
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'ASSIGNED';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'COMPLETED';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'CANCELLED';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'ACCEPTED';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
                    ALTER TYPE pickuprequeststatus ADD VALUE IF NOT EXISTS 'PICKED_UP';
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wastelogstatus') THEN
                    ALTER TYPE wastelogstatus ADD VALUE IF NOT EXISTS 'CREDITED';
                    ALTER TYPE wastelogstatus ADD VALUE IF NOT EXISTS 'VERIFIED';
                    ALTER TYPE wastelogstatus ADD VALUE IF NOT EXISTS 'PICKUP_REQUESTED';
                    ALTER TYPE wastelogstatus ADD VALUE IF NOT EXISTS 'PICKED_UP';
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
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS bulk_org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS citizen_household_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();"))

        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS verifier_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS verifier_worker_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS verified_weight DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS contamination_rate DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION NOT NULL DEFAULT 1.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500) NULL;"))
        # Legacy DBs may still enforce evidence_path as NOT NULL even though proof photo is optional.
        conn.execute(text("ALTER TABLE IF EXISTS verifications ALTER COLUMN evidence_path DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS reject_weight_kg DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION NOT NULL DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS carbon_saved_kgco2e DOUBLE PRECISION NOT NULL DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS pcc_awarded DOUBLE PRECISION NOT NULL DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();"))

        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS balance_pcc DOUBLE PRECISION NOT NULL DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE IF EXISTS wallets ALTER COLUMN bulk_generator_id DROP NOT NULL;"))

        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS industry_type VARCHAR(80) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS registration_or_license_no VARCHAR(120) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS estimated_daily_waste_kg DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS waste_categories JSONB NOT NULL DEFAULT '[]'::jsonb;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS ward VARCHAR(120) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS pincode VARCHAR(6) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS license_number VARCHAR(120) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS bulk_generators ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL';"))
        conn.execute(text("ALTER TABLE IF EXISTS pickup_requests ADD COLUMN IF NOT EXISTS bulk_org_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS pickup_requests ADD COLUMN IF NOT EXISTS note VARCHAR(500) NULL;"))

        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'walletownertype') THEN
                    CREATE TYPE walletownertype AS ENUM ('CITIZEN', 'BULK');
                  END IF;
                END $$;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS wallet_ledger (
                    id SERIAL PRIMARY KEY,
                    owner_type walletownertype NOT NULL,
                    owner_id INTEGER NOT NULL,
                    delta_pcc DOUBLE PRECISION NOT NULL,
                    reason VARCHAR(255) NOT NULL,
                    ref_type VARCHAR(64) NULL,
                    ref_id INTEGER NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS badge_awards (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    badge_key VARCHAR(120) NOT NULL,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS amount_pcc DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS reason VARCHAR(500) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS ref_type VARCHAR(50) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS ref_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER NULL;"))

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
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'new';"))
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS converted_demo_request_id INTEGER NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS audience VARCHAR(32) NOT NULL DEFAULT 'citizen';"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS summary TEXT NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS difficulty VARCHAR(32) NOT NULL DEFAULT 'beginner';"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS est_minutes INTEGER NOT NULL DEFAULT 10;"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(600) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();"))
        conn.execute(text("UPDATE training_modules SET summary = COALESCE(summary, description) WHERE summary IS NULL;"))
        conn.execute(text("UPDATE training_modules SET is_active = COALESCE(is_active, FALSE);"))
        conn.execute(text("UPDATE training_modules SET is_published = COALESCE(is_published, is_active, FALSE);"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS waste_category VARCHAR(64) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS quality_level VARCHAR(16) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS evidence_image_url VARCHAR(600) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS pcc_status VARCHAR(16) NOT NULL DEFAULT 'pending';"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS awarded_pcc_amount DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS segregation_logs ADD COLUMN IF NOT EXISTS awarded_by_user_id INTEGER NULL;"))
        conn.execute(
            text(
                """
                WITH ranked AS (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY household_id, log_date
                            ORDER BY created_at DESC NULLS LAST, id DESC
                        ) AS rn
                    FROM segregation_logs
                    WHERE household_id IS NOT NULL
                      AND log_date IS NOT NULL
                )
                DELETE FROM segregation_logs s
                USING ranked r
                WHERE s.id = r.id
                  AND r.rn > 1;
                """
            )
        )
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_household_log_date ON segregation_logs(household_id, log_date);"))
        conn.execute(text("ALTER TABLE IF EXISTS households ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS household_members (
                    id SERIAL PRIMARY KEY,
                    household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE(household_id, user_id)
                );
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_household_members_user_id ON household_members(user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_household_members_household_id ON household_members(household_id);"))
        conn.execute(
            text(
                """
                INSERT INTO household_members (household_id, user_id, is_primary, created_at)
                SELECT h.id, h.owner_user_id, COALESCE(h.is_primary, FALSE), COALESCE(h.created_at, now())
                FROM households h
                WHERE h.owner_user_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM household_members hm
                      WHERE hm.household_id = h.id AND hm.user_id = h.owner_user_id
                  );
                """
            )
        )
        conn.execute(text("ALTER TABLE IF EXISTS training_modules ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb;"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_training_progress_user_module ON training_progress(user_id, module_id);"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_badges_user_badge ON user_badges(user_id, badge_id);"))
        conn.execute(
            text(
                """
                UPDATE badges
                SET name = 'Green Starter',
                    description = 'Completed your first citizen training module.',
                    category = 'TRAINING',
                    criteria_key = 'citizen_training_first_module',
                    is_active = TRUE,
                    active = TRUE
                WHERE code = 'GREEN_STARTER' OR criteria_key = 'citizen_training_first_module';

                INSERT INTO badges (code, name, description, category, criteria_key, is_active, active, created_at)
                SELECT 'GREEN_STARTER', 'Green Starter', 'Completed your first citizen training module.', 'TRAINING', 'citizen_training_first_module', TRUE, TRUE, now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM badges WHERE code = 'GREEN_STARTER' OR criteria_key = 'citizen_training_first_module'
                );

                UPDATE badges
                SET name = 'Certified Citizen',
                    description = 'Completed all published citizen training modules.',
                    category = 'TRAINING',
                    criteria_key = 'citizen_training_all_modules',
                    is_active = TRUE,
                    active = TRUE
                WHERE code = 'CERTIFIED_CITIZEN' OR criteria_key = 'citizen_training_all_modules';

                INSERT INTO badges (code, name, description, category, criteria_key, is_active, active, created_at)
                SELECT 'CERTIFIED_CITIZEN', 'Certified Citizen', 'Completed all published citizen training modules.', 'TRAINING', 'citizen_training_all_modules', TRUE, TRUE, now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM badges WHERE code = 'CERTIFIED_CITIZEN' OR criteria_key = 'citizen_training_all_modules'
                );
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO platform_settings (key, value_json, description, created_at, updated_at)
                VALUES ('pcc_unit_kgco2e', '10.0'::jsonb, 'PCC conversion unit. 1 PCC = X kgCO2e.', now(), now())
                ON CONFLICT (key) DO NOTHING;
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO emission_factors (category, kgco2e_per_kg, active, created_at, updated_at)
                VALUES
                  ('dry', 1.0, TRUE, now(), now()),
                  ('wet', 0.5, TRUE, now(), now()),
                  ('reject', 1.5, TRUE, now(), now())
                ON CONFLICT (category) DO UPDATE
                SET kgco2e_per_kg = EXCLUDED.kgco2e_per_kg,
                    active = TRUE,
                    updated_at = now();
                """
            )
        )
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(16) NOT NULL DEFAULT 'pending';"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS quality_level VARCHAR(16) NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS pcc_status VARCHAR(16) NOT NULL DEFAULT 'pending';"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS awarded_pcc_amount DOUBLE PRECISION NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NULL;"))
        conn.execute(text("ALTER TABLE IF EXISTS waste_logs ADD COLUMN IF NOT EXISTS awarded_by_user_id INTEGER NULL;"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    body TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at DESC);"))
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_single_credit_per_reference
                ON transactions(ref_type, ref_id)
                WHERE ref_type IN ('citizen_log', 'bulk_log') AND ref_id IS NOT NULL AND tx_type = 'CREDIT';
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO emission_factors (category, kgco2e_per_kg, active, created_at, updated_at)
                VALUES ('mixed', 1.0, TRUE, now(), now())
                ON CONFLICT (category) DO UPDATE
                SET kgco2e_per_kg = EXCLUDED.kgco2e_per_kg,
                    active = TRUE,
                    updated_at = now();
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS training_lessons (
                    id SERIAL PRIMARY KEY,
                    module_id INTEGER NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    lesson_type VARCHAR(32) NOT NULL DEFAULT 'article',
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS demo_requests (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    organization VARCHAR(255) NOT NULL,
                    org_type VARCHAR(64) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(50) NULL,
                    message TEXT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'new',
                    admin_notes TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO demo_requests (name, organization, org_type, email, phone, message, status, created_at)
                SELECT l.name, l.org_name, l.org_type, l.email, l.phone, l.message, l.status, l.created_at
                FROM leads l
                WHERE NOT EXISTS (
                    SELECT 1 FROM demo_requests d
                    WHERE d.email = l.email
                      AND d.organization = l.org_name
                      AND d.created_at = l.created_at
                );
                """
            )
        )


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
    uploads_dir = Path("uploads").resolve()
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
    app.include_router(waste_file_router.router, prefix=api_prefix)
    app.include_router(waste_router.router, prefix=api_prefix)
    app.include_router(facilities_router.router, prefix=api_prefix)
    app.include_router(bulk_router.router, prefix=api_prefix)
    app.include_router(worker_jobs_router.router, prefix=api_prefix)

    # Admin / city ops
    app.include_router(city_router.router, prefix=api_prefix)
    app.include_router(admin_router.router, prefix=api_prefix)

    # Public utilities
    app.include_router(contact_router.router, prefix=api_prefix)
    app.include_router(pcc_router.router, prefix=api_prefix)
    app.include_router(public_router.router, prefix=api_prefix)
    app.include_router(admin_content_router.router, prefix=api_prefix)
    app.include_router(admin_ops_router.router, prefix=api_prefix)
    app.include_router(admin_training_router.router, prefix=api_prefix)
    app.include_router(admin_demo_requests_router.router, prefix=api_prefix)
    app.include_router(admin_contact_messages_router.router, prefix=api_prefix)

    return app


app = create_app()
