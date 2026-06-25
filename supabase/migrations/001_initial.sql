-- Grüne Project Intelligence Platform - Phase 1 Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (synced with Firebase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT NOT NULL,
  typology TEXT NOT NULL,
  location TEXT NOT NULL,
  built_up_area TEXT NOT NULL,
  project_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Layer 1 (Project Information)
CREATE TABLE IF NOT EXISTS project_layer1 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL DEFAULT '{}'
);

-- Project Layer 2 (Engineering Design Data)
CREATE TABLE IF NOT EXISTS project_layer2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL DEFAULT '{}'
);

-- Project KPIs
CREATE TABLE IF NOT EXISTS project_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kpi_id UUID NOT NULL,
  value TEXT NOT NULL DEFAULT ''
);

-- KPI Master Library
CREATE TABLE IF NOT EXISTS kpi_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_kpis_project_id ON project_kpis(project_id);
CREATE INDEX IF NOT EXISTS idx_project_kpis_kpi_id ON project_kpis(kpi_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_layer1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_layer2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_master ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = current_setting('app.profile_id')::UUID);

-- Projects policies
CREATE POLICY "Contributors can create projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Contributors can update own drafts"
  ON projects FOR UPDATE
  USING (
    created_by = current_setting('app.profile_id')::UUID
    AND status = 'draft'
  );

CREATE POLICY "Admins can update any project"
  ON projects FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = current_setting('app.profile_id')::UUID) = 'admin'
  );

-- Layer policies
CREATE POLICY "Users can view layers"
  ON project_layer1 FOR SELECT
  USING (true);

CREATE POLICY "Users can view layers"
  ON project_layer2 FOR SELECT
  USING (true);

CREATE POLICY "Users can insert layers"
  ON project_layer1 FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can insert layers"
  ON project_layer2 FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update layers"
  ON project_layer1 FOR UPDATE
  USING (true);

CREATE POLICY "Users can update layers"
  ON project_layer2 FOR UPDATE
  USING (true);

-- KPIs policies
CREATE POLICY "Users can view KPIs"
  ON project_kpis FOR SELECT
  USING (true);

CREATE POLICY "Users can manage KPIs"
  ON project_kpis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update KPIs"
  ON project_kpis FOR UPDATE
  USING (true);

-- KPI Master policies
CREATE POLICY "Everyone can view KPI master"
  ON kpi_master FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage KPI master"
  ON kpi_master FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = current_setting('app.profile_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can update KPI master"
  ON kpi_master FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = current_setting('app.profile_id')::UUID) = 'admin'
  );

CREATE POLICY "Admins can delete KPI master"
  ON kpi_master FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = current_setting('app.profile_id')::UUID) = 'admin'
  );

-- Seed KPI definitions
INSERT INTO kpi_master (name, category, unit, description) VALUES
  ('MEP Rs/Sqft', 'Cost', 'Rs/Sqft', 'MEP cost per square foot'),
  ('Sqft/TR', 'Efficiency', 'Sqft/TR', 'Area per ton of refrigeration'),
  ('Plant Room %', 'Space', '%', 'Plant room area as percentage of built-up area'),
  ('Shaft %', 'Space', '%', 'Shaft area as percentage of built-up area')
ON CONFLICT DO NOTHING;
