import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateInput, createProjectSchema } from '@/lib/validations';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const submittedBy = searchParams.get('submitted_by');
  const statusIn = searchParams.get('status_in');

  const admin = getSupabaseAdmin();
  let query = admin.from('projects').select('*');

  if (submittedBy) {
    query = query.eq('submitted_by', submittedBy);
  }

  if (statusIn) {
    const statuses = statusIn.split(',');
    query = query.in('status', statuses);
  }

  const { data, error: dbError } = await query.order('created_at', { ascending: false });

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
  let sourceProjectId = input.source_project_id ?? null;

  if (sourceProjectId) {
    const { data: sourceProject, error: sourceError } = await admin
      .from('projects')
      .select('id, source_project_id')
      .eq('id', sourceProjectId)
      .single();

    if (sourceError || !sourceProject) {
      return NextResponse.json({ error: 'Source project not found' }, { status: 404 });
    }

    sourceProjectId = sourceProject.source_project_id ?? sourceProject.id;
    const { data: existingStage, error: stageError } = await admin
      .from('projects')
      .select('id')
      .eq('project_stage', input.project_stage)
      .or(`id.eq.${sourceProjectId},source_project_id.eq.${sourceProjectId}`)
      .limit(1);

    if (stageError) {
      return NextResponse.json({ error: stageError.message }, { status: 500 });
    }
    if (existingStage && existingStage.length > 0) {
      return NextResponse.json({ error: 'This project stage already exists' }, { status: 409 });
    }
  }

  const { data, error: dbError } = await admin
    .from('projects')
    .insert({
      ...input,
      source_project_id: sourceProjectId,
      status: 'draft',
      submitted_by: user.dbUserId,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

