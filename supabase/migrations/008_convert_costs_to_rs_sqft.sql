CREATE TABLE IF NOT EXISTS project_input_cost_migration_issues (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  issue_reason TEXT NOT NULL,
  built_up_area NUMERIC,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO project_input_cost_migration_issues (project_id, issue_reason, built_up_area)
SELECT p.id, 'built_up_area_missing_or_zero', p.built_up_area
FROM project_inputs pi
JOIN projects p ON p.id = pi.project_id
WHERE p.built_up_area IS NULL OR p.built_up_area = 0
ON CONFLICT (project_id) DO UPDATE SET
  issue_reason = EXCLUDED.issue_reason,
  built_up_area = EXCLUDED.built_up_area,
  logged_at = NOW();

UPDATE project_inputs pi
SET
  hvac_cost = ROUND(pi.hvac_cost / p.built_up_area, 2),
  electrical_cost = ROUND(pi.electrical_cost / p.built_up_area, 2),
  dg_cost = ROUND(pi.dg_cost / p.built_up_area, 2),
  fire_fighting_cost = ROUND(pi.fire_fighting_cost / p.built_up_area, 2),
  stp_cost = ROUND(pi.stp_cost / p.built_up_area, 2),
  phe_cost = ROUND(pi.phe_cost / p.built_up_area, 2),
  bms_cost = ROUND(pi.bms_cost / p.built_up_area, 2),
  fapa_cost = ROUND(pi.fapa_cost / p.built_up_area, 2),
  cctv_cost = ROUND(pi.cctv_cost / p.built_up_area, 2),
  total_mep_cost = ROUND(pi.total_mep_cost / p.built_up_area, 2)
FROM projects p
WHERE p.id = pi.project_id
  AND p.built_up_area IS NOT NULL
  AND p.built_up_area <> 0;

UPDATE validation_rules
SET rule_expression = jsonb_set(rule_expression, '{value_already_normalized}', 'true'::jsonb, true)
WHERE field_name IN (
  'hvac_cost',
  'electrical_cost',
  'stp_cost',
  'bms_cost',
  'fapa_cost',
  'cctv_cost'
)
  AND rule_type = 'cross_field';
