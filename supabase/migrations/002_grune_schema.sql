-- Grüne Project Intelligence Platform - Blueprint Schema v2

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('contributor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kpi_category AS ENUM ('Space Planning', 'HVAC', 'Electrical', 'DG', 'Sustainability', 'Cost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rule_type AS ENUM ('required', 'min_value', 'max_value', 'cross_field');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users (replaces profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'contributor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT NOT NULL,
  typology TEXT NOT NULL,
  location_city TEXT NOT NULL DEFAULT '',
  location_state TEXT NOT NULL DEFAULT '',
  project_year INTEGER NOT NULL,
  built_up_area NUMERIC NOT NULL DEFAULT 0,
  carpet_area NUMERIC NOT NULL DEFAULT 0,
  saleable_area NUMERIC NOT NULL DEFAULT 0,
  leasable_area NUMERIC NOT NULL DEFAULT 0,
  status project_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

-- Project Inputs (engineering design parameters from the workbook)
CREATE TABLE IF NOT EXISTS project_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  -- Space / Area
  plant_room_area NUMERIC,
  leasable_plant_room_area NUMERIC,
  shaft_area NUMERIC,
  office_area NUMERIC,
  fb_area NUMERIC,
  gross_area NUMERIC,
  -- HVAC
  occupancy_density_office NUMERIC,
  occupancy_density_fb NUMERIC,
  total_tr NUMERIC,
  total_airflow_cfm NUMERIC,
  hvac_strategy TEXT,
  -- Electrical
  transformer_capacity_kva NUMERIC,
  tenant_power_kva NUMERIC,
  common_area_power_kva NUMERIC,
  lighting_load_w NUMERIC,
  -- DG
  dg_capacity_kva NUMERIC,
  dg_loading_factor NUMERIC,
  -- Energy
  annual_energy_kwh NUMERIC,
  -- Cost
  hvac_cost NUMERIC,
  electrical_cost NUMERIC,
  dg_cost NUMERIC,
  fire_fighting_cost NUMERIC,
  stp_cost NUMERIC,
  phe_cost NUMERIC,
  bms_cost NUMERIC,
  fapa_cost NUMERIC,
  cctv_cost NUMERIC,
  total_mep_cost NUMERIC,
  -- Flexibility
  extended_fields JSONB NOT NULL DEFAULT '{}',
  operating_hours NUMERIC DEFAULT 3000
);

-- KPI Formula Library
CREATE TABLE IF NOT EXISTS kpi_formulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_code TEXT UNIQUE NOT NULL,
  kpi_name TEXT NOT NULL,
  category kpi_category NOT NULL,
  numerator_expression TEXT NOT NULL DEFAULT '',
  denominator_expression TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project KPI Outputs (calculated after approval)
CREATE TABLE IF NOT EXISTS project_kpi_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kpi_formula_id UUID NOT NULL REFERENCES kpi_formulas(id),
  calculated_value NUMERIC,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engine_version TEXT NOT NULL DEFAULT '1.0',
  reason_flag TEXT
);

-- Validation Rules
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL,
  rule_type rule_type NOT NULL,
  rule_expression JSONB NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_typology ON projects(typology);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects(project_year);
CREATE INDEX IF NOT EXISTS idx_project_inputs_project ON project_inputs(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_outputs_project ON project_kpi_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_outputs_formula ON project_kpi_outputs(kpi_formula_id);
CREATE INDEX IF NOT EXISTS idx_kpi_formulas_code ON kpi_formulas(kpi_code);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed ON audit_log(performed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kpi_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users: everyone can read, only admins can insert/update roles
CREATE POLICY "Anyone can view users"
  ON users FOR SELECT USING (true);

CREATE POLICY "Admins can manage users"
  ON users FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

-- Projects: contributors create, everyone reads, only own drafts editable, admins approve/reject
CREATE POLICY "Anyone can insert projects"
  ON projects FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT USING (true);

CREATE POLICY "Contributors can update own drafts"
  ON projects FOR UPDATE
  USING (
    submitted_by = current_setting('app.user_id')::UUID
    AND status IN ('draft', 'submitted')
  );

CREATE POLICY "Admins can update any project"
  ON projects FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

-- Project inputs: same as projects
CREATE POLICY "Anyone can insert project inputs"
  ON project_inputs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view project inputs"
  ON project_inputs FOR SELECT USING (true);

CREATE POLICY "Contributors can update own project inputs"
  ON project_inputs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_inputs.project_id
      AND projects.submitted_by = current_setting('app.user_id')::UUID
      AND projects.status IN ('draft', 'submitted')
    )
  );

