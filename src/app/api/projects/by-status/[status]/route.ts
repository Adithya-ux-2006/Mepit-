import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const { status } = await params;
  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('projects')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
