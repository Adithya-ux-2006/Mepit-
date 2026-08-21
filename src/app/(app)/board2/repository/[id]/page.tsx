'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProjectDetailBundle, getProjects, getProjectInputs, getKpiFormulas, upsertProjectInputs, calculateAndStoreKpiOutputs, deleteProjectKpiOutputs, previewKpiOutputs } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useReviewActions } from '@/lib/use-review-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, CopyPlus, Pencil, Save, X } from 'lucide-react';
import type { Project, ProjectInputs, ProjectKpiOutput, KpiFormula, ValidationRule } from '@/types';
import {
  ENGINEERING_SERVICE_GROUPS,
  PROJECT_INPUT_FIELD_META,
  TOTAL_COST_FIELDS,
  formatProjectInputValue,
  isExtendedField,
  flattenExtendedFields,
  collectExtendedFields,
  type ProjectInputField,
  type EngineeringServiceGroup,
} from '@/lib/project-input-config';
import { evaluateValidationRules, type ValidationError } from '@/lib/validation-engine';
import { getProjectStageLabel, PROJECT_STAGES } from '@/lib/project-stages';

interface OutputWithKpi extends ProjectKpiOutput {
  kpi_formula?: KpiFormula;
}

const editableInputKeys = new Set<ProjectInputField>([
  // Existing flat columns
  'plant_room_area', 'leasable_plant_room_area', 'shaft_area',
  'office_area', 'fb_area', 'gross_area',
  'occupancy_density_office', 'occupancy_density_fb',
  'total_tr', 'total_airflow_cfm', 'hvac_strategy',
  'transformer_capacity_kva', 'tenant_power_kva', 'common_area_power_kva',
  'lighting_load_w', 'dg_capacity_kva', 'dg_loading_factor',
  'annual_energy_kwh', 'hvac_cost', 'electrical_cost', 'dg_cost',
  'fire_fighting_cost', 'stp_cost', 'phe_cost', 'bms_cost',
  'fapa_cost', 'cctv_cost', 'total_mep_cost', 'operating_hours',
  // Extended fields (editable)
  'bua_substructure', 'bua_superstructure', 'building_heights',
  'floor_to_floor_height', 'office_false_ceiling', 'corridor_false_ceiling',
  'occupancy_hvac_bua', 'occupancy_phe_bua',
  'chiller_plant_room_location', 'central_ac_plant_room_area', 'central_ac_plant_location',
  'standard_followed', 'lesson_learned',
  'occupancy_lobby', 'design_temperature_office', 'iaq_fresh_air',
  'retail_area', 'additional_spaces',
  'occupancy_density_retail',
  'occupancy_thermal_setpoint_office', 'occupancy_thermal_setpoint_retail',
  'occupancy_thermal_setpoint_fb', 'occupancy_thermal_setpoint_lobby',
  'lighting_gain_office', 'lighting_gain_retail', 'lighting_gain_fb',
  'equipment_gain_office', 'equipment_gain_retail', 'equipment_gain_fb',
  'outdoor_db_temp', 'outdoor_db_temp_source', 'outdoor_wb_temp', 'outdoor_wb_temp_source',
  'total_ac_tonnage', 'diversity', 'type_of_chiller_select',
  'chiller_tonnage_water', 'chiller_units_water',
  'chiller_tonnage_air', 'chiller_units_air',
  'chw_pumping_type', 'chw_primary_flow_gpm', 'chw_primary_power_kw',
  'chw_secondary_flow_gpm', 'chw_secondary_power_kw',
  'condenser_pumping_type', 'condenser_flow_gpm', 'condenser_power_kw',
  'ct_condenser_water_in', 'ct_condenser_water_out', 'ct_wet_bulb',
  'ct_fan_type', 'ct_fan_motor_rating_kw', 'cpo', 'cpm',
  'total_dehumidified_airflow', 'chw_supply_temp', 'chw_return_temp',
  'ahu_fan_type', 'ahu_filtration', 'ahu_fan_kw', 'ahu_scope_select',
  'total_fresh_airflow', 'tfahu_chw_supply_temp', 'tfahu_chw_return_temp',
  'tfahu_fan_type', 'tfahu_filtration', 'tfahu_fan_kw',
  'fresh_air_precooling', 'passive_desiccant_wheel', 'pct_extra_fresh_air', 'tfahu_scope',
  'server_cooling_source', 'server_cooling_mode', 'server_cooling_scope',
  'toilet_exhaust_acph', 'kitchen_exhaust_acph', 'owc_exhaust_acph', 'stp_exhaust_acph',
  'smoke_extraction_tenant', 'ventilation_electrical_room_typ',
  'diversity_considered', 'type_of_chiller', 'chiller_configuration',
  'chiller_parameters', 'refrigerant_used', 'critical_room_hvac',
  'ahu_scope', 'cfm_sqft', 'ahu_filtration_strategy',
  'hvac_filtration_strategy', 'primary_pump', 'secondary_pump', 'condenser_pump',
  'cooling_towers_config', 'cooling_tower_height',
  'toilet_exhaust', 'pantry_exhaust', 'kitchen_exhaust', 'owc_exhaust',
  'basement_ventilation', 'staircase_pressurization', 'lift_well_pressurization',
  'lift_lobby_pressurization', 'ventilation_electrical_room',
  'equipment_thermal_load', 'smoke_extraction_tenants', 'server_load', 'mode_server_cooling',
  'hvac_package_cost_lumpsum',
  'power_supply_sources', 'tenant_power_va_sqft', 'tenant_power_incl_ahu_va',
  'common_area_power_va',
  'baseline_epi', 'epi_superstructure', 'epi_bua',
  'transformer_redundancy', 'transformer_sizing_calc', 'transformer_loading_pct',
  'transformer_capacity_diversity',
  'dg_redundancy', 'dg_capacity_calc', 'dg_loading_pct', 'dg_capacity_selected',
  'hsd_capacity', 'hsd_backup',
  'bus_riser_sizing', 'tenant_isolator_sizing', 'bus_riser_n1',
  'earthing_lv', 'earthing_elv', 'lps',
  'electrical_risers', 'it_risers', 'ups_elevator',
  'solar_panel_capacity', 'solar_panel_pct',
  'car_park_charging', 'car_charging_pct',
  'electrical_package_cost_lumpsum', 'dg_package_cost_lumpsum',
  'water_supply_drainage', 'hydropneumatic_or_gravity',
  'ugt_storage_days', 'flood_mitigation', 'rain_water_harvesting',
  'tenant_exec_washroom', 'stp_kld', 'stp_type',
  'domestic_water_ugt', 'domestic_water_oht',
  'flushing_water_ugt', 'flushing_water_oht',
  'owc_capacity', 'owc_cost_rs_sqft', 'phe_package_cost_lumpsum',
  'water_distribution_type', 'occupancy_basis_water', 'total_occupants_water',
  'ugt_raw_water_kl', 'ugt_treated_water_kl', 'ugt_domestic_water_kl',
  'ugt_flushing_water_kl', 'ugt_cooling_tower_makeup_kl', 'ugt_irrigation_kl', 'ugt_condensate_kl',
  'oht_domestic_water_kl', 'oht_flushing_water_kl', 'oht_cooling_tower_makeup_kl',
  'stp_location', 'water_meters', 'bms_water_meters',
  'drainage_system', 'kitchen_waste_stack',
  'rainwater_tank_capacity_m3', 'rainwater_tank_location', 'recharge_capacity_m3',
  'centralised_garbage_room', 'garbage_room_location',
  'owc_capacity_kg', 'owc_location',
  'ff_pumps_system', 'express_risers', 'intermediate_tank',
  'drencher_podium', 'drencher_typical', 'ff_package_cost_lumpsum',
  'ff_underground_tank_kl', 'ff_intermediate_tank_kl', 'ff_overhead_tank_kl',
  'ff_drencher', 'ff_express_riser', 'ff_dry_riser', 'ff_wet_riser',
  'ff_sprinkler_riser', 'ff_ev_protection', 'ff_cost',
  'fapa_system', 'fapa_addressable_type', 'fapa_cables_type', 'fapa_cost_val',
  'fapa_technology', 'fapa_addressable', 'fapa_cables', 'fapa_package_cost_lumpsum',
  'cctv_type', 'security_access_control', 'cctv_package_cost_lumpsum',
  'glazing_u_value', 'vlt', 'glazing_shgc',
  'wall_u_value', 'roof_u_value', 'spandrel_u_value', 'spandrel_height',
  'punched_windows', 'wwr', 'facade_power_controller',
  'glazing_height', 'glazing_types',
  'sustainability_certification',
  'certification_types', 'custom_certifications',
  ...ENGINEERING_SERVICE_GROUPS.flatMap((group) => [
    ...group.fields,
    ...(group.subGroups?.flatMap((subGroup) => subGroup.fields) ?? []),
  ]),
  ...TOTAL_COST_FIELDS,
]);

