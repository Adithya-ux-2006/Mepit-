import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [, authError] = await requireAdmin(request);
  if (authError) return authError;
  const entityType = request.nextUrl.searchParams.get('entity_type');
  const entityId = request.nextUrl.searchParams.get('entity_id');
  const admin = getSupabaseAdmin();
  let query = admin.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(250);
  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  const { data, error } = await query;
  if (error) return sanitizeDatabaseError('Read audit log', error);
  return noStoreJson(data ?? []);
}
