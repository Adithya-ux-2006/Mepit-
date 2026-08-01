import { getSupabaseAdmin } from '@/lib/supabase-server';
import { TEAM_VISIBLE_STATUSES } from '@/lib/project-access';
import type { AuthUser } from '@/lib/auth';
import type { AuditLog, KpiFormula, Project } from '@/types';

export interface DashboardData {
  projects: Project[];
  formulas: KpiFormula[];
  recentActivity: AuditLog[];
}

export async function loadDashboardData(user: AuthUser): Promise<DashboardData> {
  const admin = getSupabaseAdmin();
  let projectsQuery = admin.from('projects').select('*');
  if (user.role !== 'admin') {
    projectsQuery = projectsQuery.or(
      'submitted_by.eq.' + user.dbUserId + ',status.in.(' + TEAM_VISIBLE_STATUSES.join(',') + ')',
    );
  }

  const activityPromise = user.role === 'admin'
    ? admin.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(10)
    : Promise.resolve({ data: [], error: null });
  const [projectsResult, formulasResult, adminActivity] = await Promise.all([
    projectsQuery.order('created_at', { ascending: false }),
    admin.from('kpi_formulas').select('*').eq('is_active', true).order('category'),
    activityPromise,
  ]);
  const queryError = projectsResult.error ?? formulasResult.error ?? adminActivity.error;
  if (queryError) throw queryError;

  const projects = (projectsResult.data ?? []) as Project[];
  let recentActivity = (adminActivity.data ?? []) as AuditLog[];
  if (user.role !== 'admin') {
    const ownIds = projects
      .filter((project) => project.submitted_by === user.dbUserId)
      .map((project) => project.id);
    if (ownIds.length) {
      const activity = await admin.from('audit_log')
        .select('id, entity_type, entity_id, action, performed_at, metadata')
        .in('entity_id', ownIds).order('performed_at', { ascending: false }).limit(10);
      if (activity.error) throw activity.error;
      recentActivity = (activity.data ?? []).map((entry) => ({
        ...entry,
        performed_by: user.dbUserId,
      })) as AuditLog[];
    }
  }

  return {
    projects,
    formulas: (formulasResult.data ?? []) as KpiFormula[],
    recentActivity,
  };
}
