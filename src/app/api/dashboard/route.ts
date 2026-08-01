import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { TEAM_VISIBLE_STATUSES } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;

  const admin = getSupabaseAdmin();
  let projectsQuery = admin.from('projects').select('*');
  if (user.role !== 'admin') {
    projectsQuery = projectsQuery.or('submitted_by.eq.' + user.dbUserId + ',status.in.(' + TEAM_VISIBLE_STATUSES.join(',') + ')');
  }
  const [projectsResult, formulasResult] = await Promise.all([
    projectsQuery.order('created_at', { ascending: false }),
    admin.from('kpi_formulas').select('*').eq('is_active', true).order('category'),
  ]);
  const queryError = projectsResult.error ?? formulasResult.error;
  if (queryError) return sanitizeDatabaseError('Load dashboard', queryError);

  const visibleProjects = projectsResult.data ?? [];
  let recentActivity: Array<Record<string, unknown>> = [];
  if (user.role === 'admin') {
    const activity = await admin.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(10);
    if (activity.error) return sanitizeDatabaseError('Load dashboard activity', activity.error);
    recentActivity = activity.data ?? [];
  } else {
    const ownIds = visibleProjects.filter((project) => project.submitted_by === user.dbUserId).map((project) => project.id);
    if (ownIds.length) {
      const activity = await admin.from('audit_log')
        .select('id, entity_type, entity_id, action, performed_at, metadata')
        .in('entity_id', ownIds).order('performed_at', { ascending: false }).limit(10);
      if (activity.error) return sanitizeDatabaseError('Load dashboard activity', activity.error);
      recentActivity = (activity.data ?? []).map((entry) => ({ ...entry, performed_by: user.dbUserId }));
    }
  }

  return noStoreJson({ projects: visibleProjects, formulas: formulasResult.data ?? [], recentActivity });
}
