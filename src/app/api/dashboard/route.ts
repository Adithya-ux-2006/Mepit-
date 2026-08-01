import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [, authError] = await requireAuth(request);
  if (authError) return authError;

  const admin = getSupabaseAdmin();
  const [projectsResult, formulasResult, activityResult] = await Promise.all([
    admin.from('projects').select('*').order('created_at', { ascending: false }),
    admin
      .from('kpi_formulas')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true }),
    admin
      .from('audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(10),
  ]);

  const queryError = projectsResult.error ?? formulasResult.error ?? activityResult.error;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: projectsResult.data ?? [],
    formulas: formulasResult.data ?? [],
    recentActivity: activityResult.data ?? [],
  });
}
