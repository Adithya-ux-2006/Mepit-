'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createProject, upsertProjectInputs, updateProjectStatus, getKpiFormulas, calculateAndStoreKpiOutputs, createAuditLog, getProjectInputs, validateProjectInputs, type ValidationError } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface FormState {
  project_name: string;
  typology: string;
  location_city: string;
  location_state: string;
  project_year: number;
  built_up_area: number | null;
  carpet_area: number | null;
  saleable_area: number | null;
  leasable_area: number | null;
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
  hvac_strategy: string;
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

const defaultForm: FormState = {
  project_name: '',
  typology: '',
  location_city: '',
  location_state: '',
  project_year: new Date().getFullYear(),
  built_up_area: null,
  carpet_area: null,
  saleable_area: null,
  leasable_area: null,
  plant_room_area: null,
  leasable_plant_room_area: null,
  shaft_area: null,
  office_area: null,
  fb_area: null,
  gross_area: null,
  occupancy_density_office: null,
  occupancy_density_fb: null,
  total_tr: null,
  total_airflow_cfm: null,
  hvac_strategy: '',
  transformer_capacity_kva: null,
  tenant_power_kva: null,
  common_area_power_kva: null,
  lighting_load_w: null,
  dg_capacity_kva: null,
  dg_loading_factor: null,
  annual_energy_kwh: null,
  hvac_cost: null,
  electrical_cost: null,
  dg_cost: null,
  fire_fighting_cost: null,
  stp_cost: null,
  phe_cost: null,
  bms_cost: null,
  fapa_cost: null,
  cctv_cost: null,
  total_mep_cost: null,
  operating_hours: 3000,
};

const typologies = [
  'Office', 'Retail', 'Hospitality', 'Mixed Use',
  'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
];

const hvacStrategies = [
  'Central Plant', 'VRF', 'Hybrid', 'Split AC', 'Other',
];

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between py-3"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="text-base">{title}</CardTitle>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CardHeader>
      {open && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
}

