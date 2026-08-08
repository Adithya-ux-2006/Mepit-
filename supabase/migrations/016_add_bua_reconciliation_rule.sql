-- Add validation rule: Total Built Up Area should equal Substructure + Superstructure
-- Uses cross_field with min_sum_of (which checks near-equality within tolerance)
INSERT INTO validation_rules (field_name, rule_type, rule_expression, error_message)
VALUES (
  'built_up_area',
  'cross_field',
  '{"min_sum_of": ["bua_substructure", "bua_superstructure"], "tolerance_pct": 0.01}',
  'Total Built Up Area should equal the sum of Substructure and Superstructure areas.'
)
ON CONFLICT DO NOTHING;
