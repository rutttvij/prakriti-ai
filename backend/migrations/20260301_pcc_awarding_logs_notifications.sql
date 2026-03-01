BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE IF EXISTS transactions
  ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS wallets
  ALTER COLUMN bulk_generator_id DROP NOT NULL;

ALTER TABLE IF EXISTS segregation_logs
  ADD COLUMN IF NOT EXISTS waste_category VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS quality_level VARCHAR(16) NULL,
  ADD COLUMN IF NOT EXISTS evidence_image_url VARCHAR(600) NULL,
  ADD COLUMN IF NOT EXISTS pcc_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS awarded_pcc_amount DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS awarded_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_segregation_logs_pcc_status ON segregation_logs(pcc_status);
CREATE INDEX IF NOT EXISTS ix_segregation_logs_quality_level ON segregation_logs(quality_level);
CREATE INDEX IF NOT EXISTS ix_segregation_logs_waste_category ON segregation_logs(waste_category);

UPDATE segregation_logs
SET
  weight_kg = COALESCE(weight_kg, COALESCE(dry_kg, 0) + COALESCE(wet_kg, 0) + COALESCE(reject_kg, 0)),
  quality_score = COALESCE(quality_score, NULLIF(segregation_score, 0) / 100.0),
  quality_level = COALESCE(
    quality_level,
    CASE
      WHEN COALESCE(segregation_score, 0) >= 85 THEN 'high'
      WHEN COALESCE(segregation_score, 0) >= 60 THEN 'medium'
      ELSE 'low'
    END
  ),
  pcc_status = CASE
    WHEN pcc_status IS NULL OR pcc_status = '' THEN CASE WHEN COALESCE(pcc_awarded, FALSE) THEN 'awarded' ELSE 'pending' END
    ELSE pcc_status
  END,
  awarded_pcc_amount = COALESCE(awarded_pcc_amount, awarded_pcc_tokens),
  awarded_at = COALESCE(awarded_at, pcc_awarded_at)
WHERE TRUE;

ALTER TABLE IF EXISTS waste_logs
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS quality_level VARCHAR(16) NULL,
  ADD COLUMN IF NOT EXISTS pcc_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS awarded_pcc_amount DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS awarded_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_waste_logs_verification_status ON waste_logs(verification_status);
CREATE INDEX IF NOT EXISTS ix_waste_logs_pcc_status ON waste_logs(pcc_status);
CREATE INDEX IF NOT EXISTS ix_waste_logs_quality_level ON waste_logs(quality_level);

UPDATE waste_logs wl
SET
  verification_status = CASE
    WHEN wl.verification_status IS NOT NULL AND wl.verification_status <> '' THEN wl.verification_status
    WHEN wl.status::text = 'VERIFIED' THEN 'verified'
    WHEN wl.status::text = 'REJECTED' THEN 'rejected'
    ELSE 'pending'
  END,
  quality_level = COALESCE(
    wl.quality_level,
    CASE
      WHEN COALESCE(v.quality_score, 0) >= 1.05 THEN 'high'
      WHEN COALESCE(v.quality_score, 0) >= 0.85 THEN 'medium'
      WHEN v.id IS NOT NULL THEN 'low'
      ELSE NULL
    END
  )
FROM verifications v
WHERE v.waste_log_id = wl.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_single_credit_per_reference
  ON transactions(ref_type, ref_id)
  WHERE ref_type IN ('citizen_log', 'bulk_log') AND ref_id IS NOT NULL AND tx_type = 'CREDIT';

INSERT INTO emission_factors (category, kgco2e_per_kg, active, created_at, updated_at)
VALUES ('mixed', 1.0, TRUE, NOW(), NOW())
ON CONFLICT (category) DO UPDATE
SET kgco2e_per_kg = EXCLUDED.kgco2e_per_kg,
    active = TRUE,
    updated_at = NOW();

COMMIT;
