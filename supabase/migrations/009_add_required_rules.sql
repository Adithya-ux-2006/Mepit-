-- ============================================================================
-- Add required validation rules for fields that had advisory-only rules
-- These fields already had min_value rules implying they should be present,
-- but null values were previously allowed through silently.
-- ============================================================================

INSERT INTO validation_rules (field_name, rule_type, rule_expression, error_message) VALUES
  ('total_tr', 'required', '{}', 'Total TR is required for submitted projects.'),
  ('tenant_power_kva', 'required', '{}', 'Tenant power capacity is required for submitted projects.'),
  ('transformer_capacity_kva', 'required', '{}', 'Transformer capacity is required for submitted projects.'),
  ('dg_capacity_kva', 'required', '{}', 'DG capacity is required for submitted projects.')
ON CONFLICT DO NOTHING;
