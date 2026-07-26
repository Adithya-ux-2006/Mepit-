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
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  version: number;
}

// All extended field keys (stored in extended_fields JSONB)
export type ExtendedFieldKey =
  // Area & Building Parameters (new)
  | 'bua_substructure' | 'bua_superstructure' | 'building_heights'
  | 'floor_to_floor_height' | 'office_false_ceiling' | 'corridor_false_ceiling'
  | 'occupancy_hvac_bua' | 'occupancy_phe_bua'
  | 'plant_room_bua_pct' | 'leasable_plant_room_bua_pct' | 'shaft_area_bua_pct'
  | 'chiller_plant_room_location' | 'mep_package_value_crores' | 'lesson_learned'
  // HVAC (new)
  | 'population'
  | 'occupancy_lobby' | 'design_temperature_office' | 'iaq_fresh_air'
  | 'cooling_load_saleable' | 'cooling_load_superstructure' | 'cooling_load_carpet'
  | 'diversity_considered' | 'type_of_chiller' | 'chiller_configuration'
  | 'chiller_parameters' | 'refrigerant_used' | 'critical_room_hvac'
  | 'ahu_scope' | 'cfm_sqft' | 'ahu_filtration_strategy'
  | 'hvac_filtration_strategy' | 'primary_pump' | 'secondary_pump' | 'condenser_pump'
  | 'cooling_towers_config' | 'cooling_tower_height'
  | 'toilet_exhaust' | 'pantry_exhaust' | 'kitchen_exhaust'
  | 'owc_exhaust' | 'basement_ventilation' | 'staircase_pressurization'
  | 'lift_well_pressurization' | 'lift_lobby_pressurization' | 'ventilation_electrical_room'
  | 'equipment_thermal_load' | 'smoke_extraction_tenants' | 'server_load' | 'mode_server_cooling'
  | 'hvac_package_cost_lumpsum'
  // Electrical & DG (new)
  | 'power_supply_sources' | 'tenant_power_va_sqft' | 'tenant_power_incl_ahu_va'
  | 'common_area_power_va' | 'total_va_sqft_carpet' | 'total_va_sqft_saleable'
  | 'va_sqft_bua_tenant' | 'va_sqft_bua_common_ex_ev' | 'va_sqft_bua_ev' | 'va_sqft_bua_total'
  | 'baseline_epi' | 'epi_superstructure' | 'epi_bua'
  | 'transformer_redundancy' | 'transformer_sizing_calc' | 'transformer_loading_pct'
  | 'transformer_sizing_after_loading' | 'transformer_capacity_diversity'
  | 'va_sqft_transformer'
  | 'dg_redundancy' | 'dg_load_va_saleable' | 'dg_load_va_bua'
  | 'dg_capacity_calc' | 'dg_loading_pct' | 'va_sqft_dg_capacity'
  | 'dg_set_kva_after_loading' | 'dg_capacity_selected'
  | 'hsd_capacity' | 'hsd_backup'
  | 'bus_riser_sizing' | 'tenant_isolator_sizing' | 'bus_riser_n1'
  | 'earthing_lv' | 'earthing_elv' | 'lps'
  | 'electrical_risers' | 'it_risers' | 'ups_elevator'
  | 'solar_panel_capacity' | 'solar_panel_pct'
  | 'car_park_charging' | 'car_charging_pct'
  | 'electrical_package_cost_lumpsum' | 'dg_package_cost_lumpsum'
  // Plumbing (new)
  | 'water_supply_drainage' | 'hydropneumatic_or_gravity'
  | 'ugt_storage_days' | 'flood_mitigation' | 'rain_water_harvesting'
  | 'tenant_exec_washroom' | 'stp_kld' | 'stp_type'
  | 'domestic_water_ugt' | 'domestic_water_oht'
  | 'flushing_water_ugt' | 'flushing_water_oht'
  | 'owc_capacity' | 'owc_cost_rs_sqft'
  | 'phe_package_cost_lumpsum'
  // Fire Fighting (new)
  | 'ff_pumps_system' | 'express_risers' | 'intermediate_tank'
  | 'drencher_podium' | 'drencher_typical'
  | 'ff_package_cost_lumpsum'
  // FAPA (new)
  | 'fapa_technology' | 'fapa_addressable' | 'fapa_cables'
  | 'fapa_package_cost_lumpsum'
  // CCTV (new)
  | 'cctv_type' | 'security_access_control'
  | 'cctv_package_cost_lumpsum'
  // Glass Façade (new)
  | 'glazing_u_value' | 'vlt' | 'glazing_shgc'
  | 'wall_u_value' | 'roof_u_value'
  | 'spandrel_u_value' | 'spandrel_height'
  | 'punched_windows' | 'wwr' | 'facade_power_controller'
  // Sustainability
  | 'sustainability_certification'
  // Energy (moved from flat columns to extended_fields)
  | 'annual_energy_kwh' | 'operating_hours';

export interface ProjectInputs {
  id: string;
  project_id: string;
  // Existing flat columns (kept for KPI formula compatibility)
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
  annual_energy_kwh: number | null; // kept for backward compat, also in extended_fields
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
  operating_hours: number | null; // kept for backward compat, also in extended_fields
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
  min_benchmark: number | null;
  max_benchmark: number | null;
  benchmark_note: string | null;
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
  // Extended fields (stored in extended_fields JSONB)
  [key: string]: unknown;
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
