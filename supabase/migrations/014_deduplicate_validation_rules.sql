-- ============================================================================
-- Remove duplicate validation rules created by 009_add_required_rules.sql
-- That migration used ON CONFLICT DO NOTHING, but no unique constraint existed
-- so all 4 rows were inserted as duplicates.
-- ============================================================================

-- Delete duplicate rows — keep the row with the lower id for each
-- (field_name, rule_type, error_message) combination
DELETE FROM validation_rules
WHERE id NOT IN (
  SELECT MIN(id)
  FROM validation_rules
  GROUP BY field_name, rule_type, error_message
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_validation_rules_unique_rule
  ON validation_rules (field_name, rule_type, error_message);
