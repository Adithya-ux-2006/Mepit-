import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/lib/auth';
import type { ProjectStatus } from '@/types';

export const TEAM_VISIBLE_STATUSES: readonly ProjectStatus[] = [
  'submitted',
  'under_review',
  'approved',
];

export interface ProjectAccessRecord {
  id: string;
  submitted_by: string;
  status: ProjectStatus;
}

export function canReadProject(user: AuthUser, project: ProjectAccessRecord): boolean {
  return user.role === 'admin'
    || project.submitted_by === user.dbUserId
    || TEAM_VISIBLE_STATUSES.includes(project.status);
}

export function canMutateProject(user: AuthUser, project: ProjectAccessRecord): boolean {
  return user.role === 'admin'
    || (project.submitted_by === user.dbUserId && ['draft', 'submitted'].includes(project.status));
}

export async function getProjectAccessRecord(
  admin: SupabaseClient,
  projectId: string,
): Promise<ProjectAccessRecord | null> {
  const { data, error } = await admin
    .from('projects')
    .select('id, submitted_by, status')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProjectAccessRecord;
}
