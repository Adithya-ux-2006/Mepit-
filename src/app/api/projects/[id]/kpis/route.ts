import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { runFormulaEngine } from '@/lib/services';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import type { KpiFormula, ProjectInputs } from '@/types';

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
    .from('project_kpi_outputs')
    .select('*, kpi_formula:kpi_formulas(*)')
    .eq('project_id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { engineVersion, preview } = body as { engineVersion?: string; preview?: boolean };
  const ver = engineVersion ?? '1.0';
  const admin = getSupabaseAdmin();

  // Fetch project, inputs, and formulas
  const [projectResult, inputsResult, formulasResult] = await Promise.all([
    admin.from('projects').select('built_up_area, carpet_area, saleable_area').eq('id', id).single(),
    admin.from('project_inputs').select('*').eq('project_id', id).single(),
    admin.from('kpi_formulas').select('*').eq('is_active', true).order('category'),
  ]);

  if (projectResult.error || !projectResult.data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (inputsResult.error || !inputsResult.data) {
    return NextResponse.json({ error: 'Project inputs not found' }, { status: 404 });
  }
  if (formulasResult.error) {
    return NextResponse.json({ error: formulasResult.error.message }, { status: 500 });
  }

  const project = projectResult.data;
  const inputs = inputsResult.data as ProjectInputs;
  const formulas = (formulasResult.data ?? []) as KpiFormula[];

  // Calculate KPI outputs using the formula engine
  const outputs: {
    project_id: string;
    kpi_formula_id: string;
    calculated_value: number | null;
    engine_version: string;
    reason_flag: string | null;
  }[] = [];

  for (const formula of formulas) {
    const result = runFormulaEngine(formula.kpi_code, {
      ...inputs,
      built_up_area: project.built_up_area,
      carpet_area: project.carpet_area,
      saleable_area: project.saleable_area,
    });
    outputs.push({
      project_id: id,
      kpi_formula_id: formula.id,
      calculated_value: result.value,
      engine_version: ver,
      reason_flag: result.value === null ? 'insufficient_inputs' : null,
    });
  }

  if (preview) {
    // Return computed values without persisting
    return NextResponse.json(outputs.map((o, i) => ({
      ...o,
      kpi_formula: formulas[i],
    })));
  }

  const { data, error: dbError } = await admin
    .from('project_kpi_outputs')
    .insert(outputs)
    .select();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? [], { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error: dbError } = await admin
    .from('project_kpi_outputs')
    .delete()
    .eq('project_id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
