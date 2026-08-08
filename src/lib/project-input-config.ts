import type { ProjectInputs, ExtendedFieldKey } from '@/types';
import { z } from 'zod';

// Existing column fields + extended field keys
export type ProjectInputField = Exclude<keyof ProjectInputs, 'id' | 'project_id' | 'extended_fields'> | ExtendedFieldKey;

export type ProjectInputFieldKind = 'number' | 'select' | 'text' | 'computed' | 'repeatable';

export interface ProjectInputFieldMeta {
  label: string;
  unit?: string;
  kind: ProjectInputFieldKind;
  options?: readonly string[];
  placeholder?: string;
  decimals?: number;
  min?: number;
  max?: number;
}

export interface ComputedFieldDef {
  field: ProjectInputField;
  label: string;
  unit: string;
  compute: (inputs: Record<string, unknown>) => number | null;
}

export interface EngineeringServiceGroup {
  key: string;
  title: string;
  fields: readonly ProjectInputField[];
  subGroups?: readonly EngineeringServiceGroup[];
}

// ============================================================================
// OPTIONS
// ============================================================================

export const HVAC_STRATEGY_OPTIONS = [
  'Central Plant', 'VRF', 'Hybrid', 'Split AC', 'Other',
] as const;

export const SELECT_OPTIONS: Record<string, readonly string[]> = {
  hvac_scope: ['Developer', 'Tenant'] as const,
  primary_pump: ['with VFD', 'without VFD'] as const,
  secondary_pump: ['with VFD', 'without VFD', 'NA'] as const,
  condenser_pump: ['Fixed Speed', 'VFD'] as const,
  toilet_exhaust: ['Yes', 'No'] as const,
  kitchen_exhaust: ['Yes', 'No'] as const,
  owc_exhaust: ['Yes', 'No'] as const,
  basement_ventilation: ['Yes', 'No'] as const,
  staircase_pressurization: ['Yes', 'No'] as const,
  lift_well_pressurization: ['Yes', 'No'] as const,
  lift_lobby_pressurization: ['Yes', 'No'] as const,
  bus_riser_n1: ['Yes', 'No'] as const,
  ups_elevator: ['Yes', 'No'] as const,
  car_park_charging: ['Actual', 'Compliance'] as const,
  tenant_exec_washroom: ['Yes', 'No'] as const,
  fapa_addressable: ['UL/FM', 'EN/VDS'] as const,
  mode_server_cooling: ['express riser', 'VRF', 'provision'] as const,
  hydropneumatic_or_gravity: ['Hydropneumatic', 'Gravity Based'] as const,
  stp_type: ['MBR', 'MBBR', 'SBR'] as const,
  power_supply_sources: ['1', '2', 'N+1'] as const,
  transformer_redundancy: ['N+1', 'N+standby'] as const,
  dg_redundancy: ['N+1', 'N+standby'] as const,
  punched_windows: ['Yes', 'No'] as const,
  facade_power_controller: ['Yes', 'No'] as const,
  energy_metering_apps: ['Total building energy', 'Common area interior lighting', 'Common area AHUs', 'Exterior lighting', 'Municipal water pumping', 'Treated wastewater pumping', 'On-site renewables', 'Diesel generators', 'Elevators', 'Escalators', 'Chillers', 'Chiller water pumps + condenser water pumps', 'Cooling tower', 'Fresh air handling units', 'EV charging'] as const,
  ev_charging_provision: ['Yes', 'No'] as const,
  transformer_type: ['Oil-filled', 'Dry type', 'Cast resin'] as const,
  dg_type: ['Silent', 'Super silent', 'Open'] as const,
  solar_orientation: ['North', 'South', 'East', 'West'] as const,
  water_distribution: ['Hydropneumatic', 'Gravity Based'] as const,
  drainage_system: ['Double Stack', 'Single Stack'] as const,
  kitchen_waste_stack: ['Yes', 'No'] as const,
  bms_water_meters: ['Yes', 'No'] as const,
  ff_drencher: ['Yes', 'No'] as const,
  ff_express_riser: ['Yes', 'No'] as const,
  ff_dry_riser: ['Yes', 'No'] as const,
  ff_wet_riser: ['Yes', 'No'] as const,
  ff_sprinkler_riser: ['Yes', 'No'] as const,
  ff_ev_protection: ['Yes', 'No'] as const,
  certification_types: ['IGBC Green New Building', 'LEED BD+C', 'WELL Core', 'IGBC Health & Wellbeing', 'Wired Score', 'Smart Score', 'Access 4u'] as const,
} as const;

// ============================================================================
// COST FIELDS
// ============================================================================

export const COST_FIELDS: readonly ProjectInputField[] = [
  'hvac_cost',
  'electrical_cost',
  'dg_cost',
  'fire_fighting_cost',
  'stp_cost',
  'phe_cost',
  'bms_cost',
  'fapa_cost',
  'cctv_cost',
  'owc_cost_rs_sqft',
  'total_mep_cost',
];

// ============================================================================
// FIELD METADATA — EXISTING COLUMNS
// ============================================================================

