import type { ProjectInputs, ExtendedFieldKey } from '@/types';

// Existing column fields + extended field keys
export type ProjectInputField = Exclude<keyof ProjectInputs, 'id' | 'project_id' | 'extended_fields'> | ExtendedFieldKey;

export type ProjectInputFieldKind = 'number' | 'select' | 'text' | 'computed';

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
  stp_type: ['MBR', 'MBBR'] as const,
  power_supply_sources: ['1', '2', 'N+1'] as const,
  transformer_redundancy: ['N+1', 'N+standby'] as const,
  dg_redundancy: ['N+1', 'N+standby'] as const,
  punched_windows: ['Yes', 'No'] as const,
  facade_power_controller: ['Yes', 'No'] as const,
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
  'total_mep_cost',
];

// ============================================================================
// FIELD METADATA — EXISTING COLUMNS
// ============================================================================

const EXISTING_FIELD_META: Record<string, ProjectInputFieldMeta> = {
  plant_room_area: { label: 'Plant Room Area', unit: 'sqft', kind: 'number', min: 0 },
  leasable_plant_room_area: { label: 'Leasable Plant Room Area', unit: 'sqft', kind: 'number', min: 0 },
  shaft_area: { label: 'Shaft Area', unit: 'sqft', kind: 'number', min: 0 },
  office_area: { label: 'Office Area', unit: 'sqft', kind: 'number', min: 0 },
  fb_area: { label: 'F&B Area', unit: 'sqft', kind: 'number', min: 0 },
  gross_area: { label: 'Gross Area', unit: 'sqft', kind: 'number', min: 0 },
  occupancy_density_office: { label: 'Occupancy Density (Office)', unit: 'sqft/person', kind: 'number', min: 0 },
  occupancy_density_fb: { label: 'Occupancy Density (F&B)', unit: 'sqft/person', kind: 'number', min: 0 },
  total_tr: { label: 'Total TR', unit: 'TR', kind: 'number', min: 0 },
  total_airflow_cfm: { label: 'Total Airflow', unit: 'CFM', kind: 'number', min: 0 },
  hvac_strategy: { label: 'HVAC Strategy', kind: 'select', options: HVAC_STRATEGY_OPTIONS },
  transformer_capacity_kva: { label: 'Transformer Capacity', unit: 'kVA', kind: 'number', min: 0 },
  tenant_power_kva: { label: 'Tenant Power', unit: 'kVA', kind: 'number', min: 0 },
  common_area_power_kva: { label: 'Common Area Power', unit: 'kVA', kind: 'number', min: 0 },
  lighting_load_w: { label: 'Lighting Load', unit: 'W', kind: 'number', min: 0 },
  dg_capacity_kva: { label: 'DG Capacity', unit: 'kVA', kind: 'number', min: 0 },
  dg_loading_factor: { label: 'DG Loading Factor', unit: '0-1', kind: 'number', min: 0, decimals: 2 },
  annual_energy_kwh: { label: 'Annual Energy', unit: 'kWh', kind: 'number', min: 0 },
  hvac_cost: { label: 'HVAC Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 275.50' },
  electrical_cost: { label: 'Electrical Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 260.00' },
  dg_cost: { label: 'DG Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 45.25' },
  fire_fighting_cost: { label: 'Fire Fighting Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 32.00' },
  stp_cost: { label: 'STP Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 80.00' },
  phe_cost: { label: 'PHE Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 55.00' },
  bms_cost: { label: 'BMS Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 30.00' },
  fapa_cost: { label: 'FAPA Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 35.00' },
  cctv_cost: { label: 'CCTV Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 35.00' },
  total_mep_cost: { label: 'Total MEP Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2, placeholder: 'e.g. 812.75' },
  operating_hours: { label: 'Operating Hours', unit: 'hrs/yr', kind: 'number', min: 0 },
};

// ============================================================================
// FIELD METADATA — EXTENDED FIELDS (new fields stored in JSONB)
// ============================================================================

const EXTENDED_FIELD_META: Record<ExtendedFieldKey, ProjectInputFieldMeta> = {
  // Area & Building Parameters
  bua_substructure: { label: 'Total BUA – Substructure', unit: 'sqft', kind: 'number', min: 0 },
  bua_superstructure: { label: 'Total BUA – Superstructure', unit: 'sqft', kind: 'number', min: 0 },
  building_heights: { label: 'Building Heights', unit: 'meters', kind: 'number', min: 0 },
  floor_to_floor_height: { label: 'Floor to Floor Height (Office)', unit: 'm', kind: 'number', min: 0 },
  office_false_ceiling: { label: 'Office False Ceiling Suggested', unit: 'm', kind: 'number', min: 0 },
  corridor_false_ceiling: { label: 'Corridor False Ceiling Suggested', unit: 'm', kind: 'number', min: 0 },
  occupancy_hvac_bua: { label: 'Occupancy – HVAC on BUA', unit: 'nos', kind: 'number', min: 0 },
  occupancy_phe_bua: { label: 'Occupancy – PHE on BUA', unit: 'nos', kind: 'number', min: 0 },
  plant_room_bua_pct: { label: 'Plant Room / BUA', unit: '%', kind: 'computed' },
  leasable_plant_room_bua_pct: { label: 'Leasable Plant Room / BUA', unit: '%', kind: 'computed' },
  shaft_area_bua_pct: { label: 'Shaft Area / BUA', unit: '%', kind: 'computed' },
  chiller_plant_room_location: { label: 'Location of Chiller Plant Room', kind: 'text' },
  mep_package_value_crores: { label: 'MEP Package Value', unit: '₹ Crores', kind: 'computed' },
  lesson_learned: { label: 'Lesson Learned', kind: 'text' },

  // HVAC
  occupancy_lobby: { label: 'Occupancy in Lobby', unit: 'sqft/person', kind: 'number', min: 0 },
  design_temperature_office: { label: 'Design Temperature Inside Office', unit: '°C', kind: 'number' },
  iaq_fresh_air: { label: 'IAQ / Fresh Air', kind: 'text' },
  cooling_load_saleable: { label: 'Cooling Load Density on Saleable Area', unit: 'sqft/TR', kind: 'computed' },
  cooling_load_superstructure: { label: 'Cooling Load Density on BUA – Superstructure', unit: 'sqft/TR', kind: 'computed' },
  cooling_load_carpet: { label: 'Cooling Load Density on Carpet Area', unit: 'sqft/TR', kind: 'computed' },
  diversity_considered: { label: 'Diversity Considered', kind: 'number', min: 0, max: 1, decimals: 2 },
  type_of_chiller: { label: 'Type of Chiller', kind: 'text' },
  chiller_configuration: { label: 'Chiller Configuration', kind: 'text' },
  chiller_parameters: { label: 'Chiller Parameters', kind: 'text' },
  refrigerant_used: { label: 'Refrigerant Used', kind: 'text' },
  critical_room_hvac: { label: 'Critical Room HVAC System', kind: 'text' },
  ahu_scope: { label: 'AHU Scope', kind: 'select', options: SELECT_OPTIONS.hvac_scope },
  cfm_sqft: { label: 'CFM / Sq.Ft.', unit: 'CFM/sqft', kind: 'number', min: 0, decimals: 2 },
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
  equipment_thermal_load: { label: 'Equipment Thermal Load', unit: 'W/sqft', kind: 'number', min: 0 },
  smoke_extraction_tenants: { label: 'Smoke Extraction for Tenants', kind: 'text' },
  server_load: { label: 'Server Load', unit: 'kW', kind: 'number', min: 0 },
  mode_server_cooling: { label: 'Mode of Server Cooling', kind: 'select', options: SELECT_OPTIONS.mode_server_cooling },
  hvac_package_cost_lumpsum: { label: 'Cost of Package (HVAC)', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Electrical & DG
  power_supply_sources: { label: 'Power Supply – No. of Sources', kind: 'select', options: SELECT_OPTIONS.power_supply_sources },
  tenant_power_va_sqft: { label: 'Tenant Power excl. AHU (VA/sqft Carpet)', unit: 'VA/sqft', kind: 'number', min: 0, decimals: 2 },
  tenant_power_incl_ahu_va: { label: 'Tenant Power incl. AHU (VA/sqft Carpet)', unit: 'VA/sqft', kind: 'number', min: 0, decimals: 2 },
  common_area_power_va: { label: 'Common Area Power (VA/sqft Carpet)', unit: 'VA/sqft', kind: 'number', min: 0, decimals: 2 },
  total_va_sqft_carpet: { label: 'Total VA/Sq.Ft. (Carpet)', unit: 'VA/sqft', kind: 'computed' },
  total_va_sqft_saleable: { label: 'Total VA/Sq.Ft. (Saleable)', unit: 'VA/sqft', kind: 'computed' },
  va_sqft_bua_tenant: { label: 'VA/Sqft BUA – Tenant', unit: 'VA/sqft', kind: 'computed' },
  va_sqft_bua_common_ex_ev: { label: 'VA/Sqft BUA – Common excl. EV', unit: 'VA/sqft', kind: 'computed' },
  va_sqft_bua_ev: { label: 'VA/Sqft BUA – EV Only', unit: 'VA/sqft', kind: 'computed' },
  va_sqft_bua_total: { label: 'VA/Sqft BUA – Total', unit: 'VA/sqft', kind: 'computed' },
  baseline_epi: { label: 'Baseline EPI', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  epi_superstructure: { label: 'EPI (on Superstructure)', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  epi_bua: { label: 'EPI (on BUA)', unit: 'kWh/m²/yr', kind: 'number', min: 0 },
  transformer_redundancy: { label: 'Transformer N+1 or N+standby', kind: 'select', options: SELECT_OPTIONS.transformer_redundancy },
  transformer_sizing_calc: { label: 'Total kVA Transformer Sizing (calculated)', unit: 'kVA', kind: 'number', min: 0 },
  transformer_loading_pct: { label: 'Transformer Loading (%)', unit: '%', kind: 'number', min: 0, max: 100 },
  transformer_sizing_after_loading: { label: 'Transformer Sizing After Loading', unit: 'kVA', kind: 'computed' },
  transformer_capacity_diversity: { label: 'Transformer Capacity (Diversity)', unit: 'kVA', kind: 'number', min: 0 },
  va_sqft_transformer: { label: 'VA/Sqft (Transformer Working Capacity)', unit: 'VA/sqft', kind: 'computed' },
  dg_redundancy: { label: 'DG N+1 or N+standby', kind: 'select', options: SELECT_OPTIONS.dg_redundancy },
  dg_load_va_saleable: { label: 'DG Load VA/sqft (Saleable)', unit: 'VA/sqft', kind: 'computed' },
  dg_load_va_bua: { label: 'DG Load VA/sqft (BUA)', unit: 'VA/sqft', kind: 'computed' },
  dg_capacity_calc: { label: 'DG Capacity (kVA) calculated', unit: 'kVA', kind: 'number', min: 0 },
  dg_loading_pct: { label: 'DG Loading (%)', unit: '%', kind: 'number', min: 0, max: 100 },
  va_sqft_dg_capacity: { label: 'VA/Sqft (DG Capacity)', unit: 'VA/sqft', kind: 'computed' },
  dg_set_kva_after_loading: { label: 'DG Set kVA After Loading (excl. car charging)', unit: 'kVA', kind: 'computed' },
  dg_capacity_selected: { label: 'DG Capacity (kVA) Selected', unit: 'kVA', kind: 'number', min: 0 },
  hsd_capacity: { label: 'HSD Capacity', unit: 'KL', kind: 'number', min: 0 },
  hsd_backup: { label: 'HSD Backup', kind: 'text' },
  bus_riser_sizing: { label: 'Bus Riser Sizing on Carpet', unit: 'VA/sqft', kind: 'number', min: 0, decimals: 2 },
  tenant_isolator_sizing: { label: 'Tenant Isolator/Tap Sizing on Carpet', unit: 'VA/sqft', kind: 'number', min: 0, decimals: 2 },
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

  // Plumbing
  water_supply_drainage: { label: 'Water Supply and Drainage', unit: 'sqft/person', kind: 'number', min: 0 },
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
  owc_cost_rs_sqft: { label: 'OWC Cost', unit: '₹/Sq.ft (BUA)', kind: 'number', min: 0, decimals: 2 },
  phe_package_cost_lumpsum: { label: 'Package Cost – PHE', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Fire Fighting
  ff_pumps_system: { label: 'Fire Fighting Pumps and System', kind: 'text' },
  express_risers: { label: 'Express Risers Provided', kind: 'text' },
  intermediate_tank: { label: 'Intermediate Tank Provided', kind: 'text' },
  drencher_podium: { label: 'Drencher in Podium Floor', kind: 'text' },
  drencher_typical: { label: 'Drencher in Typical Floor', kind: 'text' },
  ff_package_cost_lumpsum: { label: 'Package Cost – Fire Fighting', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // FAPA
  fapa_technology: { label: 'FAPA Technology', kind: 'text' },
  fapa_addressable: { label: 'Addressable', kind: 'select', options: SELECT_OPTIONS.fapa_addressable },
  fapa_cables: { label: 'Cables Used', kind: 'text' },
  fapa_package_cost_lumpsum: { label: 'Package Cost – FAPA', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // CCTV
  cctv_type: { label: 'CCTV', kind: 'text' },
  security_access_control: { label: 'Security and Access Control', kind: 'text' },
  cctv_package_cost_lumpsum: { label: 'Package Cost – CCTV', unit: '₹ lump sum', kind: 'number', min: 0, decimals: 2 },

  // Glass Façade
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

  // Sustainability
  sustainability_certification: { label: 'Sustainability / LEED / IGBC / USGBC / WELL', kind: 'text' },

  // Energy (also stored in extended_fields for backward compat)
  annual_energy_kwh: { label: 'Annual Energy', unit: 'kWh', kind: 'number', min: 0 },
  operating_hours: { label: 'Operating Hours', unit: 'hrs/yr', kind: 'number', min: 0 },
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
  const transformerLoading = Number(inputs.transformer_loading_pct) || 0;
  const dgCalc = Number(inputs.dg_capacity_calc) || 0;
  const dgLoading = Number(inputs.dg_loading_pct) || 0;

  const hvacPkg = Number(inputs.hvac_package_cost_lumpsum) || 0;
  const elecPkg = Number(inputs.electrical_package_cost_lumpsum) || 0;
  const dgPkg = Number(inputs.dg_package_cost_lumpsum) || 0;
  const ffPkg = Number(inputs.ff_package_cost_lumpsum) || 0;
  const stpPkgCost = Number(inputs.stp_cost) || 0;
  const phePkg = Number(inputs.phe_package_cost_lumpsum) || 0;
  const bmsPkgCost = Number(inputs.bms_cost) || 0;
  const fapaPkgCost = Number(inputs.fapa_cost) || 0;
  const cctvPkgCost = Number(inputs.cctv_cost) || 0;

  const fields: ComputedFieldDef[] = [
    // Area & Building
    { field: 'plant_room_bua_pct', label: 'Plant Room / BUA', unit: '%', compute: () => pct(plant, bua) },
    { field: 'leasable_plant_room_bua_pct', label: 'Leasable Plant Room / BUA', unit: '%', compute: () => pct(leasablePlant, bua) },
    { field: 'shaft_area_bua_pct', label: 'Shaft Area / BUA', unit: '%', compute: () => pct(shaft, bua) },
    { field: 'mep_package_value_crores', label: 'MEP Package Value', unit: '₹ Crores', compute: () => {
      const total = hvacPkg + elecPkg + dgPkg + ffPkg + phePkg;
      return total > 0 ? total / 10000000 : null;
    }},

    // HVAC
    { field: 'cooling_load_saleable', label: 'Cooling Load Density on Saleable', unit: 'sqft/TR', compute: () => safeDiv(saleable, totalTr) },
    { field: 'cooling_load_superstructure', label: 'Cooling Load Density on Superstructure', unit: 'sqft/TR', compute: () => safeDiv(superstructure, totalTr) },
    { field: 'cooling_load_carpet', label: 'Cooling Load Density on Carpet', unit: 'sqft/TR', compute: () => safeDiv(carpet, totalTr) },

    // Electrical
    { field: 'total_va_sqft_carpet', label: 'Total VA/Sq.Ft. (Carpet)', unit: 'VA/sqft', compute: () => safeDiv(totalVa, carpet) },
    { field: 'total_va_sqft_saleable', label: 'Total VA/Sq.Ft. (Saleable)', unit: 'VA/sqft', compute: () => safeDiv(totalVa, saleable) },
    { field: 'va_sqft_bua_tenant', label: 'VA/Sqft BUA – Tenant', unit: 'VA/sqft', compute: () => safeDiv(tenantKva * 1000, bua) },
    { field: 'va_sqft_bua_common_ex_ev', label: 'VA/Sqft BUA – Common excl. EV', unit: 'VA/sqft', compute: () => safeDiv(commonKva * 1000, bua) },
    { field: 'va_sqft_bua_ev', label: 'VA/Sqft BUA – EV Only', unit: 'VA/sqft', compute: () => null }, // manual input
    { field: 'va_sqft_bua_total', label: 'VA/Sqft BUA – Total', unit: 'VA/sqft', compute: () => safeDiv(totalVa, bua) },
    { field: 'transformer_sizing_after_loading', label: 'Transformer Sizing After Loading', unit: 'kVA', compute: () => transformerCalc > 0 && transformerLoading > 0 ? transformerCalc * (transformerLoading / 100) : null },
    { field: 'va_sqft_transformer', label: 'VA/Sqft (Transformer)', unit: 'VA/sqft', compute: () => {
      const cap = Number(inputs.transformer_capacity_diversity) || 0;
      return safeDiv(cap * 1000, bua);
    }},
    { field: 'dg_load_va_saleable', label: 'DG Load VA/sqft (Saleable)', unit: 'VA/sqft', compute: () => safeDiv(dgCalc * 1000, saleable) },
    { field: 'dg_load_va_bua', label: 'DG Load VA/sqft (BUA)', unit: 'VA/sqft', compute: () => safeDiv(dgCalc * 1000, bua) },
    { field: 'va_sqft_dg_capacity', label: 'VA/Sqft (DG Capacity)', unit: 'VA/sqft', compute: () => {
      const selected = Number(inputs.dg_capacity_selected) || 0;
      return safeDiv(selected * 1000, bua);
    }},
    { field: 'dg_set_kva_after_loading', label: 'DG Set kVA After Loading', unit: 'kVA', compute: () => dgCalc > 0 && dgLoading > 0 ? dgCalc * (dgLoading / 100) : null },
  ];

  return fields;
}

// ============================================================================
// ENGINEERING SERVICE GROUPS (restructured)
// ============================================================================

export const ENGINEERING_SERVICE_GROUPS: readonly EngineeringServiceGroup[] = [
  // 1. Area & Building Parameters
  {
    key: 'area-building',
    title: 'Area & Building Parameters',
    fields: [
      'bua_substructure', 'bua_superstructure', 'building_heights',
      'floor_to_floor_height', 'office_false_ceiling', 'corridor_false_ceiling',
      'occupancy_hvac_bua', 'occupancy_phe_bua',
      'chiller_plant_room_location', 'lesson_learned',
    ],
  },
  // 2. HVAC
  {
    key: 'hvac',
    title: 'HVAC',
    fields: [
      'occupancy_density_office', 'occupancy_density_fb', 'occupancy_lobby',
      'total_tr', 'total_airflow_cfm', 'hvac_strategy',
      'design_temperature_office', 'iaq_fresh_air',
      'diversity_considered',
      'type_of_chiller', 'chiller_configuration', 'chiller_parameters', 'refrigerant_used',
      'critical_room_hvac', 'ahu_scope', 'cfm_sqft', 'ahu_filtration_strategy',
      'hvac_filtration_strategy',
      'primary_pump', 'secondary_pump', 'condenser_pump',
      'cooling_towers_config', 'cooling_tower_height',
      'toilet_exhaust', 'pantry_exhaust', 'kitchen_exhaust', 'owc_exhaust',
      'basement_ventilation', 'staircase_pressurization', 'lift_well_pressurization',
      'lift_lobby_pressurization', 'ventilation_electrical_room',
    ],
    subGroups: [
      {
        key: 'hvac-tenant',
        title: 'Tenant Space',
        fields: [
          'lighting_load_w', 'equipment_thermal_load',
          'smoke_extraction_tenants', 'server_load', 'mode_server_cooling',
        ],
      },
      {
        key: 'hvac-cost',
        title: 'Cost',
        fields: [
          'hvac_package_cost_lumpsum', 'hvac_cost',
        ],
      },
    ],
  },
  // 3. Electrical & DG (with BMS and CCTV nested)
  {
    key: 'electrical-dg',
    title: 'Electrical & DG',
    fields: [
      'power_supply_sources',
      'tenant_power_kva', 'tenant_power_va_sqft', 'tenant_power_incl_ahu_va',
      'common_area_power_kva', 'common_area_power_va',
      'transformer_capacity_kva', 'transformer_redundancy',
      'transformer_sizing_calc', 'transformer_loading_pct', 'transformer_capacity_diversity',
      'dg_capacity_kva', 'dg_loading_factor',
      'dg_redundancy', 'dg_capacity_calc', 'dg_loading_pct', 'dg_capacity_selected',
      'hsd_capacity', 'hsd_backup',
      'bus_riser_sizing', 'tenant_isolator_sizing', 'bus_riser_n1',
      'earthing_lv', 'earthing_elv', 'lps',
      'electrical_risers', 'it_risers', 'ups_elevator',
      'solar_panel_capacity', 'solar_panel_pct',
      'car_park_charging', 'car_charging_pct',
      'baseline_epi', 'epi_superstructure', 'epi_bua',
    ],
    subGroups: [
      {
        key: 'electrical-cost',
        title: 'Cost',
        fields: [
          'electrical_package_cost_lumpsum', 'dg_package_cost_lumpsum',
          'electrical_cost', 'dg_cost',
        ],
      },
      {
        key: 'bms',
        title: 'BMS',
        fields: [
          'bms_cost',
        ],
      },
      {
        key: 'cctv-security',
        title: 'CCTV / Security',
        fields: [
          'cctv_type', 'security_access_control',
          'cctv_cost',
        ],
      },
    ],
  },
  // 4. Plumbing (before Fire Fighting)
  {
    key: 'plumbing-phe',
    title: 'Plumbing / PHE',
    fields: [
      'water_supply_drainage', 'hydropneumatic_or_gravity',
      'ugt_storage_days', 'flood_mitigation', 'rain_water_harvesting',
      'tenant_exec_washroom',
      'stp_kld', 'stp_type',
      'domestic_water_ugt', 'domestic_water_oht',
      'flushing_water_ugt', 'flushing_water_oht',
      'owc_capacity', 'owc_cost_rs_sqft',
      'phe_package_cost_lumpsum', 'stp_cost', 'phe_cost',
    ],
  },
  // 5. Fire Fighting (with FAPA nested)
  {
    key: 'fire-fighting',
    title: 'Fire Fighting',
    fields: [
      'ff_pumps_system', 'express_risers', 'intermediate_tank',
      'drencher_podium', 'drencher_typical',
    ],
    subGroups: [
      {
        key: 'fire-fighting-cost',
        title: 'Cost',
        fields: [
          'ff_package_cost_lumpsum', 'fire_fighting_cost',
        ],
      },
      {
        key: 'fapa',
        title: 'FAPA',
        fields: [
          'fapa_technology', 'fapa_addressable', 'fapa_cables',
          'fapa_cost',
        ],
      },
    ],
  },
  // 6. Glass Façade
  {
    key: 'glass-facade',
    title: 'Glass Façade',
    fields: [
      'glazing_u_value', 'vlt', 'glazing_shgc',
      'wall_u_value', 'roof_u_value',
      'spandrel_u_value', 'spandrel_height',
      'punched_windows', 'wwr', 'facade_power_controller',
    ],
  },
  // 7. Sustainability
  {
    key: 'sustainability',
    title: 'Sustainability',
    fields: [
      'sustainability_certification',
    ],
  },
  // Energy section REMOVED per Task 8
];

export const TOTAL_COST_FIELDS: readonly ProjectInputField[] = ['total_mep_cost'];

// ============================================================================
// HELPERS
// ============================================================================

export function isExtendedField(field: ProjectInputField): field is ExtendedFieldKey {
  return field in EXTENDED_FIELD_META;
}

export function formatProjectInputValue(field: ProjectInputField, value: unknown): string {
  if (value == null || value === '') return '—';
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
