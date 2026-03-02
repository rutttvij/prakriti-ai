-- Unified badges for Bulk + Worker phase.
-- Phase 1 keeps badge_awards table for rollback/read-only compatibility.

BEGIN;

INSERT INTO badges (code, name, description, category, criteria_key, threshold, rule_json, active, is_active, created_at)
VALUES
  ('bulk_first_verified', 'Bulk First Verified', 'First successful bulk verification credited.', 'BULK_WORKFLOW', 'bulk_first_verified', 1, '{"kind":"bulk_workflow","threshold":1}'::jsonb, TRUE, TRUE, now()),
  ('bulk_segregation_star', 'Bulk Segregation Star', 'High-quality bulk segregation performance.', 'BULK_WORKFLOW', 'bulk_segregation_star', 95, '{"kind":"bulk_workflow","threshold":95}'::jsonb, TRUE, TRUE, now()),
  ('bulk_century_pcc', 'Bulk Century PCC', 'Bulk account reached 100 PCC balance.', 'BULK_WORKFLOW', 'bulk_century_pcc', 100, '{"kind":"bulk_workflow","threshold":100}'::jsonb, TRUE, TRUE, now()),
  ('worker_bulk_verifier_1', 'Bulk Verifier I', 'First bulk verification by worker.', 'WORKER_PERFORMANCE', 'worker_bulk_verifier_1', 1, '{"kind":"worker_performance","threshold":1}'::jsonb, TRUE, TRUE, now()),
  ('worker_bulk_verifier_25', 'Bulk Verifier XXV', '25 bulk verifications completed by worker.', 'WORKER_PERFORMANCE', 'worker_bulk_verifier_25', 25, '{"kind":"worker_performance","threshold":25}'::jsonb, TRUE, TRUE, now()),
  ('worker_bulk_quality_guardian', 'Bulk Quality Guardian', 'Sustained high-score bulk verification quality.', 'WORKER_PERFORMANCE', 'worker_bulk_quality_guardian', 95, '{"kind":"worker_performance","threshold":95}'::jsonb, TRUE, TRUE, now())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  criteria_key = EXCLUDED.criteria_key,
  threshold = EXCLUDED.threshold,
  rule_json = EXCLUDED.rule_json,
  active = TRUE,
  is_active = TRUE;

WITH badge_map AS (
  SELECT 'BULK_FIRST_VERIFIED'::text AS legacy_key, 'bulk_first_verified'::text AS code
  UNION ALL SELECT 'BULK_SEGREGATION_STAR', 'bulk_segregation_star'
  UNION ALL SELECT 'BULK_CENTURY_PCC', 'bulk_century_pcc'
),
legacy_awards AS (
  SELECT
    ba.user_id,
    b.id AS badge_id,
    ba.created_at AS awarded_at,
    jsonb_set(
      COALESCE(ba.metadata, '{}'::jsonb),
      '{source_migrated_from}',
      '"badge_awards"'::jsonb,
      TRUE
    ) AS metadata_json
  FROM badge_awards ba
  JOIN badge_map bm ON bm.legacy_key = ba.badge_key
  JOIN badges b ON b.code = bm.code
)
INSERT INTO user_badges (user_id, badge_id, org_id, metadata_json, awarded_at)
SELECT la.user_id, la.badge_id, NULL, la.metadata_json, la.awarded_at
FROM legacy_awards la
LEFT JOIN user_badges ub
  ON ub.user_id = la.user_id
 AND ub.badge_id = la.badge_id
WHERE ub.id IS NULL;

COMMIT;