CREATE POLICY "Admins can update any project inputs"
  ON project_inputs FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

-- KPI formulas: everyone reads, admins manage
CREATE POLICY "Anyone can view KPI formulas"
  ON kpi_formulas FOR SELECT USING (true);

CREATE POLICY "Admins can manage KPI formulas"
  ON kpi_formulas FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can update KPI formulas"
  ON kpi_formulas FOR UPDATE USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can delete KPI formulas"
  ON kpi_formulas FOR DELETE USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

-- KPI outputs: everyone reads, formula engine inserts
CREATE POLICY "Anyone can view KPI outputs"
  ON project_kpi_outputs FOR SELECT USING (true);

CREATE POLICY "Formula engine can insert KPI outputs"
  ON project_kpi_outputs FOR INSERT WITH CHECK (true);

-- Validation rules: everyone reads, admins manage
CREATE POLICY "Anyone can view validation rules"
  ON validation_rules FOR SELECT USING (true);

CREATE POLICY "Admins can manage validation rules"
  ON validation_rules FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can update validation rules"
  ON validation_rules FOR UPDATE USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can delete validation rules"
  ON validation_rules FOR DELETE USING (
    (SELECT role FROM users WHERE id = current_setting('app.user_id')::UUID) = 'admin'
  );

-- Audit log: append-only, everyone reads
CREATE POLICY "Anyone can view audit log"
  ON audit_log FOR SELECT USING (true);

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SEED: KPI Formula Library (25 KPIs)
-- ============================================================================
INSERT INTO kpi_formulas (kpi_code, kpi_name, category, numerator_expression, denominator_expression, unit, description) VALUES
  ('PLANT_ROOM_PCT', 'Plant Room %', 'Space Planning', 'Plant Room Area', 'BUA', '%', 'Percentage of built-up area occupied by plant rooms'),
  ('LEASABLE_PLANT_ROOM_PCT', 'Leasable Plant Room %', 'Space Planning', 'Leasable Plant Room Area', 'BUA', '%', 'Percentage of built-up area occupied by leasable plant rooms'),
  ('SHAFT_AREA_PCT', 'Shaft Area %', 'Space Planning', 'Shaft Area', 'BUA', '%', 'Percentage of built-up area occupied by shafts'),
  ('POPULATION', 'Population', 'HVAC', '(Office Area ÷ Office Density) + (F&B Area ÷ F&B Density)', '', 'Persons', 'Total building population based on area and occupancy density'),
  ('COOLING_LOAD_DENSITY', 'Cooling Load Density', 'HVAC', 'Carpet Area', 'Total TR', 'sqft/TR', 'Carpet area served per ton of refrigeration'),
  ('CFM_SQFT', 'CFM/sqft', 'HVAC', 'Total Airflow', 'Carpet Area', 'CFM/sqft', 'Airflow rate per square foot of carpet area'),
  ('KW_PER_TR', 'kW/TR', 'HVAC', 'Annual Energy', 'Total TR × Operating Hours', 'kW/TR', 'Chiller plant efficiency — energy consumed per ton of refrigeration'),
  ('HVAC_RS_SQFT', 'HVAC Rs/sqft', 'Cost', 'HVAC Cost', 'BUA', 'Rs/sqft', 'HVAC system cost per square foot of built-up area'),
  ('TOTAL_VA_SQFT_CARPET', 'Total VA/sqft (Carpet)', 'Electrical', '(Tenant Power + Common Area Power) × 1000', 'Carpet Area', 'VA/sqft', 'Electrical power density based on carpet area'),
  ('TOTAL_VA_SQFT_SALEABLE', 'Total VA/sqft (Saleable)', 'Electrical', '(Tenant Power + Common Area Power) × 1000', 'Saleable Area', 'VA/sqft', 'Electrical power density based on saleable area'),
  ('TOTAL_VA_SQFT_BUA', 'Total VA/sqft (BUA)', 'Electrical', '(Tenant Power + Common Area Power) × 1000', 'BUA', 'VA/sqft', 'Electrical power density based on built-up area'),
  ('TRANSFORMER_DENSITY', 'Transformer Density', 'Electrical', 'Transformer Capacity × 1000', 'BUA', 'VA/sqft', 'Transformer capacity per square foot of built-up area'),
  ('LIGHTING_W_SQFT', 'Lighting W/sqft', 'Electrical', 'Lighting Load', 'Carpet Area', 'W/sqft', 'Lighting power density based on carpet area'),
  ('DG_LOAD_DENSITY', 'DG Load Density', 'DG', 'DG Capacity', 'BUA', 'kVA/sqft', 'DG installed capacity per square foot of built-up area'),
  ('DG_CAPACITY_DENSITY', 'DG Capacity Density', 'DG', 'DG Capacity × Loading Factor', 'BUA', 'kVA/sqft', 'DG actual load per square foot of built-up area'),
  ('EPI', 'EPI', 'Sustainability', 'Annual Energy', 'Gross Area', 'kWh/sqft/yr', 'Energy Performance Index — annual energy per square foot'),
  ('TOTAL_MEP_RS_SQFT', 'Total MEP Rs/sqft', 'Cost', 'Total MEP Cost', 'BUA', 'Rs/sqft', 'Total MEP cost per square foot of built-up area'),
  ('ELECTRICAL_RS_SQFT', 'Electrical Rs/sqft', 'Cost', 'Electrical Cost', 'BUA', 'Rs/sqft', 'Electrical system cost per square foot of built-up area'),
  ('DG_RS_SQFT', 'DG Rs/sqft', 'Cost', 'DG Cost', 'BUA', 'Rs/sqft', 'DG system cost per square foot of built-up area'),
  ('FF_RS_SQFT', 'Fire Fighting Rs/sqft', 'Cost', 'Fire Fighting Cost', 'BUA', 'Rs/sqft', 'Fire fighting system cost per square foot of built-up area'),
  ('STP_RS_SQFT', 'STP Rs/sqft', 'Cost', 'STP Cost', 'BUA', 'Rs/sqft', 'STP cost per square foot of built-up area'),
  ('PHE_RS_SQFT', 'PHE Rs/sqft', 'Cost', 'PHE Cost', 'BUA', 'Rs/sqft', 'PHE system cost per square foot of built-up area'),
  ('BMS_RS_SQFT', 'BMS Rs/sqft', 'Cost', 'BMS Cost', 'BUA', 'Rs/sqft', 'BMS cost per square foot of built-up area'),
  ('FAPA_RS_SQFT', 'FAPA Rs/sqft', 'Cost', 'FAPA Cost', 'BUA', 'Rs/sqft', 'Fire alarm and PA system cost per square foot of built-up area'),
  ('CCTV_RS_SQFT', 'CCTV Rs/sqft', 'Cost', 'CCTV Cost', 'BUA', 'Rs/sqft', 'CCTV system cost per square foot of built-up area')
