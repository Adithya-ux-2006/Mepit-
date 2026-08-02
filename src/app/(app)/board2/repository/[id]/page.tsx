'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProjectDetailBundle, getProjectInputs, getKpiFormulas, upsertProjectInputs, calculateAndStoreKpiOutputs, deleteProjectKpiOutputs, previewKpiOutputs } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useReviewActions } from '@/lib/use-review-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getProjectStageLabel } from '@/lib/project-stages';

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
  'chiller_plant_room_location', 'lesson_learned',
  'occupancy_lobby', 'design_temperature_office', 'iaq_fresh_air',
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
  'ff_pumps_system', 'express_risers', 'intermediate_tank',
  'drencher_podium', 'drencher_typical', 'ff_package_cost_lumpsum',
  'fapa_technology', 'fapa_addressable', 'fapa_cables', 'fapa_package_cost_lumpsum',
  'cctv_type', 'security_access_control', 'cctv_package_cost_lumpsum',
  'glazing_u_value', 'vlt', 'glazing_shgc',
  'wall_u_value', 'roof_u_value', 'spandrel_u_value', 'spandrel_height',
  'punched_windows', 'wwr', 'facade_power_controller',
  'sustainability_certification',
]);

const projectFieldLabels: Record<string, string> = {
  project_name: 'Project Name',
  typology: 'Typology',
  location_city: 'City',
  location_state: 'State',
  project_year: 'Project Year',
  built_up_area: 'Built Up Area',
  carpet_area: 'Carpet Area',
  saleable_area: 'Saleable Area',
  leasable_area: 'Leasable Area',
};

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
        ? { status: 'good', note: 'Within benchmark (300-500 sqft/TR)' }
        : { status: 'warn', note: `Benchmark: 350-400+ sqft/TR (currently ${val.toFixed(0)})` };
    case 'CFM_SQFT':
      return val >= 1.7 && val <= 2.5
        ? { status: 'good', note: 'Within benchmark (1.7-2.5 CFM/sqft)' }
        : { status: 'warn', note: `Benchmark: 1.7-2.0 CFM/sqft (CHW) or 2+ (VRF)` };
    case 'TRANSFORMER_DENSITY':
      return val >= 4 && val <= 7
        ? { status: 'good', note: 'Within benchmark (~5.5 VA/sqft)' }
        : { status: 'warn', note: `Benchmark: ~5.5 VA/sqft` };
    case 'HVAC_RS_SQFT':
      return val >= 200 && val <= 400
        ? { status: 'good', note: 'Within benchmark (Rs 250-300/sqft BUA)' }
        : { status: 'warn', note: `Benchmark: Rs 250-300/sqft BUA (currently Rs ${val.toFixed(0)})` };
    case 'ELECTRICAL_RS_SQFT':
      return val >= 200 && val <= 400
        ? { status: 'good', note: 'Within benchmark (Rs 250-300/sqft BUA)' }
        : { status: 'warn', note: `Benchmark: Rs 250-300/sqft BUA (currently Rs ${val.toFixed(0)})` };
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

  const loadData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getProjectDetailBundle(id)
      .then(({ project: p, inputs: i, outputs: o, validationRules: rules }) => {
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
              <p className="font-medium">{project.built_up_area?.toLocaleString()} sqft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Carpet Area</span>
              <p className="font-medium">{project.carpet_area?.toLocaleString()} sqft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saleable Area</span>
              <p className="font-medium">{project.saleable_area?.toLocaleString()} sqft</p>
            </div>
            <div>
              <span className="text-muted-foreground">Version</span>
              <p className="font-medium">{project.version}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  const value = editing ? editForm[field] : (inputs as unknown as Record<string, unknown>)[field];
                  return editing || (value != null && value !== '');
                });

                if (visibleFields.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.title}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleFields.map((field) => {
                        const value = editing ? editForm[field] : (inputs as unknown as Record<string, unknown>)[field];
                        const meta = PROJECT_INPUT_FIELD_META[field];
                        return editing ? (
                          <div key={field} className="space-y-1">
                            <label className="text-xs text-muted-foreground block">
                              {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
                            </label>
                            {meta.kind === 'select' ? (
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
