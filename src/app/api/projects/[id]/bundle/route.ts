import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canReadProject } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';
import {
  getProjectReadColumns,
  normalizeProjectSchema,
  recordProjectSchemaResult,
  LEGACY_PROJECT_COLUMNS,
} from '@/lib/project-schema-compat';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  let projectResult = await admin.from('projects').select(getProjectReadColumns()).eq('id', id).single();
  if (recordProjectSchemaResult(projectResult.error)) {
    projectResult = await admin.from('projects').select(LEGACY_PROJECT_COLUMNS).eq('id', id).single();
  }
  if (projectResult.error || !projectResult.data) return sanitizeDatabaseError('Read project bundle', projectResult.error);

  const project = normalizeProjectSchema(projectResult.data as unknown as Record<string, unknown>);
  if (!canReadProject(user, project as never)) return noStoreJson({ error: 'Not found' }, { status: 404 });

  const [inputsResult, outputsResult, rulesResult] = await Promise.all([
    admin.from('project_inputs').select('*').eq('project_id', id).maybeSingle(),
    admin.from('project_kpi_outputs').select('*, kpi_formula:kpi_formulas(*)').eq('project_id', id),
    admin.from('validation_rules').select('*').eq('is_active', true),
  ]);
  const error = inputsResult.error ?? outputsResult.error ?? rulesResult.error;
  if (error) return sanitizeDatabaseError('Read project bundle data', error);

  return noStoreJson({
    project,
    inputs: inputsResult.data ?? null,
    outputs: outputsResult.data ?? [],
    validationRules: rulesResult.data ?? [],
  });
}

