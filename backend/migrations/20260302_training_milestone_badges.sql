BEGIN;

INSERT INTO badges (code, name, description, category, criteria_key, threshold, rule_json, active, is_active, created_at)
VALUES
  ('citizen_training_3', 'Citizen Training Bronze', 'Completed 3 citizen training modules.', 'TRAINING', 'citizen_training_3', 3, '{"kind":"training_milestone","audience":"citizen","threshold":3}'::jsonb, TRUE, TRUE, now()),
  ('citizen_training_5', 'Citizen Training Silver', 'Completed 5 citizen training modules.', 'TRAINING', 'citizen_training_5', 5, '{"kind":"training_milestone","audience":"citizen","threshold":5}'::jsonb, TRUE, TRUE, now()),
  ('citizen_training_10', 'Citizen Training Gold', 'Completed 10 citizen training modules.', 'TRAINING', 'citizen_training_10', 10, '{"kind":"training_milestone","audience":"citizen","threshold":10}'::jsonb, TRUE, TRUE, now()),
  ('bulk_training_1', 'Bulk Training Starter', 'Completed 1 bulk training module.', 'TRAINING', 'bulk_training_1', 1, '{"kind":"training_milestone","audience":"bulk_generator","threshold":1}'::jsonb, TRUE, TRUE, now()),
  ('bulk_training_3', 'Bulk Training Operator', 'Completed 3 bulk training modules.', 'TRAINING', 'bulk_training_3', 3, '{"kind":"training_milestone","audience":"bulk_generator","threshold":3}'::jsonb, TRUE, TRUE, now()),
  ('bulk_training_5', 'Bulk Training Specialist', 'Completed 5 bulk training modules.', 'TRAINING', 'bulk_training_5', 5, '{"kind":"training_milestone","audience":"bulk_generator","threshold":5}'::jsonb, TRUE, TRUE, now())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  criteria_key = EXCLUDED.criteria_key,
  threshold = EXCLUDED.threshold,
  rule_json = EXCLUDED.rule_json,
  active = TRUE,
  is_active = TRUE;

COMMIT;