const EXISTING_FIELD_META: Record<string, ProjectInputFieldMeta> = {
  plant_room_area: { label: 'Plant Room Area', unit: 'sq. ft', kind: 'number', min: 0 },
  leasable_plant_room_area: { label: 'Leasable Plant Room Area', unit: 'sq. ft', kind: 'number', min: 0 },
  shaft_area: { label: 'Shaft Area', unit: 'sq. ft', kind: 'number', min: 0 },
  office_area: { label: 'Office Area', unit: 'sq. ft', kind: 'number', min: 0 },
  fb_area: { label: 'F&B Area', unit: 'sq. ft', kind: 'number', min: 0 },
  gross_area: { label: 'Gross Area', unit: 'sq. ft', kind: 'number', min: 0 },
  occupancy_density_office: { label: 'Occupancy Density (Office)', unit: 'sq. ft/person', kind: 'number', min: 0 },
  occupancy_density_fb: { label: 'Occupancy Density (F&B)', unit: 'sq. ft/person', kind: 'number', min: 0 },
  total_tr: { label: 'Total TR', unit: 'TR', kind: 'number', min: 0 },
  total_airflow_cfm: { label: 'Total Airflow', unit: 'CFM', kind: 'number', min: 0 },
  hvac_strategy: { label: 'HVAC Strategy', kind: 'select', options: HVAC_STRATEGY_OPTIONS },
  transformer_capacity_kva: { label: 'Transformer Capacity', unit: 'kVA', kind: 'number', min: 0 },
  tenant_power_kva: { label: 'Tenant Power', unit: 'kVA', kind: 'number', min: 0 },
  common_area_power_kva: { label: 'Common Area Power', unit: 'kVA', kind: 'number', min: 0 },
  lighting_load_w: { label: 'Lighting Load', unit: 'W/sq. ft', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 0.6 - 0.8' },
  dg_capacity_kva: { label: 'DG Capacity', unit: 'kVA', kind: 'number', min: 0 },
  dg_loading_factor: { label: 'DG Loading Factor', unit: '0-1', kind: 'number', min: 0, decimals: 2 },
  annual_energy_kwh: { label: 'Annual Energy Consumption', unit: 'kWh', kind: 'number', min: 0, placeholder: 'Used for KW/TR and EPI KPI calculations' },
  hvac_cost: { label: 'HVAC Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 275.50' },
  electrical_cost: { label: 'Electrical Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 260.00' },
  dg_cost: { label: 'DG Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 45.25' },
  fire_fighting_cost: { label: 'Fire Protection Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 32.00' },
  stp_cost: { label: 'STP Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 80.00' },
  phe_cost: { label: 'PHE Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 55.00' },
  bms_cost: { label: 'BMS Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 30.00' },
  fapa_cost: { label: 'FAPA Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 35.00' },
  cctv_cost: { label: 'CCTV Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 35.00' },
  total_mep_cost: { label: 'Total MEP Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 812.75' },
  operating_hours: { label: 'Operating Hours', unit: 'hrs/yr', kind: 'number', min: 0, placeholder: 'Default: 3,000 hrs/yr' },
};

// ============================================================================
// FIELD METADATA — EXTENDED FIELDS (new fields stored in JSONB)
// ============================================================================

const EXTENDED_FIELD_META: Record<ExtendedFieldKey, ProjectInputFieldMeta> = {
  // Architectural Parameters
  bua_substructure: { label: 'Total Built Up Area – Substructure', unit: 'sq. ft', kind: 'number', min: 0 },
  bua_superstructure: { label: 'Total Built Up Area – Superstructure', unit: 'sq. ft', kind: 'number', min: 0 },
  building_heights: { label: 'Building Height (m)', unit: 'm', kind: 'number', min: 0 },
  floor_to_floor_height: { label: 'Floor to Floor Height (m)', unit: 'm', kind: 'number', min: 0 },
  office_false_ceiling: { label: 'Office False Ceiling Suggested', unit: 'm', kind: 'number', min: 0 },
  corridor_false_ceiling: { label: 'Corridor False Ceiling Suggested', unit: 'm', kind: 'number', min: 0 },
  occupancy_hvac_bua: { label: 'Occupant Density – HVAC (sq.ft/person)', unit: 'sq.ft/person', kind: 'number', min: 0 },
  occupancy_phe_bua: { label: 'Occupant Density – PHE (sq.ft/person)', unit: 'sq.ft/person', kind: 'number', min: 0 },
  plant_room_bua_pct: { label: 'Plant Room / BUA', unit: '%', kind: 'computed' },
  leasable_plant_room_bua_pct: { label: 'Leasable Plant Room / BUA', unit: '%', kind: 'computed' },
  shaft_area_bua_pct: { label: 'Shaft Area / BUA', unit: '%', kind: 'computed' },
  chiller_plant_room_location: { label: 'Location of Chiller Plant Room', kind: 'text' },
  central_ac_plant_room_area: { label: 'Central Air Conditioned Plant Room Area', unit: 'sq. ft', kind: 'number', min: 0 },
  central_ac_plant_location: { label: 'Location of Central Air Conditioning Plant', kind: 'text' },
  standard_followed: { label: 'Standard Followed', kind: 'select', options: ['NBC 2016', 'NBC 2026'] },
  mep_package_value_crores: { label: 'MEP Package Value', unit: '₹ Crores', kind: 'computed' },
  lesson_learned: { label: 'Lesson Learned', kind: 'text' },

  // HVAC
  population: { label: 'Population', unit: 'persons', kind: 'computed' },
  occupancy_lobby: { label: 'Occupancy in Lobby', unit: 'sq. ft/person', kind: 'number', min: 0 },
  design_temperature_office: { label: 'Design Temperature Inside Office', unit: '°C', kind: 'number' },
  iaq_fresh_air: { label: 'IAQ / Fresh Air', kind: 'text' },
  cooling_load_saleable: { label: 'Cooling Load Density on Saleable Area', unit: 'sq. ft/TR', kind: 'computed' },
  cooling_load_superstructure: { label: 'Cooling Load Density on BUA – Superstructure', unit: 'sq. ft/TR', kind: 'computed' },
  cooling_load_carpet: { label: 'Cooling Load Density on Carpet Area', unit: 'sq. ft/TR', kind: 'computed' },
  diversity_considered: { label: 'Diversity Considered', kind: 'number', min: 0, max: 1, decimals: 2 },
  type_of_chiller: { label: 'Type of Chiller', kind: 'text' },
  chiller_configuration: { label: 'Chiller Configuration', kind: 'text' },
  chiller_parameters: { label: 'Chiller Parameters', kind: 'text' },
  refrigerant_used: { label: 'Refrigerant Used', kind: 'text' },
  critical_room_hvac: { label: 'Critical Room HVAC System', kind: 'text' },
  ahu_scope: { label: 'AHU Scope', kind: 'select', options: SELECT_OPTIONS.hvac_scope },
  cfm_sqft: { label: 'CFM / Sq. Ft.', unit: 'CFM/sq. ft', kind: 'number', min: 0, decimals: 2 },
  ahu_filtration_strategy: { label: 'AHU Filtration Strategy', kind: 'text' },
  hvac_filtration_strategy: { label: 'TFA / HRW / DOAS Filtration Strategy', kind: 'text' },
  primary_pump: { label: 'Primary Pump', kind: 'select', options: SELECT_OPTIONS.primary_pump },
  secondary_pump: { label: 'Secondary Pump', kind: 'select', options: SELECT_OPTIONS.secondary_pump },
  condenser_pump: { label: 'Condenser Pump', kind: 'select', options: SELECT_OPTIONS.condenser_pump },
  cooling_towers_config: { label: 'Cooling Towers Configuration', kind: 'text' },
  cooling_tower_height: { label: 'Cooling Tower Height', unit: 'm', kind: 'number', min: 0 },
  toilet_exhaust: { label: 'Toilet Exhaust', kind: 'select', options: SELECT_OPTIONS.toilet_exhaust },
  pantry_exhaust: { label: 'Pantry Exhaust', kind: 'text' },
  kitchen_exhaust: { label: 'Kitchen Exhaust', kind: 'select', options: SELECT_OPTIONS.kitchen_exhaust },
  owc_exhaust: { label: 'OWC Exhaust', kind: 'select', options: SELECT_OPTIONS.owc_exhaust },
  basement_ventilation: { label: 'Basement Ventilation', kind: 'select', options: SELECT_OPTIONS.basement_ventilation },
  staircase_pressurization: { label: 'Staircase Pressurization', kind: 'select', options: SELECT_OPTIONS.staircase_pressurization },
  lift_well_pressurization: { label: 'Lift Well Pressurization', kind: 'select', options: SELECT_OPTIONS.lift_well_pressurization },
  lift_lobby_pressurization: { label: 'Lift Lobby Pressurization', kind: 'select', options: SELECT_OPTIONS.lift_lobby_pressurization },
  ventilation_electrical_room: { label: 'Ventilation in Typical Floor Electrical Room', kind: 'text' },
  equipment_thermal_load: { label: 'Equipment Thermal Load', unit: 'W/sq. ft', kind: 'number', min: 0 },
  smoke_extraction_tenants: { label: 'Smoke Extraction for Tenants', kind: 'text' },
  server_load: { label: 'Server Load', unit: 'kW', kind: 'number', min: 0 },
  mode_server_cooling: { label: 'Mode of Server Cooling', kind: 'select', options: SELECT_OPTIONS.mode_server_cooling },
  hvac_package_cost_lumpsum: { label: 'Cost of Package (HVAC)', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // HVAC Section 1 – Area
  retail_area: { label: 'Retail Area', unit: 'sq. ft', kind: 'number', min: 0 },
  additional_spaces: { label: 'Additional Spaces', kind: 'repeatable' },

  // HVAC Section 2 – Inputs
  occupancy_density_retail: { label: 'Occupancy Density (Retail)', unit: 'sq. ft/person', kind: 'number', min: 0 },
  occupancy_thermal_setpoint_office: { label: 'Thermal Setpoint – Office', unit: '°C', kind: 'number' },
  occupancy_thermal_setpoint_retail: { label: 'Thermal Setpoint – Retail', unit: '°C', kind: 'number' },
  occupancy_thermal_setpoint_fb: { label: 'Thermal Setpoint – F&B', unit: '°C', kind: 'number' },
  occupancy_thermal_setpoint_lobby: { label: 'Thermal Setpoint – Lobby', unit: '°C', kind: 'number' },
  lighting_gain_office: { label: 'Lighting Gain – Office', unit: 'W/sq. ft', kind: 'number', min: 0 },
  lighting_gain_retail: { label: 'Lighting Gain – Retail', unit: 'W/sq. ft', kind: 'number', min: 0 },
  lighting_gain_fb: { label: 'Lighting Gain – F&B', unit: 'W/sq. ft', kind: 'number', min: 0 },
  equipment_gain_office: { label: 'Equipment Gain – Office', unit: 'W/sq. ft', kind: 'number', min: 0 },
  equipment_gain_retail: { label: 'Equipment Gain – Retail', unit: 'W/sq. ft', kind: 'number', min: 0 },
  equipment_gain_fb: { label: 'Equipment Gain – F&B', unit: 'W/sq. ft', kind: 'number', min: 0 },
  outdoor_db_temp: { label: 'Outdoor Dry Bulb Temperature', unit: '°C', kind: 'number' },
  outdoor_db_temp_source: { label: 'DB Temp Reference Source', kind: 'text' },
  outdoor_wb_temp: { label: 'Outdoor Wet Bulb Temperature', unit: '°C', kind: 'number' },
  outdoor_wb_temp_source: { label: 'WB Temp Reference Source', kind: 'text' },

  // HVAC Section 3 – Centralised Plant
  total_ac_tonnage: { label: 'Total Air Conditioning Tonnage', unit: 'TR', kind: 'number', min: 0 },
  diversity: { label: 'Diversity', unit: '%', kind: 'number', min: 0, max: 100 },
  type_of_chiller_select: { label: 'Type of Chiller', kind: 'select', options: ['Water Cooled', 'Air Cooled', 'Water + Air Cooled'] },
  chiller_tonnage_water: { label: 'Water Cooled Chiller Tonnage', unit: 'TR', kind: 'number', min: 0 },
  chiller_units_water: { label: 'Water Cooled Chiller Units', kind: 'repeatable' },
  chiller_tonnage_air: { label: 'Air Cooled Chiller Tonnage', unit: 'TR', kind: 'number', min: 0 },
  chiller_units_air: { label: 'Air Cooled Chiller Units', kind: 'repeatable' },
  chw_pumping_type: { label: 'Chilled Water Pumping', kind: 'select', options: ['Primary Variable', 'Primary Constant', 'Secondary Variable'] },
  chw_primary_flow_gpm: { label: 'Primary Flow Rate', unit: 'GPM', kind: 'number', min: 0 },
  chw_primary_power_kw: { label: 'Primary Pump Power', unit: 'kW', kind: 'number', min: 0 },
  chw_secondary_flow_gpm: { label: 'Secondary Flow Rate', unit: 'GPM', kind: 'number', min: 0 },
  chw_secondary_power_kw: { label: 'Secondary Pump Power', unit: 'kW', kind: 'number', min: 0 },
  condenser_pumping_type: { label: 'Condenser Water Pumping', kind: 'select', options: ['Variable', 'Constant'] },
  condenser_flow_gpm: { label: 'Condenser Flow Rate', unit: 'GPM', kind: 'number', min: 0 },
  condenser_power_kw: { label: 'Condenser Pump Power', unit: 'kW', kind: 'number', min: 0 },
  ct_condenser_water_in: { label: 'Condenser Water In', unit: '°C', kind: 'number' },
  ct_condenser_water_out: { label: 'Condenser Water Out', unit: '°C', kind: 'number' },
  ct_wet_bulb: { label: 'Wet Bulb Temperature', unit: '°C', kind: 'number' },
  ct_range: { label: 'Range', unit: '°C', kind: 'computed' },
  ct_approach: { label: 'Approach', unit: '°C', kind: 'computed' },
  ct_fan_type: { label: 'Cooling Tower Fan Type', kind: 'text' },
  ct_fan_motor_rating_kw: { label: 'CT Fan Motor Rating', unit: 'kW', kind: 'number', min: 0 },
  cpo: { label: 'CPO', kind: 'select', options: ['Yes', 'No'] },
  cpm: { label: 'CPM', kind: 'select', options: ['Yes', 'No'] },

  // HVAC Section 4 – AHU
  total_dehumidified_airflow: { label: 'Total Dehumidified Air Flow', unit: 'CFM', kind: 'number', min: 0 },
  chw_supply_temp: { label: 'CHW Supply Temperature', unit: '°C', kind: 'number' },
  chw_return_temp: { label: 'CHW Return Temperature', unit: '°C', kind: 'number' },
  ahu_fan_type: { label: 'AHU Fan Type', kind: 'select', options: ['DIDW', 'DIDW with VFD', 'Plug Fan', 'Plug Fan with VFD', 'EC Fan'] },
  ahu_filtration: { label: 'AHU Filtration', kind: 'text' },
  ahu_fan_kw: { label: 'AHU Fan kW', unit: 'kW', kind: 'number', min: 0 },
  ahu_scope_select: { label: 'AHU Scope', kind: 'select', options: ['Tenant', 'Developer'] },

  // HVAC Section 5 – TFAHU
  total_fresh_airflow: { label: 'Total Fresh Air Flow', unit: 'CFM', kind: 'number', min: 0 },
  tfahu_chw_supply_temp: { label: 'TFAHU CHW Supply Temperature', unit: '°C', kind: 'number' },
  tfahu_chw_return_temp: { label: 'TFAHU CHW Return Temperature', unit: '°C', kind: 'number' },
  tfahu_fan_type: { label: 'TFAHU Fan Type', kind: 'select', options: ['DIDW', 'DIDW with VFD', 'Plug Fan', 'Plug Fan with VFD', 'EC Fan'] },
  tfahu_filtration: { label: 'TFAHU Filtration', kind: 'text' },
  tfahu_fan_kw: { label: 'TFAHU Fan kW', unit: 'kW', kind: 'number', min: 0 },
  fresh_air_precooling: { label: 'Fresh Air Precooling', kind: 'select', options: ['No', 'HRW', 'IDEC', 'Evaporative Cooling'] },
  passive_desiccant_wheel: { label: 'Passive Desiccant Wheel', kind: 'select', options: ['Yes', 'No'] },
  pct_extra_fresh_air: { label: 'Percentage Extra Fresh Air', unit: '%', kind: 'number', min: 0, max: 100 },
  tfahu_scope: { label: 'TFAHU Scope', kind: 'select', options: ['Tenant', 'Developer'] },

  // HVAC Section 6 – Server Cooling
  server_cooling_source: { label: 'Source of Cooling', kind: 'select', options: ['DX Units', 'Chilled Water'] },
  server_cooling_mode: { label: 'Mode', kind: 'select', options: ['Express Riser', 'VRF', 'DX Space Provision'] },
  server_cooling_scope: { label: 'Server Cooling Scope', kind: 'select', options: ['Tenant', 'Developer'] },

  // HVAC Section 7 – Ventilation
  toilet_exhaust_acph: { label: 'Toilet Exhaust ACPH', unit: 'ACPH', kind: 'number', min: 0 },
  kitchen_exhaust_acph: { label: 'Kitchen Exhaust ACPH', unit: 'ACPH', kind: 'number', min: 0 },
  owc_exhaust_acph: { label: 'OWC Exhaust ACPH', unit: 'ACPH', kind: 'number', min: 0 },
  stp_exhaust_acph: { label: 'STP Exhaust ACPH', unit: 'ACPH', kind: 'number', min: 0 },
  smoke_extraction_tenant: { label: 'Smoke Extraction for Tenant', kind: 'select', options: ['Yes', 'No'] },
  ventilation_electrical_room_typ: { label: 'Ventilation in Typical Floor Electrical Room', kind: 'text' },

  // HVAC Section 8 – Costing (calculated)
  cooling_load_density_sqft_tr: { label: 'Cooling Load Density', unit: 'sq. ft/TR', kind: 'computed' },
  dehumidified_cfm_sqft: { label: 'Dehumidified CFM', unit: 'CFM/sq. ft', kind: 'computed' },
  fresh_air_cfm_sqft: { label: 'Fresh Air CFM', unit: 'CFM/sq. ft', kind: 'computed' },
  chw_pumping_w_gpm: { label: 'Chilled Water Pumping', unit: 'W/GPM', kind: 'computed' },
  condenser_pumping_w_gpm: { label: 'Condenser Water Pumping', unit: 'W/GPM', kind: 'computed' },
  cooling_tower_w_cfm: { label: 'Cooling Tower', unit: 'W/CFM', kind: 'computed' },

  // Electrical Section 1 – General
  common_area_power_kw: { label: 'Common Area Power', unit: 'kW', kind: 'number', min: 0 },
  common_area_power_density_kw: { label: 'Common Area Power Density', unit: 'kW/sq. ft', kind: 'number', min: 0, decimals: 4 },
  common_area_power_density_kva: { label: 'Common Area Power Density', unit: 'kVA/sq. ft', kind: 'number', min: 0, decimals: 4 },
  tenant_area_power_kw: { label: 'Tenant Area Power', unit: 'kW', kind: 'number', min: 0 },
  tenant_area_power_density_kw: { label: 'Tenant Area Power Density', unit: 'kW/sq. ft', kind: 'number', min: 0, decimals: 4 },
  tenant_area_power_density_kva: { label: 'Tenant Area Power Density', unit: 'kVA/sq. ft', kind: 'number', min: 0, decimals: 4 },
  total_connected_load_kw: { label: 'Total Connected Load', unit: 'kW', kind: 'number', min: 0 },
  total_demand_load_kw: { label: 'Total Demand Load', unit: 'kW', kind: 'number', min: 0 },
  carpet_area_electrical: { label: 'Carpet Area', unit: 'sq. ft', kind: 'number', min: 0 },
  // Electrical Section 2 – Transformer
  transformer_capacity_kw: { label: 'Transformer Capacity', unit: 'kW', kind: 'number', min: 0 },
  transformer_loading_pct_val: { label: 'Transformer Loading (%)', unit: '%', kind: 'number', min: 0, max: 100 },
  transformer_diversity_pct: { label: 'Transformer Diversity', unit: '%', kind: 'number', min: 0, max: 100 },
  transformer_config: { label: 'Transformer Configuration', kind: 'select', options: ['N', 'N+1'] },
  transformer_type: { label: 'Transformer Type', kind: 'select', options: SELECT_OPTIONS.transformer_type },
  transformer_location: { label: 'Transformer Location', kind: 'text' },
  // Electrical Section 3 – Diesel Generator
  dg_capacity_kw: { label: 'DG Capacity', unit: 'kW', kind: 'number', min: 0 },
  dg_loading_factor_pct: { label: 'DG Loading Factor', unit: '%', kind: 'number', min: 0, max: 100 },
  dg_diversity_pct: { label: 'DG Diversity', unit: '%', kind: 'number', min: 0, max: 100 },
  dg_config: { label: 'DG Configuration', kind: 'select', options: ['N', 'N+1'] },
  dg_type: { label: 'DG Type', kind: 'select', options: SELECT_OPTIONS.dg_type },
  dg_location: { label: 'DG Location', kind: 'text' },
  // Electrical Section 5 – Energy Metering
  energy_metering_apps: { label: 'Energy Metering Applications', kind: 'select', options: SELECT_OPTIONS.energy_metering_apps },
  // Electrical Section 6 – Electric Charging
  ev_charging_provision: { label: 'EV Charging Provision', kind: 'select', options: SELECT_OPTIONS.ev_charging_provision },
  ev_car_spaces: { label: 'Car Parking Spaces with Charging', unit: 'nos', kind: 'number', min: 0 },
  ev_bike_spaces: { label: 'Bike Parking Spaces with Charging', unit: 'nos', kind: 'number', min: 0 },
  // Electrical Section 7 – Solar PV
  solar_no_panels: { label: 'No. of Panels', unit: 'nos', kind: 'number', min: 0 },
  solar_total_kwp: { label: 'Total Solar PV', unit: 'kWp', kind: 'computed' },
  solar_tilt_angle: { label: 'Tilt Angle', unit: '°', kind: 'number', min: 0, max: 90 },
  solar_orientation: { label: 'Orientation', kind: 'select', options: SELECT_OPTIONS.solar_orientation },
  // Electrical Section 11 – IT
  telecom_room_location: { label: 'Location of Telecom Room', kind: 'text' },
  telecom_room_size_sqm: { label: 'Size of Telecom Room', unit: 'sq.m', kind: 'number', min: 0 },
  no_it_risers: { label: 'No. of IT Risers', unit: 'nos', kind: 'number', min: 0 },
  no_lv_chambers: { label: 'No. of LV Chambers', unit: 'nos', kind: 'number', min: 0 },
  cable_tray_dimension_mm: { label: 'Cable Tray Dimension', unit: 'mm', kind: 'number', min: 0 },
  telecom_room_provision: { label: 'Telecom Room Provision', kind: 'text' },
  telecom_ac_units: { label: '2 Air-Conditioning Units', kind: 'select', options: ['Yes', 'No'] },
  novec_fire_suppression: { label: 'NOVEC-1230 Fire Suppression', kind: 'select', options: ['Yes', 'No'] },
  access_control_it: { label: 'Access Control', kind: 'select', options: ['Yes', 'No'] },
  power_provision_kw: { label: 'Power Provision', unit: 'kW', kind: 'number', min: 0 },
  ups_provision: { label: 'UPS Provision', kind: 'select', options: ['Yes', 'No'] },

  // Electrical
  power_supply_sources: { label: 'Power Supply – No. of Sources', kind: 'select', options: SELECT_OPTIONS.power_supply_sources },
  tenant_power_va_sqft: { label: 'Tenant Power excl. AHU (VA/sq. ft Carpet)', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  tenant_power_incl_ahu_va: { label: 'Tenant Power incl. AHU (VA/sq. ft Carpet)', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  common_area_power_va: { label: 'Common Area Power (VA/sq. ft Carpet)', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  total_va_sqft_carpet: { label: 'Total VA/Sq. Ft. (Carpet)', unit: 'VA/sq. ft', kind: 'computed' },
  total_va_sqft_saleable: { label: 'Total VA/Sq. Ft. (Saleable)', unit: 'VA/sq. ft', kind: 'computed' },
  va_sqft_bua_tenant: { label: 'VA/Sq. Ft BUA – Tenant', unit: 'VA/sq. ft', kind: 'computed' },
  va_sqft_bua_common_ex_ev: { label: 'VA/Sq. Ft BUA – Common excl. EV', unit: 'VA/sq. ft', kind: 'computed' },
  va_sqft_bua_ev: { label: 'VA/Sq. Ft BUA – EV Only', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  va_sqft_bua_total: { label: 'VA/Sq. Ft BUA – Total', unit: 'VA/sq. ft', kind: 'computed' },
  baseline_epi: { label: 'Baseline EPI', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  epi_superstructure: { label: 'EPI (on Superstructure)', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  epi_bua: { label: 'EPI (on BUA)', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  transformer_redundancy: { label: 'Transformer N+1 or N+standby', kind: 'select', options: SELECT_OPTIONS.transformer_redundancy },
  transformer_sizing_calc: { label: 'Total kVA Transformer Sizing (calculated)', unit: 'kVA', kind: 'number', min: 0 },
  transformer_loading_pct: { label: 'Transformer Loading (%)', unit: '%', kind: 'number', min: 0, max: 100 },
  transformer_sizing_after_loading: { label: 'Transformer Sizing After Loading', unit: 'kVA', kind: 'computed' },
  transformer_capacity_diversity: { label: 'Transformer Capacity (Diversity)', unit: 'kVA', kind: 'number', min: 0 },
  va_sqft_transformer: { label: 'VA/Sq. Ft (Transformer Working Capacity)', unit: 'VA/sq. ft', kind: 'computed' },
  dg_redundancy: { label: 'DG N+1 or N+standby', kind: 'select', options: SELECT_OPTIONS.dg_redundancy },
  dg_load_va_saleable: { label: 'DG Load VA/sq. ft (Saleable)', unit: 'VA/sq. ft', kind: 'computed' },
  dg_load_va_bua: { label: 'DG Load VA/sq. ft (BUA)', unit: 'VA/sq. ft', kind: 'computed' },
  dg_capacity_calc: { label: 'DG Capacity (kVA) calculated', unit: 'kVA', kind: 'number', min: 0 },
  dg_loading_pct: { label: 'DG Loading (%)', unit: '%', kind: 'number', min: 0, max: 100 },
  va_sqft_dg_capacity: { label: 'VA/Sq. Ft (DG Capacity)', unit: 'VA/sq. ft', kind: 'computed' },
  dg_set_kva_after_loading: { label: 'DG Set kVA After Loading (excl. car charging)', unit: 'kVA', kind: 'computed' },
  dg_capacity_selected: { label: 'DG Capacity (kVA) Selected', unit: 'kVA', kind: 'number', min: 0 },
  hsd_capacity: { label: 'HSD Capacity', unit: 'KL', kind: 'number', min: 0 },
  hsd_backup: { label: 'HSD Backup', kind: 'text' },
  bus_riser_sizing: { label: 'Bus Riser Sizing on Carpet', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  tenant_isolator_sizing: { label: 'Tenant Isolator/Tap Sizing on Carpet', unit: 'VA/sq. ft', kind: 'number', min: 0, decimals: 2 },
  bus_riser_n1: { label: 'N+1 (Bus Riser)', kind: 'select', options: SELECT_OPTIONS.bus_riser_n1 },
  earthing_lv: { label: 'Earthing – LV Equipment', kind: 'text' },
  earthing_elv: { label: 'Earthing – ELV Critical Room', kind: 'text' },
  lps: { label: 'LPS', kind: 'text' },
  electrical_risers: { label: 'No. of Electrical Risers', kind: 'number', min: 0 },
  it_risers: { label: 'No. of IT/Data/Telephone Risers', kind: 'number', min: 0 },
  ups_elevator: { label: 'UPS for Elevator', kind: 'select', options: SELECT_OPTIONS.ups_elevator },
  solar_panel_capacity: { label: 'Solar Panel Capacity', unit: 'kW', kind: 'number', min: 0 },
  solar_panel_pct: { label: 'Solar Panel % of Building Load', unit: '%', kind: 'number', min: 0, max: 100 },
  car_park_charging: { label: 'Car Park Charging', kind: 'select', options: SELECT_OPTIONS.car_park_charging },
  car_charging_pct: { label: '% of Car Charging', unit: '%', kind: 'number', min: 0, max: 100 },
  electrical_package_cost_lumpsum: { label: 'Package Cost – Electrical', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },
  dg_package_cost_lumpsum: { label: 'Package Cost – DG', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Public Health – Water Supply
  water_distribution_type: { label: 'Water Distribution', kind: 'select', options: SELECT_OPTIONS.water_distribution },
  occupancy_basis_water: { label: 'Occupancy Basis for Water Demand', kind: 'text' },
  total_occupants_water: { label: 'Total No. of Occupants', unit: 'nos', kind: 'number', min: 0 },
  ugt_raw_water_kl: { label: 'UGT – Raw Water', unit: 'KL', kind: 'number', min: 0 },
  ugt_treated_water_kl: { label: 'UGT – Treated Water', unit: 'KL', kind: 'number', min: 0 },
  ugt_domestic_water_kl: { label: 'UGT – Domestic Water', unit: 'KL', kind: 'number', min: 0 },
  ugt_flushing_water_kl: { label: 'UGT – Flushing Water', unit: 'KL', kind: 'number', min: 0 },
  ugt_cooling_tower_makeup_kl: { label: 'UGT – Cooling Tower Make-up', unit: 'KL', kind: 'number', min: 0 },
  ugt_irrigation_kl: { label: 'UGT – Irrigation', unit: 'KL', kind: 'number', min: 0 },
  ugt_condensate_kl: { label: 'UGT – Condensate', unit: 'KL', kind: 'number', min: 0 },
  oht_domestic_water_kl: { label: 'OHT – Domestic Water', unit: 'KL', kind: 'number', min: 0 },
  oht_flushing_water_kl: { label: 'OHT – Flushing Water', unit: 'KL', kind: 'number', min: 0 },
  oht_cooling_tower_makeup_kl: { label: 'OHT – Cooling Tower Make-up', unit: 'KL', kind: 'number', min: 0 },
  stp_location: { label: 'STP Location', kind: 'text' },
  water_meters: { label: 'Water Meters', kind: 'select', options: ['Municipal', 'Domestic', 'Flushing', 'Irrigation', 'Cooling Tower Make-up', 'Rainwater', 'Condensate'] },
  bms_water_meters: { label: 'BMS-Compatible Water Meters', kind: 'select', options: SELECT_OPTIONS.bms_water_meters },
  // Public Health – Drainage
  drainage_system: { label: 'Drainage System', kind: 'select', options: SELECT_OPTIONS.drainage_system },
  kitchen_waste_stack: { label: 'Kitchen Waste Stack', kind: 'select', options: SELECT_OPTIONS.kitchen_waste_stack },
  // Public Health – Stormwater
  rainwater_tank_capacity_m3: { label: 'Rainwater Tank Capacity', unit: 'm³', kind: 'number', min: 0 },
  rainwater_tank_location: { label: 'Rainwater Tank Location', kind: 'text' },
  recharge_capacity_m3: { label: 'Recharge Capacity', unit: 'm³', kind: 'number', min: 0 },
  // Public Health – Waste
  centralised_garbage_room: { label: 'Centralised Garbage Room', kind: 'select', options: ['Yes', 'No'] },
  garbage_room_location: { label: 'Garbage Room Location', kind: 'text' },
  owc_capacity_kg: { label: 'OWC Capacity', unit: 'kg', kind: 'number', min: 0 },
  owc_location: { label: 'OWC Location', kind: 'text' },
  // Public Health – Costing (calculated)
  water_consumption_kl_person: { label: 'Water Consumption', unit: 'KL/person', kind: 'computed' },
  rainwater_tank_capacity_kl: { label: 'Rainwater Tank Capacity', unit: 'KL', kind: 'computed' },
  recharge_capacity_kl: { label: 'Recharge Capacity', unit: 'KL', kind: 'computed' },

  // Plumbing
  water_supply_drainage: { label: 'Water Supply and Drainage', unit: 'sq. ft/person', kind: 'number', min: 0 },
  hydropneumatic_or_gravity: { label: 'Hydropneumatic or Gravity Based', kind: 'select', options: SELECT_OPTIONS.hydropneumatic_or_gravity },
  ugt_storage_days: { label: 'UGT Storage Capacity', unit: 'days', kind: 'number', min: 0 },
  flood_mitigation: { label: 'Flood Mitigation Study and Plan', kind: 'text' },
  rain_water_harvesting: { label: 'Rain Water Harvesting System', kind: 'text' },
  tenant_exec_washroom: { label: 'Tenant Floor Executive Washroom', kind: 'select', options: SELECT_OPTIONS.tenant_exec_washroom },
  stp_kld: { label: 'STP – KLD', unit: 'KLD', kind: 'number', min: 0 },
  stp_type: { label: 'STP Type', kind: 'select', options: SELECT_OPTIONS.stp_type },
  domestic_water_ugt: { label: 'Domestic Water Tank – UGT', unit: 'KLD', kind: 'number', min: 0 },
  domestic_water_oht: { label: 'Domestic Water Tank – OHT', unit: 'KLD', kind: 'number', min: 0 },
  flushing_water_ugt: { label: 'Flushing Water Tank – UGT', unit: 'KLD', kind: 'number', min: 0 },
  flushing_water_oht: { label: 'Flushing Water Tank – OHT', unit: 'KLD', kind: 'number', min: 0 },
  owc_capacity: { label: 'OWC Capacity', unit: 'KG/Day', kind: 'number', min: 0 },
  owc_cost_rs_sqft: { label: 'OWC Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2 },
  phe_package_cost_lumpsum: { label: 'Package Cost – PHE', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Fire Protection
  ff_pumps_system: { label: 'Fire Protection Pumps and System', kind: 'text' },
  express_risers: { label: 'Express Risers Provided', kind: 'text' },
  intermediate_tank: { label: 'Intermediate Tank Provided', kind: 'text' },
  drencher_podium: { label: 'Drencher in Podium Floor', kind: 'text' },
  drencher_typical: { label: 'Drencher in Typical Floor', kind: 'text' },
  ff_package_cost_lumpsum: { label: 'Package Cost – Fire Protection', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Fire Protection (new fields)
  ff_underground_tank_kl: { label: 'Underground Fire Tank', unit: 'KL', kind: 'number', min: 0 },
  ff_intermediate_tank_kl: { label: 'Intermediate Fire Tank', unit: 'KL', kind: 'number', min: 0 },
  ff_overhead_tank_kl: { label: 'Overhead Fire Tank', unit: 'KL', kind: 'number', min: 0 },
  ff_drencher: { label: 'Drencher', kind: 'select', options: SELECT_OPTIONS.ff_drencher },
  ff_express_riser: { label: 'Express Riser', kind: 'select', options: SELECT_OPTIONS.ff_express_riser },
  ff_dry_riser: { label: 'Dry Riser', kind: 'select', options: SELECT_OPTIONS.ff_dry_riser },
  ff_wet_riser: { label: 'Wet Riser', kind: 'select', options: SELECT_OPTIONS.ff_wet_riser },
  ff_sprinkler_riser: { label: 'Sprinkler Riser', kind: 'select', options: SELECT_OPTIONS.ff_sprinkler_riser },
  ff_ev_protection: { label: 'Fire Protection for EVs', kind: 'select', options: SELECT_OPTIONS.ff_ev_protection },
  ff_cost: { label: 'Fire Protection Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2 },
  fapa_system: { label: 'FAPA System', kind: 'text' },
  fapa_addressable_type: { label: 'Addressable (UL/FM or EN/VDS)', kind: 'select', options: ['UL/FM', 'EN/VDS'] },
  fapa_cables_type: { label: 'Cables Used', kind: 'text' },
  fapa_cost_val: { label: 'FAPA Cost', unit: '₹/Sq. ft (BUA)', kind: 'number', min: 0, decimals: 2 },

  // FAPA
  fapa_technology: { label: 'FAPA Technology', kind: 'text' },
  fapa_addressable: { label: 'Addressable', kind: 'select', options: SELECT_OPTIONS.fapa_addressable },
  fapa_cables: { label: 'Cables Used', kind: 'text' },
  fapa_package_cost_lumpsum: { label: 'Package Cost – FAPA', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // CCTV
  cctv_type: { label: 'CCTV', kind: 'text' },
  security_access_control: { label: 'Security and Access Control', kind: 'text' },
  cctv_package_cost_lumpsum: { label: 'Package Cost – CCTV', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Building Envelope
  glazing_u_value: { label: 'Glazing U Value', unit: 'W/m²K', kind: 'number', min: 0, decimals: 2 },
  vlt: { label: 'VLT', unit: '%', kind: 'number', min: 0, max: 100 },
  glazing_shgc: { label: 'Glazing SHGC', kind: 'number', min: 0, max: 1, decimals: 2 },
  wall_u_value: { label: 'Wall U Value', unit: 'W/m²K', kind: 'number', min: 0, decimals: 2 },
  roof_u_value: { label: 'Roof U Value', unit: 'W/m²K', kind: 'number', min: 0, decimals: 2 },
  spandrel_u_value: { label: 'Spandrel Panels U Value', unit: 'W/m²K', kind: 'number', min: 0, decimals: 2 },
  spandrel_height: { label: 'Spandrel Height', unit: 'm', kind: 'number', min: 0 },
  punched_windows: { label: 'Punched Windows / Knockout Panel', kind: 'select', options: SELECT_OPTIONS.punched_windows },
  wwr: { label: 'WWR', unit: '%', kind: 'number', min: 0, max: 100 },
  facade_power_controller: { label: 'Power Supply/Controller for Façade (>70m)', kind: 'select', options: SELECT_OPTIONS.facade_power_controller },

  // Building Envelope (new fields)
  glazing_height: { label: 'Glazing Height', unit: 'm', kind: 'number', min: 0 },
  glazing_types: { label: 'Additional Glazing Types', kind: 'repeatable' },

  // Sustainability
  sustainability_certification: { label: 'Building Certification (Legacy)', kind: 'text' },
  certification_types: { label: 'Certification Types', kind: 'select', options: SELECT_OPTIONS.certification_types },
  custom_certifications: { label: 'Custom Certifications', kind: 'repeatable' },

  // Energy (also stored in extended_fields for backward compat)
  annual_energy_kwh: { label: 'Annual Energy Consumption', unit: 'kWh', kind: 'number', min: 0, placeholder: 'Used for KW/TR and EPI KPI calculations' },
  operating_hours: { label: 'Operating Hours', unit: 'hrs/yr', kind: 'number', min: 0, placeholder: 'Default: 3,000 hrs/yr' },
};

// ============================================================================
// MERGED FIELD METADATA
// ============================================================================

export const PROJECT_INPUT_FIELD_META: Record<ProjectInputField, ProjectInputFieldMeta> = {
  ...EXISTING_FIELD_META,
  ...EXTENDED_FIELD_META,
} as Record<ProjectInputField, ProjectInputFieldMeta>;

// ============================================================================
// COMPUTED FIELDS
// ============================================================================

export function getComputedFields(inputs: Record<string, unknown>): ComputedFieldDef[] {
  const bua = Number(inputs.built_up_area) || 0;
  const carpet = Number(inputs.carpet_area) || 0;
  const saleable = Number(inputs.saleable_area) || 0;

  const safeDiv = (n: number, d: number): number | null => d > 0 ? n / d : null;
  const pct = (n: number, d: number): number | null => d > 0 ? (n / d) * 100 : null;

  const plant = Number(inputs.plant_room_area) || 0;
  const leasablePlant = Number(inputs.leasable_plant_room_area) || 0;
  const shaft = Number(inputs.shaft_area) || 0;
  const superstructure = Number(inputs.bua_superstructure) || 0;
  const totalTr = Number(inputs.total_tr) || 0;
  const tenantKva = Number(inputs.tenant_power_kva) || 0;
  const commonKva = Number(inputs.common_area_power_kva) || 0;
  const totalKva = tenantKva + commonKva;
  const totalVa = totalKva * 1000;
  const transformerCalc = Number(inputs.transformer_sizing_calc) || 0;
  const normalizeLoadingFactor = (value: unknown): number => {
    const numeric = Number(value) || 0;
    return numeric > 1 ? numeric / 100 : numeric;
  };
  const transformerLoading = normalizeLoadingFactor(inputs.transformer_loading_pct);
  const dgCalc = Number(inputs.dg_capacity_calc) || 0;
  const dgLoading = normalizeLoadingFactor(inputs.dg_loading_pct);
  const evVaSqft = Number(inputs.va_sqft_bua_ev) || 0;
  const transformerAfterLoading = transformerCalc > 0 && transformerLoading > 0
    ? transformerCalc / transformerLoading
    : null;
  const dgAfterLoading = dgCalc > 0 && dgLoading > 0
    ? dgCalc / dgLoading
    : null;

  const packageCostRate = [
    'hvac_cost', 'electrical_cost', 'dg_cost', 'fire_fighting_cost',
    'stp_cost', 'owc_cost_rs_sqft', 'phe_cost', 'bms_cost', 'fapa_cost', 'cctv_cost',
  ].reduce((sum, field) => sum + (Number(inputs[field]) || 0), 0);
  const packageLumpSum = [
    'hvac_package_cost_lumpsum', 'electrical_package_cost_lumpsum',
    'dg_package_cost_lumpsum', 'ff_package_cost_lumpsum',
    'phe_package_cost_lumpsum', 'fapa_package_cost_lumpsum',
    'cctv_package_cost_lumpsum',
  ].reduce((sum, field) => sum + (Number(inputs[field]) || 0), 0);

  const fields: ComputedFieldDef[] = [
    // Area & Building
    { field: 'plant_room_bua_pct', label: 'Plant Room / BUA', unit: '%', compute: () => pct(plant, bua) },
    { field: 'leasable_plant_room_bua_pct', label: 'Leasable Plant Room / BUA', unit: '%', compute: () => pct(leasablePlant, bua) },
    { field: 'shaft_area_bua_pct', label: 'Shaft Area / BUA', unit: '%', compute: () => pct(shaft, bua) },
    { field: 'mep_package_value_crores', label: 'MEP Package Value', unit: '₹ Crores', compute: () => {
      if (packageCostRate > 0 && bua > 0) return (packageCostRate * bua) / 10000000;
      return packageLumpSum > 0 ? packageLumpSum / 10000000 : null;
    }},

    // HVAC
    { field: 'population', label: 'Population', unit: 'persons', compute: () => {
      const officeArea = Number(inputs.office_area) || 0;
      const fbArea = Number(inputs.fb_area) || 0;
      const officeDensity = Number(inputs.occupancy_density_office) || 0;
      const fbDensity = Number(inputs.occupancy_density_fb) || 0;
      // Match services.ts POPULATION: safeDiv returns null if denominator is 0,
      // so if either density is 0, the corresponding term is null, and if both
      // are null the result is null. When one is null and the other valid, the
      // null term contributes 0 (consistent with services.ts: (officePop ?? 0) + (fbPop ?? 0)).
      const officeTerm = officeDensity > 0 ? officeArea / officeDensity : 0;
      const fbTerm = fbDensity > 0 ? fbArea / fbDensity : 0;
      if (officeDensity <= 0 && fbDensity <= 0) return null;
      return officeTerm + fbTerm;
    }},
    { field: 'cooling_load_saleable', label: 'Cooling Load Density on Saleable', unit: 'sq. ft/TR', compute: () => safeDiv(saleable, totalTr) },
    { field: 'cooling_load_superstructure', label: 'Cooling Load Density on Superstructure', unit: 'sq. ft/TR', compute: () => safeDiv(superstructure, totalTr) },
    { field: 'cooling_load_carpet', label: 'Cooling Load Density on Carpet', unit: 'sq. ft/TR', compute: () => safeDiv(carpet, totalTr) },

    // HVAC Section 8 – Costing (calculated)
    { field: 'cooling_load_density_sqft_tr', label: 'Cooling Load Density', unit: 'sq. ft/TR', compute: () => safeDiv(bua, totalTr) },
    { field: 'dehumidified_cfm_sqft', label: 'Dehumidified CFM', unit: 'CFM/sq. ft', compute: () => {
      const airflow = Number(inputs.total_dehumidified_airflow) || 0;
      return safeDiv(airflow, bua);
    }},
    { field: 'fresh_air_cfm_sqft', label: 'Fresh Air CFM', unit: 'CFM/sq. ft', compute: () => {
      const airflow = Number(inputs.total_fresh_airflow) || 0;
      return safeDiv(airflow, bua);
    }},
    { field: 'chw_pumping_w_gpm', label: 'Chilled Water Pumping', unit: 'W/GPM', compute: () => {
      const power = (Number(inputs.chw_primary_power_kw) || 0) + (Number(inputs.chw_secondary_power_kw) || 0);
      const flow = (Number(inputs.chw_primary_flow_gpm) || 0) + (Number(inputs.chw_secondary_flow_gpm) || 0);
      return flow > 0 ? (power * 1000) / flow : null;
    }},
    { field: 'condenser_pumping_w_gpm', label: 'Condenser Water Pumping', unit: 'W/GPM', compute: () => {
      const power = Number(inputs.condenser_power_kw) || 0;
      const flow = Number(inputs.condenser_flow_gpm) || 0;
      return flow > 0 ? (power * 1000) / flow : null;
    }},
    { field: 'cooling_tower_w_cfm', label: 'Cooling Tower', unit: 'W/CFM', compute: () => {
      const power = Number(inputs.ct_fan_motor_rating_kw) || 0;
      const airflow = Number(inputs.total_airflow_cfm) || 0;
      return airflow > 0 ? (power * 1000) / airflow : null;
    }},
    { field: 'ct_range', label: 'Range', unit: '°C', compute: () => {
      const waterIn = Number(inputs.ct_condenser_water_in) || 0;
      const waterOut = Number(inputs.ct_condenser_water_out) || 0;
      return waterIn > 0 && waterOut > 0 ? Math.abs(waterIn - waterOut) : null;
    }},
    { field: 'ct_approach', label: 'Approach', unit: '°C', compute: () => {
      const waterOut = Number(inputs.ct_condenser_water_out) || 0;
      const wetBulb = Number(inputs.ct_wet_bulb) || 0;
      return waterOut > 0 && wetBulb > 0 ? waterOut - wetBulb : null;
    }},

    // Public Health – Costing (calculated)
    { field: 'water_consumption_kl_person', label: 'Water Consumption', unit: 'KL/person', compute: () => {
      const occupants = Number(inputs.total_occupants_water) || 0;
      const stpKld = Number(inputs.stp_kld) || 0;
      return occupants > 0 && stpKld > 0 ? stpKld / occupants : null;
    }},
    { field: 'rainwater_tank_capacity_kl', label: 'Rainwater Tank Capacity', unit: 'KL', compute: () => {
      const m3 = Number(inputs.rainwater_tank_capacity_m3) || 0;
      return m3 > 0 ? m3 : null;
    }},
    { field: 'recharge_capacity_kl', label: 'Recharge Capacity', unit: 'KL', compute: () => {
      const m3 = Number(inputs.recharge_capacity_m3) || 0;
      return m3 > 0 ? m3 : null;
    }},

    // Electrical
    { field: 'total_va_sqft_carpet', label: 'Total VA/Sq. Ft. (Carpet)', unit: 'VA/sq. ft', compute: () => safeDiv(totalVa, carpet) },
    { field: 'total_va_sqft_saleable', label: 'Total VA/Sq. Ft. (Saleable)', unit: 'VA/sq. ft', compute: () => safeDiv(totalVa, saleable) },
    { field: 'va_sqft_bua_tenant', label: 'VA/Sq. Ft BUA – Tenant', unit: 'VA/sq. ft', compute: () => safeDiv(tenantKva * 1000, bua) },
    { field: 'va_sqft_bua_common_ex_ev', label: 'VA/Sq. Ft BUA – Common excl. EV', unit: 'VA/sq. ft', compute: () => safeDiv(commonKva * 1000, bua) },
    { field: 'va_sqft_bua_total', label: 'VA/Sq. Ft BUA – Total', unit: 'VA/sq. ft', compute: () => {
      const baseDensity = safeDiv(totalVa, bua);
      return baseDensity == null ? null : baseDensity + evVaSqft;
    }},
    { field: 'transformer_sizing_after_loading', label: 'Transformer Sizing After Loading', unit: 'kVA', compute: () => transformerAfterLoading },
    { field: 'va_sqft_transformer', label: 'VA/Sq. Ft (Transformer)', unit: 'VA/sq. ft', compute: () => {
      return transformerAfterLoading == null ? null : safeDiv(transformerAfterLoading * 1000, bua);
    }},
    { field: 'dg_load_va_saleable', label: 'DG Load VA/sq. ft (Saleable)', unit: 'VA/sq. ft', compute: () => safeDiv(dgCalc * 1000, saleable) },
    { field: 'dg_load_va_bua', label: 'DG Load VA/sq. ft (BUA)', unit: 'VA/sq. ft', compute: () => safeDiv(dgCalc * 1000, bua) },
    { field: 'va_sqft_dg_capacity', label: 'VA/Sq. Ft (DG Capacity)', unit: 'VA/sq. ft', compute: () => {
      const selected = Number(inputs.dg_capacity_selected) || 0;
      return safeDiv(selected * 1000, bua);
    }},
    { field: 'dg_set_kva_after_loading', label: 'DG Set kVA After Loading', unit: 'kVA', compute: () => dgAfterLoading },
    { field: 'solar_total_kwp', label: 'Total Solar PV', unit: 'kWp', compute: () => {
      const panelCapacity = Number(inputs.solar_panel_capacity) || 0;
      const noPanels = Number(inputs.solar_no_panels) || 0;
      return panelCapacity > 0 && noPanels > 0 ? (panelCapacity * noPanels) / 1000 : null;
    }},
  ];

  return fields;
}

// ============================================================================
// ENGINEERING SERVICE GROUPS (restructured)
// ============================================================================

export const ENGINEERING_SERVICE_GROUPS: readonly EngineeringServiceGroup[] = [
  // 1. Architectural Parameters
  {
    key: 'area-building',
    title: 'Architectural Parameters',
    fields: [
      'bua_substructure', 'bua_superstructure', 'building_heights',
      'floor_to_floor_height', 'office_false_ceiling', 'corridor_false_ceiling',
      'occupancy_hvac_bua', 'occupancy_phe_bua',
      'plant_room_area', 'leasable_plant_room_area', 'shaft_area',
      'plant_room_bua_pct', 'leasable_plant_room_bua_pct', 'shaft_area_bua_pct',
      'chiller_plant_room_location', 'central_ac_plant_room_area', 'central_ac_plant_location',
      'standard_followed', 'lesson_learned',
    ],
  },
  // 2. HVAC
  {
    key: 'hvac',
    title: 'HVAC',
    fields: [],
    subGroups: [
      {
        key: 'hvac-area',
        title: 'Section 1 – Area',
        fields: [
          'office_area', 'retail_area', 'fb_area', 'additional_spaces',
          'total_tr', 'gross_area',
          'cooling_load_density_sqft_tr',
        ],
      },
      {
        key: 'hvac-inputs',
        title: 'Section 2 – Inputs',
        fields: [
          'occupancy_density_office', 'occupancy_density_retail', 'occupancy_density_fb', 'occupancy_lobby',
          'occupancy_thermal_setpoint_office', 'occupancy_thermal_setpoint_retail',
          'occupancy_thermal_setpoint_fb', 'occupancy_thermal_setpoint_lobby',
          'lighting_load_w', 'lighting_gain_office', 'lighting_gain_retail', 'lighting_gain_fb',
          'equipment_thermal_load', 'equipment_gain_office', 'equipment_gain_retail', 'equipment_gain_fb',
          'outdoor_db_temp', 'outdoor_db_temp_source', 'outdoor_wb_temp', 'outdoor_wb_temp_source',
        ],
      },
      {
        key: 'hvac-plant',
        title: 'Section 3 – Centralised Plant',
        fields: [
          'total_ac_tonnage', 'diversity', 'type_of_chiller_select',
          'chiller_tonnage_water', 'chiller_units_water',
          'chiller_tonnage_air', 'chiller_units_air',
          'chw_pumping_type', 'chw_primary_flow_gpm', 'chw_primary_power_kw',
          'chw_secondary_flow_gpm', 'chw_secondary_power_kw',
          'condenser_pumping_type', 'condenser_flow_gpm', 'condenser_power_kw',
          'ct_condenser_water_in', 'ct_condenser_water_out', 'ct_wet_bulb',
          'ct_range', 'ct_approach', 'ct_fan_type', 'ct_fan_motor_rating_kw',
          'cpo', 'cpm',
        ],
      },
      {
        key: 'hvac-ahu',
        title: 'Section 4 – Air Handling Units',
        fields: [
          'total_dehumidified_airflow', 'chw_supply_temp', 'chw_return_temp',
          'ahu_fan_type', 'ahu_filtration', 'ahu_fan_kw', 'ahu_scope_select',
        ],
      },
      {
        key: 'hvac-tfahu',
        title: 'Section 5 – Treated Fresh Air Handling Units',
        fields: [
          'total_fresh_airflow', 'tfahu_chw_supply_temp', 'tfahu_chw_return_temp',
          'tfahu_fan_type', 'tfahu_filtration', 'tfahu_fan_kw',
          'fresh_air_precooling', 'passive_desiccant_wheel', 'pct_extra_fresh_air', 'tfahu_scope',
          'fresh_air_cfm_sqft',
        ],
      },
      {
        key: 'hvac-server',
        title: 'Section 6 – Server Cooling',
        fields: [
          'server_cooling_source', 'server_cooling_mode', 'server_cooling_scope',
          'server_load', 'mode_server_cooling',
        ],
      },
      {
        key: 'hvac-ventilation',
        title: 'Section 7 – Ventilation',
        fields: [
          'toilet_exhaust', 'toilet_exhaust_acph',
          'lift_lobby_pressurization', 'lift_well_pressurization',
          'kitchen_exhaust', 'kitchen_exhaust_acph',
          'owc_exhaust', 'owc_exhaust_acph',
          'stp_exhaust_acph', 'basement_ventilation', 'pantry_exhaust',
          'smoke_extraction_tenant', 'smoke_extraction_tenants',
          'ventilation_electrical_room_typ', 'ventilation_electrical_room',
        ],
      },
      {
        key: 'hvac-cost',
        title: 'Section 8 – Costing (Calculated Results)',
        fields: [
          'cooling_load_density_sqft_tr', 'dehumidified_cfm_sqft', 'fresh_air_cfm_sqft',
          'chw_pumping_w_gpm', 'condenser_pumping_w_gpm', 'cooling_tower_w_cfm',
          'hvac_package_cost_lumpsum', 'hvac_cost',
        ],
      },
    ],
  },
  // 3. Electrical
  {
    key: 'electrical-dg',
    title: 'Electrical',
    fields: [],
    subGroups: [
      {
        key: 'electrical-general',
        title: 'Section 1 – General',
        fields: [
          'power_supply_sources', 'common_area_power_kw', 'common_area_power_kva',
          'common_area_power_density_kw', 'common_area_power_density_kva',
          'tenant_area_power_kw', 'tenant_power_kva',
          'tenant_area_power_density_kw', 'tenant_area_power_density_kva',
          'total_connected_load_kw', 'total_demand_load_kw', 'carpet_area_electrical',
        ],
      },
      {
        key: 'electrical-transformer',
        title: 'Section 2 – Transformer',
        fields: [
          'transformer_capacity_kw', 'transformer_capacity_kva',
          'transformer_loading_pct_val', 'transformer_diversity_pct',
          'transformer_config', 'transformer_type', 'transformer_location',
          'transformer_redundancy', 'transformer_sizing_calc', 'transformer_loading_pct',
          'transformer_sizing_after_loading', 'transformer_capacity_diversity',
          'va_sqft_transformer',
        ],
      },
      {
        key: 'electrical-dg',
        title: 'Section 3 – Diesel Generator',
        fields: [
          'dg_capacity_kw', 'dg_capacity_kva',
          'dg_loading_factor_pct', 'dg_diversity_pct',
          'dg_config', 'dg_type', 'dg_location',
          'hsd_capacity', 'hsd_backup',
          'dg_loading_factor', 'dg_redundancy',
          'dg_capacity_calc', 'dg_loading_pct', 'dg_capacity_selected',
          'dg_load_va_saleable', 'dg_load_va_bua', 'va_sqft_dg_capacity',
          'dg_set_kva_after_loading',
        ],
      },
      {
        key: 'electrical-distribution',
        title: 'Section 4 – Distribution',
        fields: [
          'bus_riser_sizing', 'bus_riser_n1', 'tenant_isolator_sizing',
          'earthing_lv', 'earthing_elv', 'lps',
        ],
      },
      {
        key: 'electrical-metering',
        title: 'Section 5 – Energy Metering',
        fields: [
          'energy_metering_apps',
        ],
      },
      {
        key: 'electrical-charging',
        title: 'Section 6 – Electric Charging',
        fields: [
          'ev_charging_provision', 'ev_car_spaces', 'ev_bike_spaces',
          'car_park_charging', 'car_charging_pct',
        ],
      },
      {
        key: 'electrical-solar',
        title: 'Section 7 – Solar Photovoltaics',
        fields: [
          'solar_panel_capacity', 'solar_no_panels', 'solar_total_kwp',
          'solar_tilt_angle', 'solar_orientation', 'solar_panel_pct',
        ],
      },
      {
        key: 'electrical-cost',
        title: 'Section 8 – Electrical Costing',
        fields: [
          'electrical_package_cost_lumpsum', 'electrical_cost',
        ],
      },
      {
        key: 'bms',
        title: 'Section 9 – BMS Costing',
        fields: [
          'bms_cost',
        ],
      },
      {
        key: 'cctv-cost',
        title: 'Section 10 – CCTV Costing',
        fields: [
          'cctv_type', 'security_access_control',
          'cctv_package_cost_lumpsum', 'cctv_cost',
        ],
      },
      {
        key: 'electrical-it',
        title: 'Section 11 – IT',
        fields: [
          'telecom_room_location', 'telecom_room_size_sqm',
          'no_it_risers', 'no_lv_chambers', 'cable_tray_dimension_mm',
          'telecom_room_provision', 'telecom_ac_units',
          'novec_fire_suppression', 'access_control_it',
          'power_provision_kw', 'ups_provision',
          'electrical_risers', 'it_risers', 'ups_elevator',
        ],
      },
    ],
  },
  // 4. Public Health
  {
    key: 'plumbing-phe',
    title: 'Public Health',
    fields: [],
    subGroups: [
      {
        key: 'phe-water-supply',
        title: 'Water Supply',
        fields: [
          'water_distribution_type', 'occupancy_basis_water', 'total_occupants_water',
          'ugt_raw_water_kl', 'ugt_treated_water_kl', 'ugt_domestic_water_kl',
          'ugt_flushing_water_kl', 'ugt_cooling_tower_makeup_kl', 'ugt_irrigation_kl', 'ugt_condensate_kl',
          'oht_domestic_water_kl', 'oht_flushing_water_kl', 'oht_cooling_tower_makeup_kl',
          'stp_kld', 'stp_type', 'stp_location',
          'water_meters', 'bms_water_meters',
          'water_supply_drainage', 'hydropneumatic_or_gravity',
        ],
      },
      {
        key: 'phe-drainage',
        title: 'Drainage',
        fields: [
          'drainage_system', 'kitchen_waste_stack',
        ],
      },
      {
        key: 'phe-stormwater',
        title: 'Stormwater',
        fields: [
          'rainwater_tank_capacity_m3', 'rainwater_tank_location', 'recharge_capacity_m3',
          'rain_water_harvesting', 'flood_mitigation',
        ],
      },
      {
        key: 'phe-waste',
        title: 'Waste',
        fields: [
          'centralised_garbage_room', 'garbage_room_location',
          'owc_capacity_kg', 'owc_location', 'owc_capacity',
        ],
      },
      {
        key: 'phe-cost',
        title: 'Costing (Calculated)',
        fields: [
          'water_consumption_kl_person', 'rainwater_tank_capacity_kl', 'recharge_capacity_kl',
          'owc_cost_rs_sqft',
          'phe_package_cost_lumpsum', 'stp_cost', 'phe_cost',
        ],
      },
    ],
  },
  // 5. Fire Protection
  {
    key: 'fire-fighting',
    title: 'Fire Protection',
    fields: [],
    subGroups: [
      {
        key: 'ff-tanks',
        title: 'Fire Tanks & Systems',
        fields: [
          'ff_underground_tank_kl', 'ff_intermediate_tank_kl', 'ff_overhead_tank_kl',
          'ff_drencher', 'ff_express_riser', 'ff_dry_riser', 'ff_wet_riser',
          'ff_sprinkler_riser', 'ff_ev_protection',
          'ff_pumps_system', 'express_risers', 'intermediate_tank',
          'drencher_podium', 'drencher_typical',
        ],
      },
      {
        key: 'ff-cost',
        title: 'Cost',
        fields: [
          'ff_package_cost_lumpsum', 'fire_fighting_cost', 'ff_cost',
        ],
      },
      {
        key: 'fapa',
        title: 'FAPA',
        fields: [
          'fapa_system', 'fapa_addressable_type', 'fapa_cables_type',
          'fapa_technology', 'fapa_addressable', 'fapa_cables',
          'fapa_cost', 'fapa_cost_val',
        ],
      },
    ],
  },
  // 6. Building Envelope
  {
    key: 'glass-facade',
    title: 'Building Envelope',
    fields: [
      'glazing_u_value', 'vlt', 'glazing_shgc', 'glazing_types',
      'glazing_height', 'spandrel_height',
      'wall_u_value', 'spandrel_u_value', 'roof_u_value',
      'wwr', 'punched_windows', 'facade_power_controller',
    ],
  },
  // 7. Building Certifications
  {
    key: 'sustainability',
    title: 'Building Certifications',
    fields: [
      'certification_types', 'custom_certifications', 'sustainability_certification',
    ],
  },
  // Energy section REMOVED per Task 8
];

export const TOTAL_COST_FIELDS: readonly ProjectInputField[] = [
  'total_mep_cost',
  'mep_package_value_crores',
];

// ============================================================================
// HELPERS
// ============================================================================

export function isExtendedField(field: ProjectInputField): field is ExtendedFieldKey {
  return field in EXTENDED_FIELD_META;
}

export function formatProjectInputValue(field: ProjectInputField, value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((entry) => {
      if (typeof entry === 'object' && entry !== null) {
        return Object.values(entry).filter((v) => v != null && v !== '').join(' / ');
      }
      return String(entry);
    }).join('; ');
  }
  if (typeof value === 'number') {
    if (COST_FIELDS.includes(field)) {
      return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PROJECT_INPUT_FIELD_META[field].unit}`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

// Flatten extended_fields into a flat record for form use
export function flattenExtendedFields(
  extendedFields: Record<string, unknown> | undefined | null,
  target: Record<string, unknown>,
): void {
  if (!extendedFields) return;
  for (const [key, value] of Object.entries(extendedFields)) {
    target[key] = value;
  }
}

// Collect extended fields back into the nested structure for persistence
export function collectExtendedFields(
  flatForm: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const extendedKeys = Object.keys(EXTENDED_FIELD_META) as ExtendedFieldKey[];
  for (const key of extendedKeys) {
    if (flatForm[key] !== undefined && flatForm[key] !== null) {
      result[key] = flatForm[key];
    }
  }
  return result;
}

// Build a Zod schema for extended_fields from EXTENDED_FIELD_META
// Computed fields are stripped silently (never submitted by client)
export function buildExtendedFieldsSchema(): z.ZodObject<Record<string, z.ZodOptional<z.ZodNullable<z.ZodTypeAny>>>> {
  const shape: Record<string, z.ZodOptional<z.ZodNullable<z.ZodTypeAny>>> = {};
  const computedKeys = new Set<string>();

  for (const [key, meta] of Object.entries(EXTENDED_FIELD_META) as [string, ProjectInputFieldMeta][]) {
    if (meta.kind === 'computed') {
      computedKeys.add(key);
      continue;
    }
    if (meta.kind === 'number') {
      let numSchema = z.number();
      if (meta.min != null) numSchema = numSchema.min(meta.min);
      if (meta.max != null) numSchema = numSchema.max(meta.max);
      if (meta.decimals != null) {
        const multiplier = Math.pow(10, meta.decimals);
        numSchema = numSchema.refine(
          (v) => Number.isInteger(v * multiplier),
          `Must have at most ${meta.decimals} decimal place${meta.decimals === 1 ? '' : 's'}`,
        );
      }
      shape[key] = numSchema.nullable().optional();
    } else if (meta.kind === 'select' && meta.options) {
      shape[key] = z.enum(meta.options as unknown as [string, ...string[]]).nullable().optional();
    } else {
      shape[key] = z.string().nullable().optional();
    }
  }

  return z.object(shape) as z.ZodObject<Record<string, z.ZodOptional<z.ZodNullable<z.ZodTypeAny>>>>;
}

// Strip computed fields from extended_fields payload (silent removal)
export function stripComputedFields(
  extendedFields: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extendedFields)) {
    const meta = EXTENDED_FIELD_META[key as ExtendedFieldKey];
    if (meta?.kind === 'computed') continue;
    result[key] = value;
  }
  return result;
}

// Pre-built schema instance
export const extendedFieldsSchema = buildExtendedFieldsSchema();
