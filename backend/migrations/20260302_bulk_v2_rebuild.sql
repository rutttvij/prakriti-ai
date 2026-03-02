-- Bulk Generator v2 domain model upgrade

ALTER TABLE IF EXISTS bulk_generators
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL';

ALTER TABLE IF EXISTS waste_logs
  ADD COLUMN IF NOT EXISTS bulk_org_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS citizen_household_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS pickup_requests
  ADD COLUMN IF NOT EXISTS bulk_org_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS note VARCHAR(500) NULL;

ALTER TABLE IF EXISTS verifications
  ADD COLUMN IF NOT EXISTS verifier_worker_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS reject_weight_kg DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS carbon_saved_kgco2e DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS pcc_awarded DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'walletownertype') THEN
    CREATE TYPE walletownertype AS ENUM ('CITIZEN', 'BULK');
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS badge_awards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key VARCHAR(120) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_owner ON wallet_ledger(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_user ON badge_awards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_bulk_org ON waste_logs(bulk_org_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_bulk_org ON pickup_requests(bulk_org_id);