const projectFieldLabels: Record<string, string> = {
  project_name: 'Project Name',
  typology: 'Typology',
  location_city: 'City',
  location_state: 'State',
  project_year: 'Project Year',
  built_up_area: 'Total Built Up Area',
  carpet_area: 'Carpet Area',
  saleable_area: 'Saleable Area',
  leasable_area: 'Leasable Area',
};

const PROJECT_STAGE_FIELDS = [
  'project_name',
  'typology',
  'location_city',
  'location_state',
  'project_year',
  'built_up_area',
  'carpet_area',
  'saleable_area',
  'leasable_area',
] as const;

interface StageSnapshot {
  project: Project;
  inputs: ProjectInputs | null;
  flatInputs: Record<string, unknown>;
}

function buildFlatInputs(inputs: ProjectInputs | null): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (!inputs) return flat;
  for (const [key, value] of Object.entries(inputs)) {
    if (key === 'id' || key === 'project_id' || key === 'extended_fields') continue;
    flat[key] = value;
  }
  flattenExtendedFields(inputs.extended_fields, flat);
  return flat;
}

function getStageOrder(project: Project): number {
  const index = PROJECT_STAGES.findIndex((stage) => stage.value === project.project_stage);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function normalizeComparableValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : '';
  return String(value).trim().toLowerCase();
}

