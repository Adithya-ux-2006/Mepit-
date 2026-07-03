import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status?: string };

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const update: Record<string, unknown> = { status };
  if (status === 'approved') {
    update.approved_at = new Date().toISOString();
    update.approved_by = user.dbUserId; // Always use server-side identity, never trust client
  }

  const { error: dbError } = await admin
    .from('projects')
    .update(update)
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
