import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { TEAM_VISIBLE_STATUSES } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import type { ProjectStatus } from '@/types';

const VALID_STATUSES: ProjectStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];

export async function GET(request: NextRequest, { params }: { params: Promise<{ status: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { status } = await params;
  if (!VALID_STATUSES.includes(status as ProjectStatus)) return noStoreJson({ error: 'Invalid status' }, { status: 400 });
  const admin = getSupabaseAdmin();
  let query = admin.from('projects').select('*').eq('status', status);
  if (user.role !== 'admin' && !TEAM_VISIBLE_STATUSES.includes(status as ProjectStatus)) {
    query = query.eq('submitted_by', user.dbUserId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return sanitizeDatabaseError('List projects by status', error);
  return noStoreJson(data ?? []);
}
