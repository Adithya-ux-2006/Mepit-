import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canMutateProject, canReadProject, getProjectAccessRecord } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import { updateProjectSchema, validateInput } from '@/lib/validations';
import { LEGACY_PROJECT_COLUMNS, PROJECT_COLUMNS, isMissingProjectStageSchema, normalizeProjectSchema } from '@/lib/project-schema-compat';


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canReadProject(user, access)) return noStoreJson({ error: 'Not found' }, { status: 404 });
  let result = await admin.from('projects').select(PROJECT_COLUMNS).eq('id', id).single();
  if (isMissingProjectStageSchema(result.error)) {
    result = await admin.from('projects').select(LEGACY_PROJECT_COLUMNS).eq('id', id).single();
  }
  if (result.error || !result.data) return sanitizeDatabaseError('Read project', result.error);
  return noStoreJson(normalizeProjectSchema(result.data as unknown as Record<string, unknown>));
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
