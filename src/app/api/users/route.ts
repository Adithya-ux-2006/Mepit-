import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, upsertUserSchema } from '@/lib/validations';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [, error] = await requireAdmin(request);
  if (error) return error;

  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.createUser);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const validation = validateInput(upsertUserSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const input = validation.data;

  // Check if user already exists
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('email', input.email)
    .single();

  if (existing) return NextResponse.json(existing);

  // New users always get 'contributor' role — ignore any role field from client
  const { data, error: dbError } = await admin
    .from('users')
    .insert({ email: input.email, name: input.name ?? '', role: 'contributor' })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

