import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canMutateProject, canReadProject, getProjectAccessRecord } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import { updateProjectSchema, validateInput } from '@/lib/validations';

const PROJECT_COLUMNS = 'id, project_name, typology, project_stage, location_city, location_state, project_year, built_up_area, carpet_area, saleable_area, leasable_area, status, source_project_id, submitted_by, approved_by, rejection_reason, created_at, approved_at, version';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canReadProject(user, access)) return noStoreJson({ error: 'Not found' }, { status: 404 });
  const { data, error } = await admin.from('projects').select(PROJECT_COLUMNS).eq('id', id).single();
  if (error || !data) return sanitizeDatabaseError('Read project', error);
  return noStoreJson(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const validation = validateInput(updateProjectSchema, await request.json().catch(() => null));
  if (!validation.success) return noStoreJson({ error: validation.errors.join('; ') }, { status: 400 });
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canMutateProject(user, access)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await admin.from('projects').update(validation.data).eq('id', id).select(PROJECT_COLUMNS).single();
  if (error || !data) return sanitizeDatabaseError('Update project', error);
  await admin.from('audit_log').insert({
    entity_type: 'project', entity_id: id, action: 'project_updated', performed_by: user.dbUserId,
    metadata: { fields: Object.keys(validation.data) },
  });
  return noStoreJson(data);
}
