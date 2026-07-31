-- Store the design snapshot's project stage so stage-specific workbook values
-- remain distinguishable throughout review, comparison, and repository views.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_stage TEXT NOT NULL DEFAULT 'tender';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_project_stage_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_project_stage_check CHECK (
    project_stage IN (
      'concept',
      'schematic',
      'design_development',
      'tender',
      'design_build_tender',
      'post_tender',
      'gfc',
      'execution',
      'final',
      'completed'
    )
  );

CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(project_stage);
