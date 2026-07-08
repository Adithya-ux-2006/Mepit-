import type { ProjectInputs } from '@/types';

export type ProjectInputField = Exclude<keyof ProjectInputs, 'id' | 'project_id' | 'extended_fields'>;

export type ProjectInputFieldKind = 'number' | 'select';

export interface ProjectInputFieldMeta {
  label: string;
  unit?: string;
  kind?: ProjectInputFieldKind;
  options?: readonly string[];
  placeholder?: string;
  decimals?: number;
  min?: number;
}

export interface EngineeringServiceGroup {
  key: string;
  title: string;
  fields: readonly ProjectInputField[];
}

export const HVAC_STRATEGY_OPTIONS = [
  'Central Plant', 'VRF', 'Hybrid', 'Split AC', 'Other',
] as const;

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

export const PROJECT_INPUT_FIELD_META: Record<ProjectInputField, ProjectInputFieldMeta> = {
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

export const ENGINEERING_SERVICE_GROUPS: readonly EngineeringServiceGroup[] = [
  {
    key: 'area-schedule',
    title: 'Area Schedule',
    fields: ['plant_room_area', 'leasable_plant_room_area', 'shaft_area', 'office_area', 'fb_area', 'gross_area'],
  },
  {
    key: 'hvac',
    title: 'HVAC',
    fields: ['occupancy_density_office', 'occupancy_density_fb', 'total_tr', 'total_airflow_cfm', 'hvac_strategy', 'hvac_cost'],
  },
  {
    key: 'electrical-dg',
    title: 'Electrical & DG',
    fields: ['transformer_capacity_kva', 'tenant_power_kva', 'common_area_power_kva', 'lighting_load_w', 'dg_capacity_kva', 'dg_loading_factor', 'electrical_cost', 'dg_cost'],
  },
  {
    key: 'energy',
    title: 'Energy',
    fields: ['annual_energy_kwh', 'operating_hours'],
  },
  {
    key: 'fire-fighting',
    title: 'Fire Fighting',
    fields: ['fire_fighting_cost'],
  },
  {
    key: 'plumbing-phe',
    title: 'Plumbing / PHE',
    fields: ['stp_cost', 'phe_cost'],
  },
  {
    key: 'bms',
    title: 'BMS',
    fields: ['bms_cost'],
  },
  {
    key: 'fapa',
    title: 'FAPA',
    fields: ['fapa_cost'],
  },
  {
    key: 'cctv-security',
    title: 'CCTV / Security',
    fields: ['cctv_cost'],
  },
];

export const TOTAL_COST_FIELDS: readonly ProjectInputField[] = ['total_mep_cost'];

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
