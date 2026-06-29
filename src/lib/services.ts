import { supabase, isConfigured } from '@/lib/supabase';
import type {
  Project,
  ProjectInputs,
  ProjectFormData,
  KpiFormula,
  ProjectKpiOutput,
  ValidationRule,
  AuditLog,
  User,
} from '@/types';
import { validateInput, createProjectSchema, projectInputsSchema, upsertUserSchema, createAuditLogSchema } from '@/lib/validations';

function getDb() {
  if (!supabase || !isConfigured) throw new Error('Supabase is not configured');
  return supabase;
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function createProject(
  data: {
    project_name: string;
    typology: string;
    location_city: string;
    location_state: string;
    project_year: number;
    built_up_area: number;
    carpet_area: number;
    saleable_area: number;
    leasable_area: number;
  },
  userId: string
): Promise<Project> {
  const validation = validateInput(createProjectSchema, data);
  if (!validation.success) throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  const db = getDb();
  const { data: project, error } = await db
    .from('projects')
    .insert({
      project_name: data.project_name,
      typology: data.typology,
      location_city: data.location_city,
      location_state: data.location_state,
      project_year: data.project_year,
      built_up_area: data.built_up_area,
      carpet_area: data.carpet_area,
      saleable_area: data.saleable_area,
      leasable_area: data.leasable_area,
      status: 'draft',
      submitted_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<ProjectFormData>
): Promise<Project> {
  const db = getDb();
  const { data: project, error } = await db
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return project;
}

export async function getProjects(): Promise<Project[]> {
  const db = getDb();
  const { data, error } = await db
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = getDb();
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectStatus(
  id: string,
  status: Project['status'],
  approvedBy?: string
): Promise<void> {
  const db = getDb();
  const update: Record<string, unknown> = { status };
  if (status === 'approved') {
    update.approved_at = new Date().toISOString();
    update.approved_by = approvedBy;
  }
  const { error } = await db.from('projects').update(update).eq('id', id);
  if (error) throw error;
}

export async function getProjectsByStatus(
  status: Project['status']
): Promise<Project[]> {
  const db = getDb();
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// PROJECT INPUTS
// ============================================================================

export async function upsertProjectInputs(
  projectId: string,
  data: Partial<ProjectInputs>
): Promise<ProjectInputs> {
  const validation = validateInput(projectInputsSchema, data);
  if (!validation.success) throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  const db = getDb();
  const { data: existing } = await db
    .from('project_inputs')
    .select('id')
    .eq('project_id', projectId)
    .single();

  const payload = { project_id: projectId, ...data };

  if (existing) {
    const { data: result, error } = await db
      .from('project_inputs')
      .update(payload)
      .eq('project_id', projectId)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  const { data: result, error } = await db
    .from('project_inputs')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function getProjectInputs(
  projectId: string
): Promise<ProjectInputs | null> {
  const db = getDb();
  const { data, error } = await db
    .from('project_inputs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

/**
 * Batch-load project inputs for multiple projects in a single query.
 * Replaces N+1 individual getProjectInputs calls.
 */
export async function getProjectInputsBatch(
  projectIds: string[]
): Promise<Map<string, ProjectInputs>> {
  if (projectIds.length === 0) return new Map();
  const db = getDb();
  const { data, error } = await db
    .from('project_inputs')
    .select('*')
    .in('project_id', projectIds);

  if (error) throw error;
  const map = new Map<string, ProjectInputs>();
  for (const row of data ?? []) {
    map.set(row.project_id, row);
  }
  return map;
}

// ============================================================================
// KPI FORMULAS
// ============================================================================

export async function getKpiFormulas(): Promise<KpiFormula[]> {
  const db = getDb();
  const { data, error } = await db
    .from('kpi_formulas')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getKpiFormulaById(
  id: string
): Promise<KpiFormula | null> {
  const db = getDb();
  const { data, error } = await db
    .from('kpi_formulas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createKpiFormula(
  input: Partial<KpiFormula>
): Promise<KpiFormula> {
  const db = getDb();
  const { data, error } = await db
    .from('kpi_formulas')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKpiFormula(
  id: string,
  input: Partial<KpiFormula>
): Promise<KpiFormula> {
  const db = getDb();
  const { data, error } = await db
    .from('kpi_formulas')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKpiFormula(id: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from('kpi_formulas').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// PROJECT KPI OUTPUTS
// ============================================================================

export async function getProjectKpiOutputs(
  projectId: string
): Promise<(ProjectKpiOutput & { kpi_formula?: KpiFormula })[]> {
  const db = getDb();
  const { data, error } = await db
    .from('project_kpi_outputs')
    .select('*, kpi_formula:kpi_formulas(*)')
    .eq('project_id', projectId);

  if (error) throw error;
  return data ?? [];
}

export async function deleteProjectKpiOutputs(projectId: string): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from('project_kpi_outputs')
    .delete()
    .eq('project_id', projectId);
  if (error) throw error;
}

export async function calculateAndStoreKpiOutputs(
  projectId: string,
  inputs: ProjectInputs,
  formulas: KpiFormula[],
  project: { built_up_area: number; carpet_area: number; saleable_area: number },
  engineVersion = '1.0'
): Promise<ProjectKpiOutput[]> {
  const db = getDb();
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
      project_id: projectId,
      kpi_formula_id: formula.id,
      calculated_value: result.value,
      engine_version: engineVersion,
      reason_flag: result.value === null ? 'insufficient_inputs' : null,
    });
  }

  const { data, error } = await db
    .from('project_kpi_outputs')
    .insert(outputs)
    .select();

  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// FORMULA ENGINE
// ============================================================================

// Full calculation with project-level fields passed explicitly
export function runFormulaEngine(
  kpiCode: string,
  inputs: ProjectInputs & {
    built_up_area: number;
    carpet_area: number;
    saleable_area: number;
  }
): { value: number | null; reason?: string } {
  const {
    built_up_area: bua,
    carpet_area,
    saleable_area,
    plant_room_area,
    leasable_plant_room_area,
    shaft_area,
    office_area,
    fb_area,
    gross_area,
    occupancy_density_office,
    occupancy_density_fb,
    total_tr,
    total_airflow_cfm,
    transformer_capacity_kva,
    tenant_power_kva,
    common_area_power_kva,
    lighting_load_w,
    dg_capacity_kva,
    dg_loading_factor,
    annual_energy_kwh,
    hvac_cost,
    electrical_cost,
    dg_cost,
    fire_fighting_cost,
    stp_cost,
    phe_cost,
    bms_cost,
    fapa_cost,
    cctv_cost,
    total_mep_cost,
    operating_hours,
  } = inputs;

  const safeDiv = (num: number | null, den: number | null): number | null => {
    if (num == null || den == null || den === 0) return null;
    return num / den;
  };

  const safeMul = (a: number | null, b: number | null): number | null => {
    if (a == null || b == null) return null;
    return a * b;
  };

  switch (kpiCode) {
    case 'PLANT_ROOM_PCT':
      return { value: safeMul(safeDiv(plant_room_area, bua), 100) };

    case 'LEASABLE_PLANT_ROOM_PCT':
      return { value: safeMul(safeDiv(leasable_plant_room_area, bua), 100) };

    case 'SHAFT_AREA_PCT':
      return { value: safeMul(safeDiv(shaft_area, bua), 100) };

    case 'POPULATION': {
      const officePop = safeDiv(office_area, occupancy_density_office);
      const fbPop = safeDiv(fb_area, occupancy_density_fb);
      if (officePop == null && fbPop == null) return { value: null };
      return { value: (officePop ?? 0) + (fbPop ?? 0) };
    }

    case 'COOLING_LOAD_DENSITY':
      return { value: safeDiv(carpet_area, total_tr) };

    case 'CFM_SQFT':
      return { value: safeDiv(total_airflow_cfm, carpet_area) };

    case 'KW_PER_TR': {
      const annualKwh = annual_energy_kwh;
      const tr = total_tr;
      const hrs = operating_hours ?? 3000;
      if (annualKwh == null || tr == null || tr === 0 || hrs === 0)
        return { value: null };
      return { value: annualKwh / (tr * hrs) };
    }

    case 'HVAC_RS_SQFT':
      return { value: safeDiv(hvac_cost, bua) };

    case 'TOTAL_VA_SQFT_CARPET': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, carpet_area) };
    }

    case 'TOTAL_VA_SQFT_SALEABLE': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, saleable_area) };
    }

    case 'TOTAL_VA_SQFT_BUA': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, bua) };
    }

    case 'TRANSFORMER_DENSITY':
      return { value: safeDiv(safeMul(transformer_capacity_kva, 1000), bua) };

    case 'LIGHTING_W_SQFT':
      return { value: safeDiv(lighting_load_w, carpet_area) };

    case 'DG_LOAD_DENSITY':
      return { value: safeDiv(dg_capacity_kva, bua) };

    case 'DG_CAPACITY_DENSITY': {
      const actualLoad = safeMul(dg_capacity_kva, dg_loading_factor);
      return { value: safeDiv(actualLoad, bua) };
    }

    case 'EPI':
      return { value: safeDiv(annual_energy_kwh, gross_area) };

    case 'TOTAL_MEP_RS_SQFT':
      return { value: safeDiv(total_mep_cost, bua) };

    case 'ELECTRICAL_RS_SQFT':
      return { value: safeDiv(electrical_cost, bua) };

    case 'DG_RS_SQFT':
      return { value: safeDiv(dg_cost, bua) };

    case 'FF_RS_SQFT':
      return { value: safeDiv(fire_fighting_cost, bua) };

    case 'STP_RS_SQFT':
      return { value: safeDiv(stp_cost, bua) };

    case 'PHE_RS_SQFT':
      return { value: safeDiv(phe_cost, bua) };

    case 'BMS_RS_SQFT':
      return { value: safeDiv(bms_cost, bua) };

    case 'FAPA_RS_SQFT':
      return { value: safeDiv(fapa_cost, bua) };

    case 'CCTV_RS_SQFT':
      return { value: safeDiv(cctv_cost, bua) };

    default:
      return { value: null, reason: `Unknown KPI code: ${kpiCode}` };
  }
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export interface ValidationError {
  field: string;
  rule_type: string;
  error_message: string;
}

export async function validateProjectInputs(
  formData: Record<string, unknown>
): Promise<ValidationError[]> {
  const rules = await getValidationRules();
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const fieldValue = formData[rule.field_name];
    const expr = rule.rule_expression;

    switch (rule.rule_type) {
      case 'required': {
        const min = typeof expr.min === 'number' ? expr.min : undefined;
        if (
          fieldValue == null ||
          (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
          (typeof fieldValue === 'number' && min !== undefined && fieldValue < min)
        ) {
          errors.push({
            field: rule.field_name,
            rule_type: rule.rule_type,
            error_message: rule.error_message,
          });
        }
        break;
      }

      case 'min_value': {
        const min = typeof expr.min === 'number' ? expr.min : 0;
        if (
          typeof fieldValue === 'number' &&
          fieldValue !== null &&
          fieldValue < min
        ) {
          errors.push({
            field: rule.field_name,
            rule_type: rule.rule_type,
            error_message: rule.error_message,
          });
        }
        break;
      }

      case 'max_value': {
        const max = typeof expr.max === 'number' ? expr.max : Infinity;
        if (
          typeof fieldValue === 'number' &&
          fieldValue !== null &&
          fieldValue > max
        ) {
          errors.push({
            field: rule.field_name,
            rule_type: rule.rule_type,
            error_message: rule.error_message,
          });
        }
        break;
      }

      case 'cross_field': {
        // Check max_field constraint
        if (typeof expr.max_field === 'string') {
          const maxFieldVal = formData[expr.max_field];
          if (
            typeof fieldValue === 'number' &&
            typeof maxFieldVal === 'number' &&
            fieldValue > maxFieldVal
          ) {
            errors.push({
              field: rule.field_name,
              rule_type: rule.rule_type,
              error_message: rule.error_message,
            });
          }
        }

        // Check min_sum_of constraint
        if (Array.isArray(expr.min_sum_of)) {
          const sum = expr.min_sum_of.reduce(
            (acc: number, f: string) => acc + ((formData[f] as number) ?? 0),
            0
          );
          if (
            typeof fieldValue === 'number' &&
            fieldValue > 0 &&
            sum > 0 &&
            Math.abs(fieldValue - sum) > Math.max(fieldValue * 0.01, 1)
          ) {
            errors.push({
              field: rule.field_name,
              rule_type: rule.rule_type,
              error_message: rule.error_message,
            });
          }
        }

        // Check ratio constraints (min_ratio / max_ratio of a reference field)
        if (typeof expr.min_ratio === 'number' && typeof expr.ratio_field === 'string') {
          const refVal = formData[expr.ratio_field];
          if (
            typeof fieldValue === 'number' &&
            typeof refVal === 'number' &&
            refVal > 0
          ) {
            const ratio = fieldValue / refVal;
            if (ratio < expr.min_ratio) {
              errors.push({
                field: rule.field_name,
                rule_type: rule.rule_type,
                error_message: rule.error_message,
              });
            }
          }
        }

        if (typeof expr.max_ratio === 'number' && typeof expr.ratio_field === 'string') {
          const refVal = formData[expr.ratio_field];
          if (
            typeof fieldValue === 'number' &&
            typeof refVal === 'number' &&
            refVal > 0
          ) {
            const ratio = fieldValue / refVal;
            if (ratio > expr.max_ratio) {
              errors.push({
                field: rule.field_name,
                rule_type: rule.rule_type,
                error_message: rule.error_message,
              });
            }
          }
        }
        break;
      }
    }
  }

  return errors;
}

export async function getValidationRules(): Promise<ValidationRule[]> {
  const db = getDb();
  const { data, error } = await db
    .from('validation_rules')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return data ?? [];
}

export async function createValidationRule(
  input: Partial<ValidationRule>
): Promise<ValidationRule> {
  const db = getDb();
  const { data, error } = await db
    .from('validation_rules')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateValidationRule(
  id: string,
  input: Partial<ValidationRule>
): Promise<ValidationRule> {
  const db = getDb();
  const { data, error } = await db
    .from('validation_rules')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteValidationRule(id: string): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from('validation_rules')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function createAuditLog(
  entry: Partial<AuditLog>
): Promise<AuditLog> {
  const validation = validateInput(createAuditLogSchema, entry);
  if (!validation.success) throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  const db = getDb();
  const { data, error } = await db
    .from('audit_log')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAuditLogs(
  entityType?: string,
  entityId?: string
): Promise<AuditLog[]> {
  const db = getDb();
  let query = db.from('audit_log').select('*').order('performed_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// USERS
// ============================================================================

export async function getUsers(): Promise<User[]> {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function upsertUser(
  input: Partial<User>
): Promise<User> {
  const validation = validateInput(upsertUserSchema, input);
  if (!validation.success) throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  const db = getDb();
  const existing = await getUserByEmail(input.email ?? '');
  if (existing) return existing;

  const { data, error } = await db
    .from('users')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SIMILARITY ENGINE (Board 3)
// ============================================================================

export interface SimilarProject {
  project: Project;
  score: number;
}

export function calculateSimilarity(
  target: {
    typology: string;
    built_up_area: number;
    location_city: string;
    location_state: string;
    project_year: number;
    hvac_strategy?: string;
  },
  candidate: Project,
  candidateInputs?: ProjectInputs | null
): number {
  let score = 0;

  // Typology match (35 points)
  if (candidate.typology === target.typology) {
    score += 35;
  }

  // BUA proximity (20 points)
  if (candidate.built_up_area > 0 && target.built_up_area > 0) {
    const ratio =
      Math.abs(candidate.built_up_area - target.built_up_area) /
      target.built_up_area;
    if (ratio <= 0.1) score += 20;
    else if (ratio <= 0.25) score += 12;
    else if (ratio <= 0.5) score += 6;
  }

  // Location match (15 points)
  if (
    candidate.location_city?.toLowerCase() ===
    target.location_city?.toLowerCase()
  ) {
    score += 15;
  } else if (
    candidate.location_state?.toLowerCase() ===
    target.location_state?.toLowerCase()
  ) {
    score += 8;
  }

  // Year weighting (15 points) — exponential decay favors recent projects
  const yearDiff = Math.abs(
    (candidate.project_year ?? 0) - target.project_year
  );
  const yearScore = Math.round(15 * Math.exp(-0.15 * yearDiff));
  score += yearScore;

  // HVAC strategy match (15 points)
  if (
    target.hvac_strategy &&
    candidateInputs?.hvac_strategy &&
    candidateInputs.hvac_strategy === target.hvac_strategy
  ) {
    score += 15;
  }

  return score;
}

export async function getSimilarProjectsAsync(
  target: {
    typology: string;
    built_up_area: number;
    location_city: string;
    location_state: string;
    project_year: number;
    hvac_strategy?: string;
  },
  candidates: Project[],
  topN = 10
): Promise<SimilarProject[]> {
  // Phase 1: Score without inputs (fast, no DB queries)
  const approved = candidates.filter((p) => p.status === 'approved');
  const phase1Scored: SimilarProject[] = approved.map((p) => ({
    project: p,
    score: calculateSimilarity(target, p),
  })).filter((s) => s.score > 0);
  phase1Scored.sort((a, b) => b.score - a.score);
  const topCandidates = phase1Scored.slice(0, Math.min(topN * 2, phase1Scored.length));

  // Phase 2: Batch-load inputs for top candidates and re-score with HVAC matching
  const candidateIds = topCandidates.map((s) => s.project.id);
  const inputsMap = await getProjectInputsBatch(candidateIds);
  const phase2Scored: SimilarProject[] = [];
  for (const s of topCandidates) {
    const inputs = inputsMap.get(s.project.id) ?? null;
    const fullScore = calculateSimilarity(target, s.project, inputs);
    if (fullScore > 0) phase2Scored.push({ project: s.project, score: fullScore });
  }

  phase2Scored.sort((a, b) => b.score - a.score);
  return phase2Scored.slice(0, topN);
}



export function calculateConfidence(
  similarProjects: SimilarProject[],
  kpiValues: (number | null)[]
): {
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  sampleSize: number;
} {
  const minScore = 60;
  const qualified = similarProjects.filter((s) => s.score >= minScore);
  const count = qualified.length;

  let level: 'Low' | 'Medium' | 'High' | 'Very High';

  if (count < 3) level = 'Low';
  else if (count < 7) level = 'Medium';
  else if (count < 15) level = 'High';
  else level = 'Very High';

  // Moderate down if KPI values have high variance
  const valid = kpiValues.filter((v): v is number => v !== null);
  if (valid.length >= 3) {
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const variance =
      valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv > 0.5 && level !== 'Low') {
      level =
        level === 'Very High'
          ? 'High'
          : level === 'High'
            ? 'Medium'
            : 'Low';
    }
  }

  return { level, sampleSize: count };
}