function stageValueChanged(current: unknown, previous: unknown): boolean {
  return normalizeComparableValue(current) !== normalizeComparableValue(previous);
}

function getFieldLabel(field: string): string {
  if (projectFieldLabels[field]) return projectFieldLabels[field];
  const meta = PROJECT_INPUT_FIELD_META[field as ProjectInputField];
  if (meta) return meta.label;
  return field.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ValidationRow {
  field: string;
  label: string;
  passed: boolean;
  messages: string[];
}

function groupValidationResults(evaluatedErrors: ValidationError[]): ValidationRow[] {
  const fieldOrder = Array.from(editableInputKeys);

  const errorByField = new Map<string, string[]>();
  for (const err of evaluatedErrors) {
    const existing = errorByField.get(err.field) ?? [];
    if (!existing.includes(err.error_message)) existing.push(err.error_message);
    errorByField.set(err.field, existing);
  }

  const rows: ValidationRow[] = [];
  const seen = new Set<string>();

  for (const field of fieldOrder) {
    seen.add(field);
    const msgs = errorByField.get(field);
    if (msgs) {
      rows.push({ field, label: getFieldLabel(field), passed: false, messages: msgs });
    } else {
      rows.push({ field, label: getFieldLabel(field), passed: true, messages: [] });
    }
  }

  for (const [field, msgs] of errorByField) {
    if (!seen.has(field)) {
      seen.add(field);
      rows.push({ field, label: getFieldLabel(field), passed: false, messages: msgs });
    }
  }

  return rows;
}

const DIRECT_COST_KPIS = new Set([
  'HVAC_RS_SQFT', 'ELECTRICAL_RS_SQFT', 'DG_RS_SQFT', 'FF_RS_SQFT',
  'STP_RS_SQFT', 'PHE_RS_SQFT', 'BMS_RS_SQFT', 'FAPA_RS_SQFT',
  'CCTV_RS_SQFT', 'TOTAL_MEP_RS_SQFT',
]);

function getReasonLabel(code: string | undefined, flag: string | null | undefined): string | null {
  if (!flag) return null;
  if (flag === 'insufficient_inputs' && code && DIRECT_COST_KPIS.has(code)) return 'Not provided';
  return 'Insufficient inputs';
}

function getBenchmark(
  kpiCode: string,
  val: number | null | undefined,
  formula?: KpiFormula | null,
): { status: 'good' | 'warn'; note: string } | null {
  if (val == null || val === 0) return null;

  // Prefer DB-stored benchmarks if available
  if (formula?.min_benchmark != null && formula?.max_benchmark != null) {
    const status: 'good' | 'warn' = val >= formula.min_benchmark && val <= formula.max_benchmark ? 'good' : 'warn';
    return { status, note: formula.benchmark_note ?? `Target: ${formula.min_benchmark}–${formula.max_benchmark}` };
  }

  switch (kpiCode) {
    case 'PLANT_ROOM_PCT':
      return val >= 3 && val <= 5
        ? { status: 'good', note: 'Within Grüne Basis target (~4%)' }
        : { status: 'warn', note: `Target: ~4% of BUA (currently ${val.toFixed(1)}%)` };
    case 'LEASABLE_PLANT_ROOM_PCT':
      return val >= 1 && val <= 3
        ? { status: 'good', note: 'Within Grüne Basis target (~2%)' }
        : { status: 'warn', note: `Target: ~2% of BUA (currently ${val.toFixed(1)}%)` };
    case 'SHAFT_AREA_PCT':
      return val >= 0.5 && val <= 3
        ? { status: 'good', note: 'Within Grüne Basis target (1-2%)' }
        : { status: 'warn', note: `Target: 1-2% of BUA (currently ${val.toFixed(1)}%)` };
    case 'COOLING_LOAD_DENSITY':
      return val >= 300 && val <= 500
        ? { status: 'good', note: 'Within benchmark (300-500 sq. ft/TR)' }
        : { status: 'warn', note: `Benchmark: 350-400+ sq. ft/TR (currently ${val.toFixed(0)})` };
    case 'CFM_SQFT':
      return val >= 1.7 && val <= 2.5
        ? { status: 'good', note: 'Within benchmark (1.7-2.5 CFM/sq. ft)' }
        : { status: 'warn', note: `Benchmark: 1.7-2.0 CFM/sq. ft (CHW) or 2+ (VRF)` };
    case 'TRANSFORMER_DENSITY':
      return val >= 4 && val <= 7
        ? { status: 'good', note: 'Within benchmark (~5.5 VA/sq. ft)' }
        : { status: 'warn', note: `Benchmark: ~5.5 VA/sq. ft` };
    case 'HVAC_RS_SQFT':
      return val >= 200 && val <= 400
        ? { status: 'good', note: 'Within benchmark (Rs 250-300/sq. ft BUA)' }
        : { status: 'warn', note: `Benchmark: Rs 250-300/sq. ft BUA (currently Rs ${val.toFixed(0)})` };
    case 'ELECTRICAL_RS_SQFT':
      return val >= 200 && val <= 400
        ? { status: 'good', note: 'Within benchmark (Rs 250-300/sq. ft BUA)' }
        : { status: 'warn', note: `Benchmark: Rs 250-300/sq. ft BUA (currently Rs ${val.toFixed(0)})` };
    case 'TOTAL_MEP_RS_SQFT':
      return val >= 500 && val <= 900
        ? { status: 'good', note: 'Within aggregate MEP benchmark' }
        : { status: 'warn', note: 'Check individual package costs vs BUA' };
    default:
      return null;
  }
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [inputs, setInputs] = useState<ProjectInputs | null>(null);
  const [outputs, setOutputs] = useState<OutputWithKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewOutputs, setPreviewOutputs] = useState<OutputWithKpi[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [storedValidationResults, setStoredValidationResults] = useState<ValidationRow[]>([]);
  const [stageSnapshots, setStageSnapshots] = useState<StageSnapshot[]>([]);

  // When editing, recompute validation live from editForm; otherwise use stored results
  const validationResults = useMemo(() => {
    if (!editing || !project || validationRules.length === 0) return storedValidationResults;
    const formData: Record<string, unknown> = {
      project_name: project.project_name,
      typology: project.typology,
      built_up_area: project.built_up_area,
      carpet_area: project.carpet_area,
      saleable_area: project.saleable_area,
      leasable_area: project.leasable_area,
      ...editForm,
    };
    const evaluatedErrors = evaluateValidationRules(formData, validationRules);
    return groupValidationResults(evaluatedErrors);
  }, [editing, editForm, project, validationRules, storedValidationResults]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { user } = useAuth();

  const flatInputs = useMemo(() => buildFlatInputs(inputs), [inputs]);

  const loadData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getProjectDetailBundle(id)
      .then(async ({ project: p, inputs: i, outputs: o, validationRules: rules }) => {
        setProject(p);
        setInputs(i);
        setOutputs(o);
        setValidationRules(rules);

        // Compute validation results from inputs
        if (i && p) {
          const formData: Record<string, unknown> = {
            project_name: p.project_name,
            typology: p.typology,
            built_up_area: p.built_up_area,
            carpet_area: p.carpet_area,
            saleable_area: p.saleable_area,
            leasable_area: p.leasable_area,
            ...Object.fromEntries(
              Object.entries(i).filter(([k]) => !['id', 'project_id', 'extended_fields'].includes(k))
            ),
            ...(i.extended_fields as Record<string, unknown> ?? {}),
          };
          const evaluatedErrors = evaluateValidationRules(formData, rules);
          setStoredValidationResults(groupValidationResults(evaluatedErrors));
        }

        // Preview KPIs for submitted/under_review projects (not yet approved)
        if (p && (p.status === 'submitted' || p.status === 'under_review') && i) {
          previewKpiOutputs(id).then((preview) => {
            setPreviewOutputs(preview);
          }).catch(() => {});
        }

        if (p) {
          const rootProjectId = p.source_project_id ?? p.id;
          getProjects()
            .then(async (allProjects) => {
              const siblingProjects = allProjects
                .filter((candidate) => (candidate.source_project_id ?? candidate.id) === rootProjectId)
                .sort((a, b) => getStageOrder(a) - getStageOrder(b) || a.created_at.localeCompare(b.created_at));
              const snapshots = await Promise.all(
                siblingProjects.map(async (candidate) => {
                  const stageInputs = candidate.id === id ? i : await getProjectInputs(candidate.id);
                  return {
                    project: candidate,
                    inputs: stageInputs,
                    flatInputs: buildFlatInputs(stageInputs),
                  };
                }),
              );
              setStageSnapshots(snapshots);
            })
            .catch(() => {
              setStageSnapshots([{ project: p, inputs: i, flatInputs: buildFlatInputs(i) }]);
            });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const actions = useReviewActions(() => {
    setReviewError(null);
    loadData();
  });

  useEffect(() => { setTimeout(loadData, 0); }, [loadData]);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const categoryOrder = ['Space Planning', 'HVAC', 'Electrical', 'DG', 'Sustainability', 'Cost'] as const;
  const kpisToShow = outputs.length > 0 ? outputs : previewOutputs;
  const outputsByCategory: Record<string, OutputWithKpi[]> = {};
  for (const o of kpisToShow) {
    const cat = o.kpi_formula?.category ?? 'Other';
    if (!outputsByCategory[cat]) outputsByCategory[cat] = [];
    outputsByCategory[cat].push(o);
  }

  const groupedInputFields: (EngineeringServiceGroup & { fields: readonly ProjectInputField[] })[] = [
    ...ENGINEERING_SERVICE_GROUPS.map((g) => ({
      ...g,
      fields: [
        ...g.fields,
        ...(g.subGroups?.flatMap((sg) => sg.fields) ?? []),
      ] as readonly ProjectInputField[],
    })),
    { key: 'total', title: 'Total', fields: TOTAL_COST_FIELDS },
  ];
  const stageComparisonGroups = [
    { key: 'project', title: 'Project Details', fields: PROJECT_STAGE_FIELDS as readonly string[] },
    ...groupedInputFields.map((group) => ({
      key: group.key,
      title: group.title,
      fields: group.fields as readonly string[],
    })),
  ];
  const getSnapshotValue = (snapshot: StageSnapshot, field: string): unknown => {
    if (field in projectFieldLabels) {
      return snapshot.project[field as keyof Project];
    }
    return snapshot.flatInputs[field];
  };
  const formatStageComparisonValue = (field: string, value: unknown): string => {
    if (value == null || value === '') return '—';
    if (field === 'project_year') return String(value);
    if (['built_up_area', 'carpet_area', 'saleable_area', 'leasable_area'].includes(field) && typeof value === 'number') {
      return `${value.toLocaleString()} sqft`;
    }
    const meta = PROJECT_INPUT_FIELD_META[field as ProjectInputField];
    if (meta) return formatProjectInputValue(field as ProjectInputField, value);
    if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(value);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/board2/repository">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.project_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {getProjectStageLabel(project.project_stage)} &middot; {project.typology} &middot; {project.location_city}, {project.location_state} &middot; {project.project_year}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/board1/create-project?source=${project.id}`}>
            <Button size="sm" variant="outline">
              <CopyPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Stage
            </Button>
          </Link>
          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
            project.status === 'approved' ? 'bg-green-50 text-green-700' :
            project.status === 'submitted' || project.status === 'under_review' ? 'bg-yellow-50 text-yellow-700' :
            project.status === 'rejected' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {project.status}
          </span>
          {(project.status === 'draft' || project.status === 'rejected') && (
            <Link href={`/board1/create-project?id=${project.id}`} className="text-xs text-primary hover:underline font-medium">
              Edit & Resubmit
            </Link>
          )}
        </div>
      </div>

      {project.status === 'rejected' && project.rejection_reason && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Project Rejected</p>
          <p className="text-xs text-red-600 mt-1">{project.rejection_reason}</p>
        </div>
      )}

      {project.status === 'draft' && project.rejection_reason && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-700">Returned for changes</p>
          <p className="text-xs text-amber-600 mt-1">{project.rejection_reason}</p>
        </div>
      )}

      {/* Review actions for admin */}
      {(project.status === 'submitted' || project.status === 'under_review') && user?.role === 'admin' && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Review Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">{reviewError}</p>
            )}
            {actions.error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">{actions.error}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {project.status === 'submitted' ? (
                <Button size="sm" onClick={async () => { const ok = await actions.startReview(project); if (ok) loadData(); }} disabled={actions.processing === project.id}>
                  {actions.processing === project.id ? 'Starting...' : 'Start Review'}
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={async () => { const ok = await actions.approve(project); if (ok) loadData(); }} disabled={actions.processing === project.id}>
                    {actions.processing === project.id ? 'Approving...' : 'Approve'}
                  </Button>
                  {actions.rejectingId === project.id ? (
                    <RejectInline
                      reason={actions.rejectionReason}
                      onReasonChange={actions.setRejectionReason}
                      onConfirm={async () => { const ok = await actions.reject(project); if (ok) loadData(); }}
                      onCancel={() => { actions.setRejectingId(null); actions.setRejectionReason(''); }}
                      processing={actions.processing === project.id}
                    />
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { actions.setRejectingId(project.id); actions.setRejectionReason(''); }} disabled={actions.processing === project.id}>
                      Reject
                    </Button>
                  )}
                  {actions.returningId === project.id ? (
                    <ReturnInline
                      reason={actions.returnReason}
                      onReasonChange={actions.setReturnReason}
                      onConfirm={async () => { const ok = await actions.returnToDraft(project); if (ok) loadData(); }}
                      onCancel={() => { actions.setReturningId(null); actions.setReturnReason(''); }}
                      processing={actions.processing === project.id}
                    />
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => actions.setReturningId(project.id)} disabled={actions.processing === project.id}>
                      Send Back to Draft
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project Stage</span>
              <p className="font-medium">{getProjectStageLabel(project.project_stage)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">BUA</span>
              <p className="font-medium">{project.built_up_area?.toLocaleString()} sq. ft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Carpet Area</span>
              <p className="font-medium">{project.carpet_area?.toLocaleString()} sq. ft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saleable Area</span>
              <p className="font-medium">{project.saleable_area?.toLocaleString()} sq. ft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Version</span>
              <p className="font-medium">{project.version}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {stageSnapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-56 bg-background">Field</TableHead>
                    {stageSnapshots.map((snapshot) => (
                      <TableHead key={snapshot.project.id} className="min-w-56">
                        <span className="block font-medium">{getProjectStageLabel(snapshot.project.project_stage)}</span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {snapshot.project.status} · v{snapshot.project.version}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageComparisonGroups.map((group) => (
                    <Fragment key={group.key}>
                      <TableRow key={`${group.key}-heading`}>
                        <TableCell
                          colSpan={stageSnapshots.length + 1}
                          className="sticky left-0 bg-muted/70 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {group.title}
                        </TableCell>
                      </TableRow>
                      {group.fields.map((field) => (
                        <TableRow key={`${group.key}-${field}`}>
                          <TableCell className="sticky left-0 z-10 bg-background text-xs font-medium text-muted-foreground">
                            {getFieldLabel(field)}
                          </TableCell>
                          {stageSnapshots.map((snapshot, index) => {
                            const value = getSnapshotValue(snapshot, field);
                            const previousValue = index > 0 ? getSnapshotValue(stageSnapshots[index - 1], field) : value;
                            const changed = index > 0 && stageValueChanged(value, previousValue);
                            return (
                              <TableCell
                                key={`${snapshot.project.id}-${field}`}
                                className={`text-sm ${changed ? 'border-l-2 border-amber-500 bg-amber-50 font-medium text-amber-950' : ''}`}
                              >
                                {formatStageComparisonValue(field, value)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Highlighted cells changed from the stage immediately to their left.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResults.length > 0 && validationResults.some((r) => !r.passed) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Validation Results
              <span className="text-xs text-muted-foreground font-normal">
                (from Grüne Basis validation rules)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {validationResults.filter((r) => !r.passed).map((r) => (
                <div key={r.field} className="flex items-start gap-2 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5 bg-red-500" />
                  <span className="font-medium text-muted-foreground w-44 shrink-0">{r.label}</span>
                  <ul className="space-y-0.5">
                    {r.messages.map((msg) => (
                      <li key={msg} className="text-red-600">{msg}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Outputs */}
      {kpisToShow.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            KPI Outputs
            {(project.status === 'submitted' || project.status === 'under_review') && (
              <span className="text-xs text-muted-foreground font-normal ml-2">(preview — not yet persisted)</span>
            )}
          </h2>
          {categoryOrder.map((cat) => {
            const catOutputs = outputsByCategory[cat];
            if (!catOutputs?.length) return null;
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catOutputs.map((o) => {
                      const formula = o.kpi_formula;
                      const val = o.calculated_value;
                      const benchmark = getBenchmark(formula?.kpi_code ?? '', val, formula);
                      return (
                        <div key={o.id ?? o.kpi_formula_id} className={`border rounded-lg p-3 ${benchmark?.status === 'warn' ? 'border-amber-300 bg-amber-50/50' : benchmark?.status === 'good' ? 'border-green-200 bg-green-50/30' : 'border-border'}`}>
                          <p className="text-xs text-muted-foreground truncate" title={formula?.kpi_name}>
                            {formula?.kpi_code}
                          </p>
                          <p className="text-lg font-semibold mt-0.5">
                            {val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">{formula?.unit}</p>
                          {benchmark && (
                            <p className={`text-[11px] mt-1 ${benchmark.status === 'warn' ? 'text-amber-600' : 'text-green-600'}`}>
                              {benchmark.note}
                            </p>
                          )}
                          {(() => {
                            const reasonLabel = getReasonLabel(formula?.kpi_code, o.reason_flag);
                            return reasonLabel ? (
                              <p className="text-xs text-amber-600 mt-1">{reasonLabel}</p>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Engineering Inputs */}
      {inputs && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Engineering Inputs</CardTitle>
            {user?.role === 'admin' && project.status === 'approved' && (
              editing ? (
                <div className="flex gap-2">
                  {saveError && (
                    <p className="text-xs text-destructive mt-1">{saveError}</p>
                  )}
                  <Button size="sm" onClick={async () => {
                    if (!user) return;
                    setSaving(true);
                    setSaveError('');
                    try {
                      // Collect extended fields for persistence
                      const extFields = collectExtendedFields(editForm);
                      // Separate flat column fields from extended fields
                      const flatFields: Record<string, unknown> = {};
                      for (const [k, v] of Object.entries(editForm)) {
                        if (!isExtendedField(k as ProjectInputField)) {
                          flatFields[k] = v;
                        }
                      }
                      await upsertProjectInputs(id, { ...flatFields, extended_fields: extFields });
                      await deleteProjectKpiOutputs(id);
                      const [formulas, updatedInputs] = await Promise.all([
                        getKpiFormulas(),
                        getProjectInputs(id),
                      ]);
                      if (updatedInputs && project) {
                        await calculateAndStoreKpiOutputs(id, updatedInputs, formulas, project);
                      }
                      setEditing(false);
                      loadData();
                    } catch (err) {
                      console.error(err);
                      setSaveError(err instanceof Error ? err.message : 'Save failed');
                    } finally {
                      setSaving(false);
                    }
                  }} disabled={saving}>
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? 'Saving...' : 'Save & Recalculate'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => {
                  const form: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(inputs)) {
                    if (k === 'extended_fields') {
                      // Flatten extended fields into the edit form
                      flattenExtendedFields(v as Record<string, unknown>, form);
                    } else if (editableInputKeys.has(k as ProjectInputField)) {
                      form[k] = typeof v === 'number' && v != null ? Number(v) : v;
                    }
                  }
                  for (const field of editableInputKeys) {
                    if (form[field] === undefined && flatInputs[field] !== undefined) {
                      form[field] = flatInputs[field];
                    }
                  }
                  setEditForm(form);
                  setEditing(true);}}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit Inputs
                </Button>
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {groupedInputFields.map((group) => {
                const visibleFields = group.fields.filter((field) => {
                  const value = editing ? editForm[field] : flatInputs[field];
                  return editing || (value != null && value !== '');
                });

                if (visibleFields.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.title}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleFields.map((field) => {
                        const value = editing ? editForm[field] : flatInputs[field];
                        const meta = PROJECT_INPUT_FIELD_META[field];
                        return editing ? (
                          <div key={field} className="space-y-1">
                            <label className="text-xs text-muted-foreground block">
                              {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
                            </label>
                            {meta.kind === 'repeatable' ? (
                              <span className="text-xs text-muted-foreground italic">
                                {Array.isArray(value) && value.length > 0
                                  ? `${value.length} entr${value.length === 1 ? 'y' : 'ies'} (edit in create form)`
                                  : 'No entries'}
                              </span>
                            ) : meta.kind === 'select' ? (
                              <select
                                value={value == null ? '' : String(value)}
                                onChange={(e) => {
                                  const nextValue = e.target.value;
                                  setEditForm((prev) => ({ ...prev, [field]: nextValue || null }));
                                }}
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                              >
                                <option value="">Select...</option>
                                {(meta.options ?? []).map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : meta.kind === 'text' ? (
                              <input
                                type="text"
                                value={value == null ? '' : String(value)}
                                onChange={(e) => {
                                  const nextValue = e.target.value;
                                  setEditForm((prev) => ({ ...prev, [field]: nextValue || null }));
                                }}
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                              />
                            ) : (
                              <input
                                type="number"
                                min={meta.min ?? 0}
                                step={meta.decimals != null ? `0.${'0'.repeat(Math.max(meta.decimals - 1, 0))}1` : 'any'}
                                value={value == null ? '' : String(value)}
                                onChange={(e) => {
                                  const nextValue = e.target.value;
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [field]: nextValue === '' ? null : Number(nextValue),
                                  }));
                                }}
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                              />
                            )}
                          </div>
                        ) : (
                          <div key={field}>
                            <span className="text-xs text-muted-foreground block">
                              {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
                            </span>
                            <span className="font-medium">{formatProjectInputValue(field, value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RejectInline({
  reason, onReasonChange, onConfirm, onCancel, processing,
}: {
  reason: string; onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; processing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Rejection reason..." className="h-8 text-sm w-64" autoFocus />
      <Button size="sm" variant="destructive" onClick={onConfirm} disabled={processing || !reason.trim()}>
        {processing ? 'Rejecting...' : 'Confirm Reject'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={processing}>Cancel</Button>
    </div>
  );
}

function ReturnInline({
  reason, onReasonChange, onConfirm, onCancel, processing,
}: {
  reason: string; onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; processing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Reason for returning..." className="h-8 text-sm w-64" autoFocus />
      <Button size="sm" variant="outline" onClick={onConfirm} disabled={processing}>
        {processing ? 'Sending...' : 'Confirm Send to Draft'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={processing}>Cancel</Button>
    </div>
  );
}