function NumField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  min,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label} <span className="text-[10px]">({unit})</span>
      </Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        placeholder={placeholder}
        min={min}
        className="h-8 text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
      >
        <option value="">{placeholder ?? 'Select...'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function CreateProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [costWarning, setCostWarning] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const update = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const costFields: (keyof Pick<FormState, 'hvac_cost' | 'electrical_cost' | 'dg_cost' | 'fire_fighting_cost' | 'stp_cost' | 'phe_cost' | 'bms_cost' | 'fapa_cost' | 'cctv_cost' | 'total_mep_cost'>)[] = [
    'hvac_cost', 'electrical_cost', 'dg_cost', 'fire_fighting_cost',
    'stp_cost', 'phe_cost', 'bms_cost', 'fapa_cost', 'cctv_cost',
  ];

  const sumOfCosts = costFields.reduce((sum, f) => sum + ((form[f] as number | null) ?? 0), 0);

  const handleCostCheck = () => {
    if (form.total_mep_cost != null && sumOfCosts > 0 && Math.abs(form.total_mep_cost - sumOfCosts) > 1) {
      setCostWarning(`Sum of package costs (${sumOfCosts.toLocaleString()}) does not match Total MEP Cost (${form.total_mep_cost.toLocaleString()})`);
    } else {
      setCostWarning('');
    }
  };

  const runValidation = useCallback(async (data: FormState) => {
    const allData: Record<string, unknown> = {
      project_name: data.project_name,
      typology: data.typology,
      built_up_area: data.built_up_area,
      carpet_area: data.carpet_area,
      saleable_area: data.saleable_area,
      leasable_area: data.leasable_area,
      plant_room_area: data.plant_room_area,
      leasable_plant_room_area: data.leasable_plant_room_area,
      shaft_area: data.shaft_area,
      occupancy_density_office: data.occupancy_density_office,
      occupancy_density_fb: data.occupancy_density_fb,
      total_tr: data.total_tr,
      total_airflow_cfm: data.total_airflow_cfm,
      operating_hours: data.operating_hours,
      tenant_power_kva: data.tenant_power_kva,
      common_area_power_kva: data.common_area_power_kva,
      transformer_capacity_kva: data.transformer_capacity_kva,
      dg_capacity_kva: data.dg_capacity_kva,
      dg_loading_factor: data.dg_loading_factor,
      annual_energy_kwh: data.annual_energy_kwh,
      hvac_cost: data.hvac_cost,
      electrical_cost: data.electrical_cost,
      dg_cost: data.dg_cost,
      fire_fighting_cost: data.fire_fighting_cost,
      stp_cost: data.stp_cost,
      phe_cost: data.phe_cost,
      bms_cost: data.bms_cost,
      fapa_cost: data.fapa_cost,
      cctv_cost: data.cctv_cost,
      total_mep_cost: data.total_mep_cost,
    };
    const errors = await validateProjectInputs(allData);
    setValidationErrors(errors);
    setShowValidation(true);
    return errors;
  }, []);

  const persist = async (status: 'draft' | 'submitted') => {
    if (!user) return;
    setError('');
    setSubmitting(true);
    try {
      const project = await createProject(
        {
          project_name: form.project_name,
          typology: form.typology,
          location_city: form.location_city,
          location_state: form.location_state,
          project_year: form.project_year,
          built_up_area: form.built_up_area ?? 0,
          carpet_area: form.carpet_area ?? 0,
          saleable_area: form.saleable_area ?? 0,
          leasable_area: form.leasable_area ?? 0,
        },
        user.id
      );

      await upsertProjectInputs(project.id, {
        plant_room_area: form.plant_room_area,
        leasable_plant_room_area: form.leasable_plant_room_area,
        shaft_area: form.shaft_area,
        office_area: form.office_area,
        fb_area: form.fb_area,
        gross_area: form.gross_area,
        occupancy_density_office: form.occupancy_density_office,
        occupancy_density_fb: form.occupancy_density_fb,
        total_tr: form.total_tr,
        total_airflow_cfm: form.total_airflow_cfm,
        hvac_strategy: form.hvac_strategy || null,
        transformer_capacity_kva: form.transformer_capacity_kva,
        tenant_power_kva: form.tenant_power_kva,
        common_area_power_kva: form.common_area_power_kva,
        lighting_load_w: form.lighting_load_w,
        dg_capacity_kva: form.dg_capacity_kva,
        dg_loading_factor: form.dg_loading_factor,
        annual_energy_kwh: form.annual_energy_kwh,
        hvac_cost: form.hvac_cost,
        electrical_cost: form.electrical_cost,
        dg_cost: form.dg_cost,
        fire_fighting_cost: form.fire_fighting_cost,
        stp_cost: form.stp_cost,
        phe_cost: form.phe_cost,
        bms_cost: form.bms_cost,
        fapa_cost: form.fapa_cost,
        cctv_cost: form.cctv_cost,
        total_mep_cost: form.total_mep_cost,
        operating_hours: form.operating_hours,
      });

      if (status === 'submitted') {
        // Run Grüne Basis validation before submission
        const validationErrs = await runValidation(form);
        if (validationErrs.length > 0) {
          setSubmitting(false);
          return;
        }

        // Auto-approve: run formula engine and log audit
        await updateProjectStatus(project.id, 'approved', user.id);
        const [formulas, inputs] = await Promise.all([
          getKpiFormulas(),
          getProjectInputs(project.id),
        ]);
        if (inputs) {
          await calculateAndStoreKpiOutputs(project.id, inputs, formulas, project);
        }
        await createAuditLog({
          entity_type: 'project',
          entity_id: project.id,
          action: 'submitted',
          performed_by: user.id,
        });
      }

      router.push('/board2/repository');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter project details from the Grüne Basis Requirements workbook.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); persist('draft'); }}
        className="space-y-4"
      >
        {/* Section 1 — Project Identity */}
        <Section title="1. Project Identity">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Name *</Label>
              <Input
                value={form.project_name}
                onChange={(e) => update('project_name', e.target.value)}
                placeholder="e.g. Green Tower Office"
                required
                className="h-8 text-sm"
              />
            </div>
            <SelectField
              label="Typology *"
              value={form.typology}
              onChange={(v) => update('typology', v)}
              options={typologies}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input
                value={form.location_city}
                onChange={(e) => update('location_city', e.target.value)}
                placeholder="e.g. Mumbai"
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={form.location_state}
                onChange={(e) => update('location_state', e.target.value)}
                placeholder="e.g. Maharashtra"
                className="h-8 text-sm"
              />
            </div>
            <NumField
              label="Project Year *"
              unit=""
              value={form.project_year}
              onChange={(v) => update('project_year', v ?? new Date().getFullYear())}
              min={1980}
            />
          </div>
        </Section>

        {/* Section 2 — Area Schedule */}
        <Section title="2. Area Schedule">
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Built Up Area" unit="sqft" value={form.built_up_area} onChange={(v) => update('built_up_area', v)} />
            <NumField label="Carpet Area" unit="sqft" value={form.carpet_area} onChange={(v) => update('carpet_area', v)} />
            <NumField label="Saleable Area" unit="sqft" value={form.saleable_area} onChange={(v) => update('saleable_area', v)} />
            <NumField label="Leasable Area" unit="sqft" value={form.leasable_area} onChange={(v) => update('leasable_area', v)} />
            <NumField label="Plant Room Area" unit="sqft" value={form.plant_room_area} onChange={(v) => update('plant_room_area', v)} />
            <NumField label="Leasable Plant Room Area" unit="sqft" value={form.leasable_plant_room_area} onChange={(v) => update('leasable_plant_room_area', v)} />
            <NumField label="Shaft Area" unit="sqft" value={form.shaft_area} onChange={(v) => update('shaft_area', v)} />
            <NumField label="Office Area" unit="sqft" value={form.office_area} onChange={(v) => update('office_area', v)} />
            <NumField label="F&B Area" unit="sqft" value={form.fb_area} onChange={(v) => update('fb_area', v)} />
            <NumField label="Gross Area" unit="sqft" value={form.gross_area} onChange={(v) => update('gross_area', v)} />
          </div>
        </Section>

        {/* Section 3 — HVAC Parameters */}
        <Section title="3. HVAC Parameters">
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Total TR" unit="TR" value={form.total_tr} onChange={(v) => update('total_tr', v)} />
            <NumField label="Total Airflow" unit="CFM" value={form.total_airflow_cfm} onChange={(v) => update('total_airflow_cfm', v)} />
            <NumField label="Occupancy Density (Office)" unit="sqft/person" value={form.occupancy_density_office} onChange={(v) => update('occupancy_density_office', v)} />
            <NumField label="Occupancy Density (F&B)" unit="sqft/person" value={form.occupancy_density_fb} onChange={(v) => update('occupancy_density_fb', v)} />
            <SelectField label="HVAC Strategy" value={form.hvac_strategy} onChange={(v) => update('hvac_strategy', v)} options={hvacStrategies} />
            <NumField label="Operating Hours" unit="hrs/yr" value={form.operating_hours} onChange={(v) => update('operating_hours', v)} />
          </div>
        </Section>

        {/* Section 4 — Electrical & DG */}
        <Section title="4. Electrical & DG Parameters">
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Electrical</div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <NumField label="Transformer Capacity" unit="kVA" value={form.transformer_capacity_kva} onChange={(v) => update('transformer_capacity_kva', v)} />
            <NumField label="Tenant Power" unit="kVA" value={form.tenant_power_kva} onChange={(v) => update('tenant_power_kva', v)} />
            <NumField label="Common Area Power" unit="kVA" value={form.common_area_power_kva} onChange={(v) => update('common_area_power_kva', v)} />
            <NumField label="Lighting Load" unit="W" value={form.lighting_load_w} onChange={(v) => update('lighting_load_w', v)} />
            <NumField label="Annual Energy" unit="kWh" value={form.annual_energy_kwh} onChange={(v) => update('annual_energy_kwh', v)} />
          </div>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">DG</div>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="DG Capacity" unit="kVA" value={form.dg_capacity_kva} onChange={(v) => update('dg_capacity_kva', v)} />
            <NumField label="DG Loading Factor" unit="0-1" value={form.dg_loading_factor} onChange={(v) => update('dg_loading_factor', v)} />
          </div>
        </Section>

        {/* Section 5 — Package Costs */}
        <Section title="5. Package Costs">
          <div className="grid grid-cols-2 gap-4">
            <NumField label="HVAC Cost" unit="Rs" value={form.hvac_cost} onChange={(v) => update('hvac_cost', v)} />
            <NumField label="Electrical Cost" unit="Rs" value={form.electrical_cost} onChange={(v) => update('electrical_cost', v)} />
            <NumField label="DG Cost" unit="Rs" value={form.dg_cost} onChange={(v) => update('dg_cost', v)} />
            <NumField label="Fire Fighting Cost" unit="Rs" value={form.fire_fighting_cost} onChange={(v) => update('fire_fighting_cost', v)} />
            <NumField label="STP Cost" unit="Rs" value={form.stp_cost} onChange={(v) => update('stp_cost', v)} />
            <NumField label="PHE Cost" unit="Rs" value={form.phe_cost} onChange={(v) => update('phe_cost', v)} />
            <NumField label="BMS Cost" unit="Rs" value={form.bms_cost} onChange={(v) => update('bms_cost', v)} />
            <NumField label="FAPA Cost" unit="Rs" value={form.fapa_cost} onChange={(v) => update('fapa_cost', v)} />
            <NumField label="CCTV Cost" unit="Rs" value={form.cctv_cost} onChange={(v) => update('cctv_cost', v)} />
            <NumField label="Total MEP Cost" unit="Rs" value={form.total_mep_cost} onChange={(v) => { update('total_mep_cost', v); setTimeout(handleCostCheck, 0); }} />
          </div>

          {sumOfCosts > 0 && (
            <div className="text-xs text-muted-foreground pt-2">
              Sum of package costs: <strong>Rs {sumOfCosts.toLocaleString()}</strong>
            </div>
          )}
          {costWarning && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
              {costWarning}
            </div>
          )}
        </Section>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {showValidation && validationErrors.length > 0 && (
          <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-destructive">
                {validationErrors.length} Grüne Basis validation {validationErrors.length === 1 ? 'issue' : 'issues'} found
              </p>
              <button
                type="button"
                onClick={() => setShowValidation(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i} className="text-xs text-destructive">
                  <span className="font-mono font-medium">{err.field}</span>: {err.error_message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showValidation && validationErrors.length === 0 && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">
              All Grüne Basis validation checks passed.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="outline" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            disabled={submitting || !form.project_name || !form.typology}
            onClick={async () => {
              setSubmitting(true);
              const errs = await runValidation(form);
              if (errs.length === 0) {
                persist('submitted');
              } else {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Validate & Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
