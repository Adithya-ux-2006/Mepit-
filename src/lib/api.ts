/**
 * Client-Side API Client — Grüne Platform
 *
 * Replaces direct Supabase queries from client components.
 * All data access now goes through authenticated server-side API routes
 * which verify Firebase tokens and use the service-role Supabase client.
 *
 * IMPORTANT: Never import @/lib/supabase or @/lib/services in client components.
 * Always use this module instead.
 */

import type {
  Project,
  ProjectInputs,
  KpiFormula,
  ProjectKpiOutput,
  ValidationRule,
  AuditLog,
  User,
} from '@/types';

// Re-export pure functions that don't need DB access
export { runFormulaEngine, calculateSimilarity } from '@/lib/services';

// ============================================================================
// HELPERS
// ============================================================================

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include', // send __session cookie
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  // DELETE and some PATCH routes return { success: true } with no body
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ============================================================================
// USERS
// ============================================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await apiFetch<User[]>('/api/users');
  return users.find((u) => u.email === email) ?? null;
}

export async function upsertUser(input: Partial<User>): Promise<User> {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Get or create the current user based on the session cookie. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>('/api/users/me');
  } catch {
    return null;
  }
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/api/projects');
}

export async function getProjectsByStatus(
  status: Project['status'],
): Promise<Project[]> {
  return apiFetch<Project[]>(`/api/projects/by-status/${encodeURIComponent(status)}`);
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  return apiFetch<Project[]>(`/api/projects?submitted_by=${encodeURIComponent(userId)}`);
}

export async function updateProject(
  id: string,
  data: {
    project_name?: string;
    typology?: string;
    location_city?: string;
    location_state?: string;
    project_year?: number;
    built_up_area?: number;
    carpet_area?: number;
    saleable_area?: number;
    leasable_area?: number;
  },
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    return await apiFetch<Project>(`/api/projects/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

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
  _userId: string, // kept for signature compatibility; server derives from session
): Promise<Project> {
  return apiFetch<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectStatus(
  id: string,
  status: Project['status'],
  approvedBy?: string,
  rejection_reason?: string,
): Promise<void> {
  await apiFetch(`/api/projects/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, approvedBy, rejection_reason }),
  });
}

// ============================================================================
// PROJECT INPUTS
// ============================================================================

export async function getProjectInputs(
  projectId: string,
): Promise<ProjectInputs | null> {
  try {
    const data = await apiFetch<ProjectInputs | null>(
      `/api/projects/${encodeURIComponent(projectId)}/inputs`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function upsertProjectInputs(
  projectId: string,
  data: Partial<ProjectInputs>,
): Promise<ProjectInputs> {
  return apiFetch<ProjectInputs>(
    `/api/projects/${encodeURIComponent(projectId)}/inputs`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

/**
 * Batch-load project inputs for multiple projects (used by learning engine).
 * Returns a Map keyed by project_id.
 */
export async function getProjectInputsBatch(
  projectIds: string[],
): Promise<Map<string, ProjectInputs>> {
  if (projectIds.length === 0) return new Map();
  const map = await apiFetch<Record<string, ProjectInputs>>(
    '/api/projects/inputs-batch',
    { method: 'POST', body: JSON.stringify({ projectIds }) },
  );
  return new Map(Object.entries(map));
}

// ============================================================================
// PROJECT KPI OUTPUTS
// ============================================================================

export async function getProjectKpiOutputs(
  projectId: string,
): Promise<(ProjectKpiOutput & { kpi_formula?: KpiFormula })[]> {
  return apiFetch<(ProjectKpiOutput & { kpi_formula?: KpiFormula })[]>(
    `/api/projects/${encodeURIComponent(projectId)}/kpis`,
  );
}

export async function calculateAndStoreKpiOutputs(
  projectId: string,
  _inputs: ProjectInputs, // kept for signature compatibility; server fetches from DB
  _formulas: KpiFormula[], // kept for signature compatibility; server fetches from DB
  _project: { built_up_area: number; carpet_area: number; saleable_area: number }, // kept for signature compatibility
  engineVersion = '1.0',
): Promise<ProjectKpiOutput[]> {
  return apiFetch<ProjectKpiOutput[]>(
    `/api/projects/${encodeURIComponent(projectId)}/kpis`,
    { method: 'POST', body: JSON.stringify({ engineVersion }) },
  );
}

export async function deleteProjectKpiOutputs(projectId: string): Promise<void> {
  await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/kpis`, {
    method: 'DELETE',
  });
}

// ============================================================================
// KPI FORMULAS
// ============================================================================

export async function getKpiFormulas(): Promise<KpiFormula[]> {
  return apiFetch<KpiFormula[]>('/api/kpi-formulas');
}

export async function createKpiFormula(
  input: Partial<KpiFormula>,
): Promise<KpiFormula> {
  return apiFetch<KpiFormula>('/api/kpi-formulas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateKpiFormula(
  id: string,
  input: Partial<KpiFormula>,
): Promise<KpiFormula> {
  return apiFetch<KpiFormula>(
    `/api/kpi-formulas/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export async function deleteKpiFormula(id: string): Promise<void> {
  await apiFetch(`/api/kpi-formulas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

export async function getValidationRules(): Promise<ValidationRule[]> {
  return apiFetch<ValidationRule[]>('/api/validation-rules');
}

export async function createValidationRule(
  input: Partial<ValidationRule>,
): Promise<ValidationRule> {
  return apiFetch<ValidationRule>('/api/validation-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateValidationRule(
  id: string,
  input: Partial<ValidationRule>,
): Promise<ValidationRule> {
  return apiFetch<ValidationRule>(
    `/api/validation-rules/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export async function deleteValidationRule(id: string): Promise<void> {
  await apiFetch(`/api/validation-rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function createAuditLog(
  entry: Partial<AuditLog>,
): Promise<AuditLog> {
  return apiFetch<AuditLog>('/api/audit-log', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function getAuditLogs(
  entityType?: string,
  entityId?: string,
): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (entityType) params.set('entity_type', entityType);
  if (entityId) params.set('entity_id', entityId);
  const qs = params.toString();
  return apiFetch<AuditLog[]>(`/api/audit-log${qs ? `?${qs}` : ''}`);
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  rule_type: string;
  error_message: string;
}

export async function validateProjectInputs(
  data: Record<string, unknown>,
): Promise<ValidationError[]> {
  return apiFetch<ValidationError[]>('/api/validate', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

// ============================================================================
// RATE LIMIT STATUS (Admin only)
// ============================================================================

export interface RateLimitBucketStatus {
  ip: string;
  requestCount: number;
  maxRequests: number;
  windowStart: number;
  secondsUntilReset: number;
  throttled: boolean;
}

export interface RateLimitStatus {
  activeBuckets: RateLimitBucketStatus[];
  totalBuckets: number;
  presets: Record<string, { maxRequests: number; windowMs: number }>;
  snapshotAt: string;
}

/** Get current rate limit store snapshot (admin only). */
export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  return apiFetch<RateLimitStatus>('/api/rate-limit/status');
}
