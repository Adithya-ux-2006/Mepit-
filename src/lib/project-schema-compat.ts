import type { Project } from '@/types';

export const PROJECT_COLUMNS = 'id, project_name, typology, project_stage, location_city, location_state, project_year, built_up_area, carpet_area, saleable_area, leasable_area, status, source_project_id, submitted_by, approved_by, rejection_reason, created_at, approved_at, version';
export const LEGACY_PROJECT_COLUMNS = 'id, project_name, typology, location_city, location_state, project_year, built_up_area, carpet_area, saleable_area, leasable_area, status, submitted_by, approved_by, rejection_reason, created_at, approved_at, version';

export function isMissingProjectStageSchema(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const text = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();
  return candidate.code === '42703'
    || candidate.code === 'PGRST204'
    || text.includes('project_stage')
    || text.includes('source_project_id');
}

export function normalizeProjectSchema<T extends Record<string, unknown>>(project: T): T & Pick<Project, 'project_stage' | 'source_project_id'> {
  return {
    ...project,
    project_stage: (project.project_stage as Project['project_stage'] | undefined) ?? 'tender',
    source_project_id: (project.source_project_id as string | null | undefined) ?? null,
  };
}

