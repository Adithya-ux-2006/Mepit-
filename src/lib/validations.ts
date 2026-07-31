/**
 * Zod Validation Schemas — Grüne Platform
 *
 * Runtime type safety for all service function inputs.
 * Schemas validate data at the boundary before it hits Supabase.
 */

import { z } from 'zod';
import { extendedFieldsSchema, stripComputedFields } from '@/lib/project-input-config';
import { PROJECT_STAGE_VALUES } from '@/lib/project-stages';

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(200),
  typology: z.enum([
    'Office', 'Retail', 'Hospitality', 'Mixed Use',
    'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
  ]),
  project_stage: z.enum(PROJECT_STAGE_VALUES),
  location_city: z.string().min(1, 'City is required').max(100),
  location_state: z.string().max(100).optional().default(''),
  project_year: z.number().int().min(1980).max(2100),
  built_up_area: z.number().min(0),
  carpet_area: z.number().min(0),
  saleable_area: z.number().min(0),
  leasable_area: z.number().min(0),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ============================================================================
// PROJECT INPUTS SCHEMA (Engineering Parameters)
// ============================================================================

const nonNegativeNullableNumber = z.number().min(0).nullable().optional();
const currencyRateNumber = z.number().min(0).refine(
  (value) => Number.isInteger(value * 100),
  'Must have at most 2 decimal places',
).nullable().optional();

export const projectInputsSchema = z.object({
  // Existing flat columns
  plant_room_area: nonNegativeNullableNumber,
  leasable_plant_room_area: nonNegativeNullableNumber,
  shaft_area: nonNegativeNullableNumber,
  office_area: nonNegativeNullableNumber,
  fb_area: nonNegativeNullableNumber,
  gross_area: nonNegativeNullableNumber,
  occupancy_density_office: nonNegativeNullableNumber,
  occupancy_density_fb: nonNegativeNullableNumber,
  total_tr: nonNegativeNullableNumber,
  total_airflow_cfm: nonNegativeNullableNumber,
  hvac_strategy: z.string().nullable().optional(),
  transformer_capacity_kva: nonNegativeNullableNumber,
  tenant_power_kva: nonNegativeNullableNumber,
  common_area_power_kva: nonNegativeNullableNumber,
  lighting_load_w: nonNegativeNullableNumber,
  dg_capacity_kva: nonNegativeNullableNumber,
  dg_loading_factor: z.number().min(0).max(1).nullable().optional(),
  annual_energy_kwh: nonNegativeNullableNumber,
  hvac_cost: currencyRateNumber,
  electrical_cost: currencyRateNumber,
  dg_cost: currencyRateNumber,
  fire_fighting_cost: currencyRateNumber,
  stp_cost: currencyRateNumber,
  phe_cost: currencyRateNumber,
  bms_cost: currencyRateNumber,
  fapa_cost: currencyRateNumber,
  cctv_cost: currencyRateNumber,
  total_mep_cost: currencyRateNumber,
  operating_hours: nonNegativeNullableNumber,
  // Extended fields (stored in extended_fields JSONB) — validated from EXTENDED_FIELD_META
  extended_fields: extendedFieldsSchema.optional(),
}).partial();

export type ProjectInputsInput = z.infer<typeof projectInputsSchema>;

// ============================================================================
// KPI FORMULA SCHEMA
// ============================================================================

export const kpiCategorySchema = z.enum([
  'Space Planning', 'HVAC', 'Electrical', 'DG', 'Sustainability', 'Cost',
]);

export const createKpiFormulaSchema = z.object({
  kpi_code: z.string().min(1).max(50).regex(/^[A-Z_]+$/, 'KPI code must be uppercase letters and underscores only'),
  kpi_name: z.string().min(1).max(100),
  category: kpiCategorySchema,
  numerator_expression: z.string().min(1),
  denominator_expression: z.string().min(1),
  unit: z.string().min(1).max(50),
  description: z.string().max(500).optional().default(''),
});

export type CreateKpiFormulaInput = z.infer<typeof createKpiFormulaSchema>;

// ============================================================================
// VALIDATION RULE SCHEMA
// ============================================================================

export const ruleTypeSchema = z.enum(['required', 'min_value', 'max_value', 'cross_field']);

export const createValidationRuleSchema = z.object({
  field_name: z.string().min(1).max(100),
  rule_type: ruleTypeSchema,
  rule_expression: z.record(z.string(), z.unknown()),
  error_message: z.string().min(1).max(500),
  is_active: z.boolean().optional().default(true),
});

export type CreateValidationRuleInput = z.infer<typeof createValidationRuleSchema>;

// ============================================================================
// USER SCHEMA
// ============================================================================

export const roleSchema = z.enum(['contributor', 'admin']);

export const upsertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
  role: roleSchema.optional().default('contributor'),
});

export type UpsertUserInput = z.infer<typeof upsertUserSchema>;

// ============================================================================
// AUDIT LOG SCHEMA
// ============================================================================

export const createAuditLogSchema = z.object({
  entity_type: z.string().min(1).max(50),
  entity_id: z.string().min(1),
  action: z.string().min(1).max(100),
  performed_by: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;

// ============================================================================
// SIMILARITY TARGET SCHEMA
// ============================================================================

export const similarityTargetSchema = z.object({
  typology: z.string().min(1),
  built_up_area: z.number().positive(),
  location_city: z.string().min(1),
  location_state: z.string(),
  project_year: z.number().int().min(1980).max(2100),
  hvac_strategy: z.string().optional(),
});

export type SimilarityTargetInput = z.infer<typeof similarityTargetSchema>;

// ============================================================================
// HELPER: Safe parse with user-friendly errors
// ============================================================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}
