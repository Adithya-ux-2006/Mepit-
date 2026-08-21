import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { runFormulaEngine } from '@/lib/engineering';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canMutateProject, canReadProject, getProjectAccessRecord } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import type { KpiFormula, ProjectInputs } from '@/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canReadProject(user, access)) return noStoreJson({ error: 'Not found' }, { status: 404 });
  const { data, error } = await admin.from('project_kpi_outputs')
    .select('*, kpi_formula:kpi_formulas(*)').eq('project_id', id);
  if (error) return sanitizeDatabaseError('Read KPI outputs', error);
  return noStoreJson(data ?? []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const preview = body?.preview === true;
  const engineVersion = typeof body?.engineVersion === 'string' && body.engineVersion.length <= 30 ? body.engineVersion : '1.0';
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !(preview ? canReadProject(user, access) : canMutateProject(user, access))) {
    return noStoreJson({ error: 'Forbidden' }, { status: 403 });
  }

  const [projectResult, inputsResult, formulasResult] = await Promise.all([
    admin.from('projects').select('built_up_area, carpet_area, saleable_area').eq('id', id).single(),
    admin.from('project_inputs').select('*').eq('project_id', id).single(),
    admin.from('kpi_formulas').select('*').eq('is_active', true).order('category'),
  ]);
  if (projectResult.error || !projectResult.data) return noStoreJson({ error: 'Project not found' }, { status: 404 });
  if (inputsResult.error || !inputsResult.data) return noStoreJson({ error: 'Project inputs not found' }, { status: 404 });
  if (formulasResult.error) return sanitizeDatabaseError('Read KPI formulas', formulasResult.error);

  const project = projectResult.data;
  const inputs = inputsResult.data as ProjectInputs;
  const formulas = (formulasResult.data ?? []) as KpiFormula[];
  const outputs = formulas.map((formula) => {
    const result = runFormulaEngine(formula.kpi_code, { ...inputs, ...project });
    return {
      project_id: id,
      kpi_formula_id: formula.id,
      calculated_value: result.value,
      engine_version: engineVersion,
      reason_flag: result.value === null ? 'insufficient_inputs' : null,
    };
  });
  if (preview) return noStoreJson(outputs.map((output, index) => ({ ...output, kpi_formula: formulas[index] })));

  const { error: deleteError } = await admin.from('project_kpi_outputs').delete().eq('project_id', id);
  if (deleteError) return sanitizeDatabaseError('Clear previous KPI outputs', deleteError);

  const { data, error } = await admin.from('project_kpi_outputs').insert(outputs).select();
  if (error) return sanitizeDatabaseError('Store KPI outputs', error);
  await admin.from('audit_log').insert({
    entity_type: 'project', entity_id: id, action: 'kpis_recalculated', performed_by: user.dbUserId,
    metadata: { engine_version: engineVersion, output_count: outputs.length },
  });
  return noStoreJson(data ?? [], { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const access = await getProjectAccessRecord(admin, id);
  if (!access || !canMutateProject(user, access)) return noStoreJson({ error: 'Forbidden' }, { status: 403 });
  const { error } = await admin.from('project_kpi_outputs').delete().eq('project_id', id);
  if (error) return sanitizeDatabaseError('Delete KPI outputs', error);
  await admin.from('audit_log').insert({
    entity_type: 'project', entity_id: id, action: 'kpis_cleared', performed_by: user.dbUserId, metadata: {},
  });
  return noStoreJson({ success: true });
}
