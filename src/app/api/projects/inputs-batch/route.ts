import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

/**
 * Batch-load project inputs for multiple projects.
 * Used by the learning engine to avoid N+1 queries.
 */
export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const { projectIds } = body as { projectIds?: string[] };

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json({ error: 'projectIds array is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('project_inputs')
    .select('*')
    .in('project_id', projectIds);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Return as an object keyed by project_id for easy lookup
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.project_id] = row;
  }
  return NextResponse.json(map);
}
