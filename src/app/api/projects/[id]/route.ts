import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

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
  const admin = getSupabaseAdmin();

  // Contributors can only update their own drafts
  if (user.role !== 'admin') {
    const { data: project } = await admin
      .from('projects')
      .select('submitted_by, status')
      .eq('id', id)
      .single();

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (project.submitted_by !== user.dbUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!['draft', 'submitted'].includes(project.status)) {
      return NextResponse.json({ error: 'Cannot edit projects in current status' }, { status: 403 });
    }
  }

  const { data, error: dbError } = await admin
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
