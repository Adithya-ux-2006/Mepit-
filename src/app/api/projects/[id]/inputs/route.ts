import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, projectInputsSchema } from '@/lib/validations';
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
    .from('project_inputs')
    .select('*')
    .eq('project_id', id)
    .single();

  if (dbError && dbError.code !== 'PGRST116') {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, error] = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const validation = validateInput(projectInputsSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Ownership check: contributors can only update inputs for their own projects
  if (user.role !== 'admin') {
    const { data: project } = await admin
      .from('projects')
      .select('submitted_by, status')
      .eq('id', id)
      .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.submitted_by !== user.dbUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!['draft', 'submitted'].includes(project.status)) {
      return NextResponse.json({ error: 'Cannot edit inputs for projects in current status' }, { status: 403 });
    }
  }

  // Check if inputs already exist
  const { data: existing } = await admin
    .from('project_inputs')
    .select('id')
    .eq('project_id', id)
    .single();

  const payload = { project_id: id, ...validation.data };

  if (existing) {
    const { data, error: dbError } = await admin
      .from('project_inputs')
      .update(payload)
      .eq('project_id', id)
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error: dbError } = await admin
    .from('project_inputs')
    .insert(payload)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
