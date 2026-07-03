import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, createAuditLogSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const [user, error] = await requireAuth(request);
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');

  const admin = getSupabaseAdmin();
  let query = admin
    .from('audit_log')
    .select('*')
    .order('performed_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const [user, error] = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const validation = validateInput(createAuditLogSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error: dbError } = await admin
    .from('audit_log')
    .insert(validation.data)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
