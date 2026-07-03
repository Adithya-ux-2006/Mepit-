-- =============================================================================
-- Migration 005: Definitive RLS Lockdown
-- All data access goes through server-side API routes using the service-role
-- key (which bypasses RLS). The anon key must have ZERO direct database access.
--
-- This migration:
--   1. Re-enables RLS on every table (in case it was manually disabled)
--   2. Creates a single permissive SELECT/INSERT/UPDATE/DELETE policy for
--      the authenticated role that always returns false — effectively a
--      blanket deny for any client-side query using the anon or authenticated
--      keys through the PostgREST API.
--   3. The service-role key bypasses RLS entirely, so server-side API routes
--      are unaffected.
-- =============================================================================

-- ── Re-enable RLS on every application table ────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kpi_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ── Drop ALL existing policies to start clean ──────────────────────────────
-- Users
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Projects
DROP POLICY IF EXISTS "Anyone can insert projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Contributors can update own drafts" ON projects;
DROP POLICY IF EXISTS "Admins can update any project" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Contributors can create projects" ON projects;
DROP POLICY IF EXISTS "Contributors can update own drafts" ON projects;

-- Project inputs
DROP POLICY IF EXISTS "Anyone can insert project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Anyone can view project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Contributors can update own project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Admins can update any project inputs" ON project_inputs;
DROP POLICY IF EXISTS "Users can view layers" ON project_inputs;

-- KPI formulas
DROP POLICY IF EXISTS "Anyone can view KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can manage KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can update KPI formulas" ON kpi_formulas;
DROP POLICY IF EXISTS "Admins can delete KPI formulas" ON kpi_formulas;

-- KPI outputs
DROP POLICY IF EXISTS "Anyone can view KPI outputs" ON project_kpi_outputs;
DROP POLICY IF EXISTS "Formula engine can insert KPI outputs" ON project_kpi_outputs;
DROP POLICY IF EXISTS "Users can view KPIs" ON project_kpi_outputs;
DROP POLICY IF EXISTS "Users can manage KPIs" ON project_kpi_outputs;
DROP POLICY IF EXISTS "Users can update KPIs" ON project_kpi_outputs;

-- Validation rules
DROP POLICY IF EXISTS "Anyone can view validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can manage validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can update validation rules" ON validation_rules;
DROP POLICY IF EXISTS "Admins can delete validation rules" ON validation_rules;

-- Audit log
DROP POLICY IF EXISTS "Anyone can view audit log" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;

-- ── Create blanket deny-all policies ───────────────────────────────────────
-- With RLS enabled and no permissive policies, all queries from the anon key
-- are denied. We add explicit deny policies as defense-in-depth.
--
-- IMPORTANT: The service-role key bypasses RLS entirely, so all server-side
-- API routes (which use getSupabaseAdmin()) continue to work normally.

-- Users
CREATE POLICY "Deny all anon access" ON users FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- Projects
CREATE POLICY "Deny all anon access" ON projects FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- Project inputs
CREATE POLICY "Deny all anon access" ON project_inputs FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- KPI formulas
CREATE POLICY "Deny all anon access" ON kpi_formulas FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- KPI outputs
CREATE POLICY "Deny all anon access" ON project_kpi_outputs FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- Validation rules
CREATE POLICY "Deny all anon access" ON validation_rules FOR ALL
  TO anon USING (false) WITH CHECK (false);

-- Audit log
CREATE POLICY "Deny all anon access" ON audit_log FOR ALL
  TO anon USING (false) WITH CHECK (false);
