export type Role = 'contributor' | 'admin';

export type ProjectStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export type ProjectStage =
  | 'concept'
  | 'schematic'
  | 'design_development'
  | 'tender'
  | 'design_build_tender'
  | 'post_tender'
  | 'gfc'
  | 'execution'
  | 'final'
  | 'completed';

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
  project_stage: ProjectStage;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number;
  carpet_area: number;
  saleable_area: number;
  leasable_area: number;
  status: ProjectStatus;
  source_project_id: string | null;
  submitted_by: string;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  version: number;
}

// All extended field keys (stored in extended_fields JSONB)
export type ExtendedFieldKey =
  // Architectural Parameters (new)
  | 'bua_substructure' | 'bua_superstructure' | 'building_heights'
  | 'floor_to_floor_height' | 'office_false_ceiling' | 'corridor_false_ceiling'
  | 'occupancy_hvac_bua' | 'occupancy_phe_bua'
  | 'plant_room_bua_pct' | 'leasable_plant_room_bua_pct' | 'shaft_area_bua_pct'
  | 'chiller_plant_room_location' | 'mep_package_value_crores' | 'lesson_learned'
  | 'central_ac_plant_room_area' | 'central_ac_plant_location' | 'standard_followed'
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
  // HVAC Section 1 – Area
  | 'retail_area' | 'additional_spaces'
  // HVAC Section 2 – Inputs
  | 'occupancy_density_retail' | 'occupancy_thermal_setpoint_office'
  | 'occupancy_thermal_setpoint_retail' | 'occupancy_thermal_setpoint_fb'
  | 'occupancy_thermal_setpoint_lobby' | 'lighting_gain_office'
  | 'lighting_gain_retail' | 'lighting_gain_fb' | 'equipment_gain_office'
  | 'equipment_gain_retail' | 'equipment_gain_fb'
  | 'outdoor_db_temp' | 'outdoor_db_temp_source'
  | 'outdoor_wb_temp' | 'outdoor_wb_temp_source'
  // HVAC Section 3 – Centralised Plant
  | 'total_ac_tonnage' | 'diversity'
  | 'type_of_chiller_select' | 'chiller_tonnage_water'
  | 'chiller_units_water' | 'chiller_tonnage_air' | 'chiller_units_air'
  | 'chw_pumping_type' | 'chw_primary_flow_gpm' | 'chw_primary_power_kw'
  | 'chw_secondary_flow_gpm' | 'chw_secondary_power_kw'
  | 'condenser_pumping_type' | 'condenser_flow_gpm' | 'condenser_power_kw'
  | 'ct_condenser_water_in' | 'ct_condenser_water_out' | 'ct_wet_bulb'
  | 'ct_range' | 'ct_approach' | 'ct_fan_type'
  | 'ct_fan_motor_rating_kw' | 'cpo' | 'cpm'
  // HVAC Section 4 – AHU
  | 'total_dehumidified_airflow' | 'chw_supply_temp' | 'chw_return_temp'
  | 'ahu_fan_type' | 'ahu_filtration' | 'ahu_fan_kw' | 'ahu_scope_select'
  // HVAC Section 5 – TFAHU
  | 'total_fresh_airflow' | 'tfahu_chw_supply_temp' | 'tfahu_chw_return_temp'
  | 'tfahu_fan_type' | 'tfahu_filtration' | 'tfahu_fan_kw'
  | 'fresh_air_precooling' | 'passive_desiccant_wheel'
  | 'pct_extra_fresh_air' | 'tfahu_scope'
  // HVAC Section 6 – Server Cooling
  | 'server_cooling_source' | 'server_cooling_mode' | 'server_cooling_scope'
  // HVAC Section 7 – Ventilation
  | 'toilet_exhaust_acph' | 'kitchen_exhaust_acph'
  | 'owc_exhaust_acph' | 'stp_exhaust_acph'
  | 'smoke_extraction_tenant' | 'ventilation_electrical_room_typ'
  // HVAC Section 8 – Costing (calculated)
  | 'cooling_load_density_sqft_tr' | 'dehumidified_cfm_sqft'
  | 'fresh_air_cfm_sqft' | 'chw_pumping_w_gpm'
  | 'condenser_pumping_w_gpm' | 'cooling_tower_w_cfm'
  // Electrical (new)
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
  // Electrical Section 1 – General
  | 'common_area_power_kw' | 'common_area_power_density_kw' | 'common_area_power_density_kva'
  | 'tenant_area_power_kw' | 'tenant_area_power_density_kw' | 'tenant_area_power_density_kva'
  | 'total_connected_load_kw' | 'total_demand_load_kw' | 'carpet_area_electrical'
  // Electrical Section 2 – Transformer
  | 'transformer_capacity_kw' | 'transformer_loading_pct_val' | 'transformer_diversity_pct'
  | 'transformer_config' | 'transformer_type' | 'transformer_location'
  // Electrical Section 3 – Diesel Generator
  | 'dg_capacity_kw' | 'dg_loading_factor_pct' | 'dg_diversity_pct'
  | 'dg_config' | 'dg_type' | 'dg_location'
  // Electrical Section 5 – Energy Metering
  | 'energy_metering_apps'
  // Electrical Section 6 – Electric Charging
  | 'ev_charging_provision' | 'ev_car_spaces' | 'ev_bike_spaces'
  // Electrical Section 7 – Solar PV
  | 'solar_no_panels' | 'solar_total_kwp' | 'solar_tilt_angle' | 'solar_orientation'
  // Electrical Section 11 – IT
  | 'telecom_room_location' | 'telecom_room_size_sqm' | 'no_it_risers'
  | 'no_lv_chambers' | 'cable_tray_dimension_mm' | 'telecom_room_provision'
  | 'telecom_ac_units' | 'novec_fire_suppression' | 'access_control_it'
  | 'power_provision_kw' | 'ups_provision'
  // Plumbing (new)
  | 'water_supply_drainage' | 'hydropneumatic_or_gravity'
  | 'ugt_storage_days' | 'flood_mitigation' | 'rain_water_harvesting'
  | 'tenant_exec_washroom' | 'stp_kld' | 'stp_type'
  | 'domestic_water_ugt' | 'domestic_water_oht'
  | 'flushing_water_ugt' | 'flushing_water_oht'
  | 'owc_capacity' | 'owc_cost_rs_sqft'
  | 'phe_package_cost_lumpsum'
  // Public Health (new fields)
  | 'water_distribution_type' | 'occupancy_basis_water' | 'total_occupants_water'
  | 'ugt_raw_water_kl' | 'ugt_treated_water_kl' | 'ugt_domestic_water_kl'
  | 'ugt_flushing_water_kl' | 'ugt_cooling_tower_makeup_kl' | 'ugt_irrigation_kl' | 'ugt_condensate_kl'
  | 'oht_domestic_water_kl' | 'oht_flushing_water_kl' | 'oht_cooling_tower_makeup_kl'
  | 'stp_location' | 'water_meters' | 'bms_water_meters'
  | 'drainage_system' | 'kitchen_waste_stack'
  | 'rainwater_tank_capacity_m3' | 'rainwater_tank_location' | 'recharge_capacity_m3'
  | 'centralised_garbage_room' | 'garbage_room_location'
  | 'owc_capacity_kg' | 'owc_location'
  | 'water_consumption_kl_person' | 'rainwater_tank_capacity_kl' | 'recharge_capacity_kl'
  // Fire Protection (new)
  | 'ff_pumps_system' | 'express_risers' | 'intermediate_tank'
  | 'drencher_podium' | 'drencher_typical'
  | 'ff_package_cost_lumpsum'
  // Fire Protection (new fields)
  | 'ff_underground_tank_kl' | 'ff_intermediate_tank_kl' | 'ff_overhead_tank_kl'
  | 'ff_drencher' | 'ff_express_riser' | 'ff_dry_riser' | 'ff_wet_riser'
  | 'ff_sprinkler_riser' | 'ff_ev_protection' | 'ff_cost'
  | 'fapa_system' | 'fapa_addressable_type' | 'fapa_cables_type' | 'fapa_cost_val'
  // FAPA (new)
  | 'fapa_technology' | 'fapa_addressable' | 'fapa_cables'
  | 'fapa_package_cost_lumpsum'
  // CCTV (new)
  | 'cctv_type' | 'security_access_control'
  | 'cctv_package_cost_lumpsum'
  // Building Envelope (new)
  | 'glazing_u_value' | 'vlt' | 'glazing_shgc'
  | 'wall_u_value' | 'roof_u_value'
  | 'spandrel_u_value' | 'spandrel_height'
  | 'punched_windows' | 'wwr' | 'facade_power_controller'
  // Building Envelope (new fields)
  | 'glazing_height' | 'glazing_types'
  // Building Certifications
  | 'sustainability_certification' | 'certification_types' | 'custom_certifications'
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
  project_stage: ProjectStage;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number;
  carpet_area: number;
  saleable_area: number;
  leasable_area: number;
  source_project_id?: string | null;
}

export interface ProjectFormData {
  project_name: string;
  typology: string;
  project_stage: ProjectStage;
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
