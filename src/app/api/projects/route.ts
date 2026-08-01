import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, createProjectSchema } from '@/lib/validations';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { TEAM_VISIBLE_STATUSES, canReadProject } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import type { ProjectStatus } from '@/types';

const PROJECT_COLUMNS = 'id, project_name, typology, project_stage, location_city, location_state, project_year, built_up_area, carpet_area, saleable_area, leasable_area, status, source_project_id, submitted_by, approved_by, rejection_reason, created_at, approved_at, version';
const VALID_STATUSES: ProjectStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;

  const submittedBy = request.nextUrl.searchParams.get('submitted_by');
  const requestedStatuses = request.nextUrl.searchParams.get('status_in')
    ?.split(',').filter((status): status is ProjectStatus => VALID_STATUSES.includes(status as ProjectStatus));
  const admin = getSupabaseAdmin();
  let query = admin.from('projects').select(PROJECT_COLUMNS);
  if (user.role !== 'admin') {
    query = query.or('submitted_by.eq.' + user.dbUserId + ',status.in.(' + TEAM_VISIBLE_STATUSES.join(',') + ')');
  }
  if (submittedBy) {
    if (user.role !== 'admin' && submittedBy !== user.dbUserId) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }
    query = query.eq('submitted_by', submittedBy);
  }
  if (requestedStatuses?.length) query = query.in('status', requestedStatuses);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return sanitizeDatabaseError('List projects', error);
  return noStoreJson(data ?? []);
}

export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const validation = validateInput(createProjectSchema, await request.json().catch(() => null));
  if (!validation.success) return noStoreJson({ error: validation.errors.join('; ') }, { status: 400 });

  const admin = getSupabaseAdmin();
  const input = validation.data;
  let sourceProjectId = input.source_project_id ?? null;
  if (sourceProjectId) {
    const { data: sourceProject, error: sourceError } = await admin
      .from('projects').select('id, source_project_id, submitted_by, status').eq('id', sourceProjectId).single();
    if (sourceError || !sourceProject || !canReadProject(user, sourceProject)) {
      return noStoreJson({ error: 'Source project not found' }, { status: 404 });
    }
    sourceProjectId = sourceProject.source_project_id ?? sourceProject.id;
    const { data: existingStage, error: stageError } = await admin.from('projects').select('id')
      .eq('project_stage', input.project_stage)
      .or('id.eq.' + sourceProjectId + ',source_project_id.eq.' + sourceProjectId).limit(1);
    if (stageError) return sanitizeDatabaseError('Check project stage', stageError);
    if (existingStage?.length) return noStoreJson({ error: 'This project stage already exists' }, { status: 409 });
  }

  const { data, error } = await admin.from('projects').insert({
    ...input, source_project_id: sourceProjectId, status: 'draft', submitted_by: user.dbUserId,
  }).select(PROJECT_COLUMNS).single();
  if (error || !data) return sanitizeDatabaseError('Create project', error);
  await admin.from('audit_log').insert({
    entity_type: 'project', entity_id: data.id, action: 'created', performed_by: user.dbUserId,
    metadata: { project_stage: data.project_stage },
  });
  return noStoreJson(data, { status: 201 });
}
