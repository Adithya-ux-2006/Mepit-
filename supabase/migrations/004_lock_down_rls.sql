-- Migration 004: Lock down RLS policies
-- All data access now goes through server-side API routes using service-role key
-- which bypasses RLS. The anon key should not have any direct data access.
-- With RLS enabled and no permissive policies, all anon-key queries are denied.

-- ============================================================================
-- USERS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- ============================================================================
-- PROJECTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can insert projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Contributors can update own drafts" ON projects;
DROP POLICY IF EXISTS "Admins can update any project" ON projects;

-- ============================================================================
-- PROJECT INPUTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can insert project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Anyone can view project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Contributors can update own project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Admins can update any project inputs" ON project_inputs;

-- ============================================================================
-- KPI FORMULAS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can manage KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can update KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can delete KPI formulas" ON kpi_formulas;

-- ============================================================================
-- KPI OUTPUTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view KPI outputs" ON project_kpi_outputs;
DROP POLICY IF EXISTS "Formula engine can insert KPI outputs" ON project_kpi_outputs;

-- ============================================================================
-- VALIDATION RULES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can manage validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can update validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can delete validation rules" ON validation_rules;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view audit log" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;