ON CONFLICT (kpi_code) DO NOTHING;

-- ============================================================================
-- SEED: Validation Rules
-- ============================================================================
INSERT INTO validation_rules (field_name, rule_type, rule_expression, error_message) VALUES
  ('built_up_area', 'required', '{"min": 1}', 'Built-up area is required and must be greater than zero.'),
  ('built_up_area', 'min_value', '{"min": 100}', 'Built-up area seems too low for a commercial project.'),
  ('carpet_area', 'required', '{"min": 1}', 'Carpet area is required and must be greater than zero.'),
  ('carpet_area', 'cross_field', '{"max_field": "built_up_area"}', 'Carpet area cannot exceed built-up area.'),
  ('dg_loading_factor', 'min_value', '{"min": 0}', 'DG loading factor must be between 0 and 1.'),
  ('dg_loading_factor', 'max_value', '{"max": 1}', 'DG loading factor must be between 0 and 1.'),
  ('total_tr', 'min_value', '{"min": 1}', 'Total TR must be greater than zero for HVAC projects.'),
  ('total_mep_cost', 'cross_field', '{"min_sum_of": ["hvac_cost", "electrical_cost", "dg_cost", "fire_fighting_cost", "stp_cost", "phe_cost", "bms_cost", "fapa_cost", "cctv_cost"]}', 'Total MEP cost should equal the sum of all package costs.'),
  ('annual_energy_kwh', 'min_value', '{"min": 1}', 'Annual energy consumption must be greater than zero if provided.');
