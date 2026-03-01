BEGIN;

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    city VARCHAR(128) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_zones_name ON zones(name);
CREATE INDEX IF NOT EXISTS ix_zones_city ON zones(city);
CREATE INDEX IF NOT EXISTS ix_zones_type ON zones(type);

CREATE TABLE IF NOT EXISTS workforce_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    zone_id INTEGER NULL REFERENCES zones(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_workforce_assignments_zone_id ON workforce_assignments(zone_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NULL,
    action VARCHAR(128) NOT NULL,
    entity VARCHAR(128) NOT NULL,
    entity_id VARCHAR(64) NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL UNIQUE,
    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NULL,
    updated_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value_json)
VALUES
    ('pcc_unit_kgco2e', '1.0'::jsonb),
    ('quality_multipliers', '{"low":0.7,"medium":1.0,"high":1.15}'::jsonb),
    ('feature_flags', '{"enable_training_modules":true,"enable_pcc_calculator":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
