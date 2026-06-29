export type Role = 'contributor' | 'admin';

export type ProjectStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export type KpiCategory = 'Space Planning' | 'HVAC' | 'Electrical' | 'DG' | 'Sustainability' | 'Cost';

export type RuleType = 'required' | 'min_value' | 'max_value' | 'cross_field';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Project {
  id: string;
  project_name: string;
  typology: string;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number;
  carpet_area: number;
  saleable_area: number;
  leasable_area: number;
  status: ProjectStatus;
  submitted_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  version: number;
}

export interface ProjectInputs {
  id: string;
  project_id: string;
  plant_room_area: number | null;
  leasable_plant_room_area: number | null;
  shaft_area: number | null;
  office_area: number | null;
  fb_area: number | null;
  gross_area: number | null;
  occupancy_density_office: number | null;
  occupancy_density_fb: number | null;
  total_tr: number | null;
  total_airflow_cfm: number | null;
  hvac_strategy: string | null;
  transformer_capacity_kva: number | null;
  tenant_power_kva: number | null;
  common_area_power_kva: number | null;
  lighting_load_w: number | null;
  dg_capacity_kva: number | null;
  dg_loading_factor: number | null;
  annual_energy_kwh: number | null;
  hvac_cost: number | null;
  electrical_cost: number | null;
  dg_cost: number | null;
  fire_fighting_cost: number | null;
  stp_cost: number | null;
  phe_cost: number | null;
  bms_cost: number | null;
  fapa_cost: number | null;
  cctv_cost: number | null;
  total_mep_cost: number | null;
  extended_fields: Record<string, unknown>;
  operating_hours: number | null;
}

export interface KpiFormula {
  id: string;
  kpi_code: string;
  kpi_name: string;
  category: KpiCategory;
  numerator_expression: string;
  denominator_expression: string;
  unit: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ProjectKpiOutput {
  id: string;
  project_id: string;
  kpi_formula_id: string;
  calculated_value: number | null;
  calculated_at: string;
  engine_version: string;
  reason_flag: string | null;
}

export interface ValidationRule {
  id: string;
  field_name: string;
  rule_type: RuleType;
  rule_expression: Record<string, unknown>;
  error_message: string;
  is_active: boolean;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  metadata: Record<string, unknown>;
}

export interface CreateProjectInput {
  project_name: string;
  typology: string;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number;
  carpet_area: number;
  saleable_area: number;
  leasable_area: number;
}

export interface ProjectFormData {
  project_name: string;
  typology: string;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number;
  carpet_area: number;
  saleable_area: number;
  leasable_area: number;
  plant_room_area: number | null;
  leasable_plant_room_area: number | null;
  shaft_area: number | null;
  office_area: number | null;
  fb_area: number | null;
  gross_area: number | null;
  occupancy_density_office: number | null;
  occupancy_density_fb: number | null;
  total_tr: number | null;
  total_airflow_cfm: number | null;
  hvac_strategy: string | null;
  transformer_capacity_kva: number | null;
  tenant_power_kva: number | null;
  common_area_power_kva: number | null;
  lighting_load_w: number | null;
  dg_capacity_kva: number | null;
  dg_loading_factor: number | null;
  annual_energy_kwh: number | null;
  hvac_cost: number | null;
  electrical_cost: number | null;
  dg_cost: number | null;
  fire_fighting_cost: number | null;
  stp_cost: number | null;
  phe_cost: number | null;
  bms_cost: number | null;
  fapa_cost: number | null;
  cctv_cost: number | null;
  total_mep_cost: number | null;
  operating_hours: number | null;
}

export interface RecommendationRequest {
  typology: string;
  built_up_area: number;
  location_city: string;
  location_state: string;
  project_year: number;
  hvac_strategy?: string;
  sustainability_target?: string;
  complexity?: string;
  special_requirements?: string[];
}

export interface RecommendationCard {
  kpi_code: string;
  kpi_name: string;
  category: KpiCategory;
  recommended_value: number;
  weighted_mean: number;
  typical_range_min: number;
  typical_range_max: number;
  best_case: number;
  upper_range: number;
  confidence: 'Low' | 'Medium' | 'High' | 'Very High';
  confidence_factors: string[];
  similar_projects_count: number;
  outliers_removed: number;
  std_dev: number;
  cv: number;
  unit: string;
  formula_description: string;
}
