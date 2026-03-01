BEGIN;

ALTER TABLE IF EXISTS households
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE households
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE TRUE;

CREATE TABLE IF NOT EXISTS household_members (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_household_members_household_user
  ON household_members(household_id, user_id);
CREATE INDEX IF NOT EXISTS ix_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS ix_household_members_household_id ON household_members(household_id);

INSERT INTO household_members (household_id, user_id, is_primary, created_at)
SELECT h.id, h.owner_user_id, COALESCE(h.is_primary, FALSE), COALESCE(h.created_at, NOW())
FROM households h
WHERE h.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = h.id AND hm.user_id = h.owner_user_id
  );

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_household_log_date
  ON segregation_logs(household_id, log_date);

ALTER TABLE IF EXISTS training_modules
  ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE training_modules
SET content_json = COALESCE(content_json, '{}'::jsonb)
WHERE TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_progress_user_module
  ON training_progress(user_id, module_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_badges_user_badge
  ON user_badges(user_id, badge_id);

UPDATE badges
SET name = 'Green Starter',
    description = 'Completed your first citizen training module.',
    category = 'TRAINING',
    criteria_key = 'citizen_training_first_module',
    is_active = TRUE,
    active = TRUE
WHERE code = 'GREEN_STARTER' OR criteria_key = 'citizen_training_first_module';

INSERT INTO badges (code, name, description, category, criteria_key, is_active, active, created_at)
SELECT 'GREEN_STARTER', 'Green Starter', 'Completed your first citizen training module.', 'TRAINING', 'citizen_training_first_module', TRUE, TRUE, NOW()
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
SELECT 'CERTIFIED_CITIZEN', 'Certified Citizen', 'Completed all published citizen training modules.', 'TRAINING', 'citizen_training_all_modules', TRUE, TRUE, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE code = 'CERTIFIED_CITIZEN' OR criteria_key = 'citizen_training_all_modules'
);

INSERT INTO platform_settings (key, value_json, description, created_at, updated_at)
VALUES ('pcc_unit_kgco2e', '10.0'::jsonb, 'PCC conversion unit. 1 PCC = X kgCO2e.', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO emission_factors (category, kgco2e_per_kg, active, created_at, updated_at)
VALUES
  ('dry', 1.0, TRUE, NOW(), NOW()),
  ('wet', 0.5, TRUE, NOW(), NOW()),
  ('reject', 1.5, TRUE, NOW(), NOW())
ON CONFLICT (category) DO UPDATE
SET kgco2e_per_kg = EXCLUDED.kgco2e_per_kg,
    active = TRUE,
    updated_at = NOW();

COMMIT;
