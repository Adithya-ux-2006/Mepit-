import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { validateInput, updateValidationRuleSchema } from '@/lib/validations';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [, error] = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const validation = validateInput(updateValidationRuleSchema, await request.json().catch(() => null));
  if (!validation.success) return noStoreJson({ error: validation.errors.join('; ') }, { status: 400 });
  const admin = getSupabaseAdmin();

  const { data, error: dbError } = await admin
    .from('validation_rules')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();

  if (dbError) return sanitizeDatabaseError('Validation rule operation', dbError);
  return noStoreJson(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [, error] = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error: dbError } = await admin
    .from('validation_rules')
    .delete()
    .eq('id', id);

  if (dbError) return sanitizeDatabaseError('Validation rule operation', dbError);
  return noStoreJson({ success: true });
}
