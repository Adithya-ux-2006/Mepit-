import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, createProjectSchema } from '@/lib/validations';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const validation = validateInput(createProjectSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const input = validation.data;

  const { data, error: dbError } = await admin
    .from('projects')
    .insert({
      ...input,
      status: 'draft',
      submitted_by: user.dbUserId,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
