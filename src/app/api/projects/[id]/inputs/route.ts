import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, projectInputsSchema } from '@/lib/validations';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canMutateProject, canReadProject, getProjectAccessRecord } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canReadProject(user, access)) return noStoreJson({ error: 'Not found' }, { status: 404 });
  const { data, error } = await admin.from('project_inputs').select('*').eq('project_id', id).maybeSingle();
  if (error) return sanitizeDatabaseError('Read project inputs', error);
  return noStoreJson(data ?? null);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const validation = validateInput(projectInputsSchema, await request.json().catch(() => null));
  if (!validation.success) return noStoreJson({ error: validation.errors.join('; ') }, { status: 400 });
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canMutateProject(user, access)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });
  const payload = { project_id: id, ...validation.data };
  const { data: existing, error: existingError } = await admin.from('project_inputs').select('id').eq('project_id', id).maybeSingle();
  if (existingError) return sanitizeDatabaseError('Check project inputs', existingError);
  const query = existing ? admin.from('project_inputs').update(payload).eq('project_id', id) : admin.from('project_inputs').insert(payload);
  const { data, error } = await query.select().single();
  if (error || !data) return sanitizeDatabaseError('Save project inputs', error);
  await admin.from('audit_log').insert({
    entity_type: 'project', entity_id: id, action: 'inputs_updated', performed_by: user.dbUserId,
    metadata: { fields: Object.keys(validation.data) },
  });
  return noStoreJson(data, { status: existing ? 200 : 201 });
}
