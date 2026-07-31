-- Link stage snapshots that belong to the same underlying project while
-- preserving each snapshot's independent inputs, KPIs, and review status.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_source_project
  ON projects(source_project_id);
