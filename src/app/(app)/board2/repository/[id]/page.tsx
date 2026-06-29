'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProjectById, getProjectInputs, getProjectKpiOutputs, upsertProjectInputs, getKpiFormulas, calculateAndStoreKpiOutputs, createAuditLog, deleteProjectKpiOutputs } from '@/lib/services';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import type { Project, ProjectInputs, ProjectKpiOutput, KpiFormula } from '@/types';

interface OutputWithKpi extends ProjectKpiOutput {
  kpi_formula?: KpiFormula;
}

// Grüne Basis benchmarks for KPI compliance indicators
function getBenchmark(
  kpiCode: string,
  val: number | null | undefined,
): { status: 'good' | 'warn'; note: string } | null {
  if (val == null || val === 0) return null;
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
        : { status: 'warn', note: `Check individual package costs vs BUA` };
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
  const { user } = useAuth();

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getProjectById(id),
      getProjectInputs(id),
      getProjectKpiOutputs(id),
    ])
      .then(([p, i, o]) => {
        setProject(p);
        setInputs(i);
        setOutputs(o);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTimeout(fetchData, 0); }, [id]);

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
  const outputsByCategory: Record<string, OutputWithKpi[]> = {};
  for (const o of outputs) {
    const cat = o.kpi_formula?.category ?? 'Other';
    if (!outputsByCategory[cat]) outputsByCategory[cat] = [];
    outputsByCategory[cat].push(o);
  }

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
            {project.typology} &middot; {project.location_city}, {project.location_state} &middot; {project.project_year}
          </p>
        </div>
        <div className="ml-auto">
          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
            project.status === 'approved' ? 'bg-green-50 text-green-700' :
            project.status === 'submitted' || project.status === 'under_review' ? 'bg-yellow-50 text-yellow-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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

      {/* KPI Outputs */}
      {outputs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">KPI Outputs</h2>
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
                      const benchmark = getBenchmark(formula?.kpi_code ?? '', val);
                      return (
                        <div key={o.id} className={`border rounded-lg p-3 ${benchmark?.status === 'warn' ? 'border-amber-300 bg-amber-50/50' : benchmark?.status === 'good' ? 'border-green-200 bg-green-50/30' : 'border-border'}`}>
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
                          {o.reason_flag && (
                            <p className="text-xs text-amber-600 mt-1">{o.reason_flag}</p>
                          )}
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
                      await upsertProjectInputs(id, editForm);
                      // Delete old outputs, then recalculate
                      await deleteProjectKpiOutputs(id);
                      const [formulas, updatedInputs] = await Promise.all([
                        getKpiFormulas(),
                        getProjectInputs(id),
                      ]);
                      if (updatedInputs && project) {
                        await calculateAndStoreKpiOutputs(id, updatedInputs, formulas, project);
                      }
                      await createAuditLog({
                        entity_type: 'project',
                        entity_id: id,
                        action: 'inputs_updated',
                        performed_by: user.id,
                        metadata: { fields: Object.keys(editForm) },
                      });
                      setEditing(false);
                      fetchData();
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
                  const numericKeys = new Set([
                    'plant_room_area', 'leasable_plant_room_area', 'shaft_area',
                    'office_area', 'fb_area', 'gross_area',
                    'occupancy_density_office', 'occupancy_density_fb',
                    'total_tr', 'total_airflow_cfm',
                    'transformer_capacity_kva', 'tenant_power_kva', 'common_area_power_kva',
                    'lighting_load_w', 'dg_capacity_kva', 'dg_loading_factor',
                    'annual_energy_kwh', 'hvac_cost', 'electrical_cost', 'dg_cost',
                    'fire_fighting_cost', 'stp_cost', 'phe_cost', 'bms_cost',
                    'fapa_cost', 'cctv_cost', 'total_mep_cost', 'operating_hours',
                  ]);
                  const form: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(inputs)) {
                    if (!['id', 'project_id', 'extended_fields'].includes(k)) {
                      form[k] = numericKeys.has(k) && v != null ? Number(v) : v;
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              {editing ? (
                Object.entries(editForm)
                  .filter(([key]) => !['id', 'project_id', 'extended_fields'].includes(key))
                  .map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-muted-foreground block">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type={typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val !== '') ? 'number' : 'text'}
                        value={val == null ? '' : String(val)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditForm((prev) => ({
                            ...prev,
                            [key]: v === '' ? null : (typeof val === 'number' ? Number(v) : v),
                          }));
                        }}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      />
                    </div>
                  ))
              ) : (
                Object.entries(inputs)
                  .filter(([key]) => !['id', 'project_id', 'extended_fields'].includes(key))
                  .filter(([, val]) => val != null && val !== '')
                  .map(([key, val]) => (
                    <div key={key}>
                      <span className="text-xs text-muted-foreground block">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{String(val)}</span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
