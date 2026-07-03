import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const admin = getSupabaseAdmin();

  const { data, error: dbError } = await admin
    .from('kpi_formulas')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error: dbError } = await admin
    .from('kpi_formulas')
    .delete()
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
