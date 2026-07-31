'use client';

import { useState, useCallback, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  createProject,
  upsertProjectInputs,
  updateProjectStatus,
  createAuditLog,
  validateProjectInputs,
  getProjectById,
  getProjectInputs,
  updateProject,
  type ValidationError,
} from '@/lib/api';
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
import {
  COST_FIELDS,
  ENGINEERING_SERVICE_GROUPS,
  PROJECT_INPUT_FIELD_META,
  TOTAL_COST_FIELDS,
  getComputedFields,
  flattenExtendedFields,
  collectExtendedFields,
  isExtendedField,
  type ProjectInputField,
  type ComputedFieldDef,
  type EngineeringServiceGroup,
} from '@/lib/project-input-config';
import { getRequiredValidationErrors } from '@/lib/validation-engine';
import { PROJECT_STAGES } from '@/lib/project-stages';
import type { ProjectStage } from '@/types';

// All fields the form manages (existing columns + extended fields)
type AllFormFields = string;

interface FormState {
  // Project identity
  project_name: string;
  typology: string;
  project_stage: string;
  location_city: string;
  location_state: string;
  project_year: number;
  // Area fields (moved from Project Identity to Area & Building section)
  built_up_area: number | null;
  carpet_area: number | null;
  saleable_area: number | null;
  leasable_area: number | null;
  // All design parameter fields (existing columns + extended fields, all flat)
  [key: string]: unknown;
}

// Defaults for all known fields
const EXISTING_FIELD_DEFAULTS: Record<string, unknown> = {
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

const defaultForm: FormState = {
  project_name: '',
  typology: '',
  project_stage: '',
  location_city: '',
  location_state: '',
  project_year: new Date().getFullYear(),
  built_up_area: null,
  carpet_area: null,
  saleable_area: null,
  leasable_area: null,
  ...EXISTING_FIELD_DEFAULTS,
};

const typologies = [
  'Office', 'Retail', 'Hospitality', 'Mixed Use',
  'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
];

const projectFieldLabels: Record<string, string> = {
  project_name: 'Project Name',
  typology: 'Typology',
  project_stage: 'Project Stage',
  location_city: 'City',
  project_year: 'Project Year',
  built_up_area: 'Built Up Area',
  carpet_area: 'Carpet Area',
  saleable_area: 'Saleable Area',
  leasable_area: 'Leasable Area',
};

function buildProjectFieldErrors(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.project_name.trim()) errors.project_name = 'Project Name is required.';
  if (!form.typology) errors.typology = 'Typology is required.';
  if (!form.project_stage) errors.project_stage = 'Project Stage is required.';
  if (!form.location_city.trim()) errors.location_city = 'City is required.';
  if (!Number.isInteger(form.project_year) || form.project_year < 1980 || form.project_year > 2100) {
    errors.project_year = 'Project Year must be between 1980 and 2100.';
  }
  return errors;
}

function buildSubmitValidationData(data: FormState): Record<string, unknown> {
  const result: Record<string, unknown> = {
    project_name: data.project_name,
    typology: data.typology,
    built_up_area: data.built_up_area,
    carpet_area: data.carpet_area,
    saleable_area: data.saleable_area,
    leasable_area: data.leasable_area,
  };
  // Add all design parameter fields
  for (const key of Object.keys(data)) {
    if (!['project_name', 'typology', 'project_stage', 'location_city', 'location_state', 'project_year',
      'built_up_area', 'carpet_area', 'saleable_area', 'leasable_area'].includes(key)) {
      result[key] = data[key];
    }
  }
  return result;
}

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

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

function NumField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  min,
  error,
  decimals,
  readOnly,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  error?: string;
  decimals?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label} {unit ? <span className="text-[10px]">({unit})</span> : null}
        {readOnly && <span className="text-[10px] text-blue-500 ml-1">(computed)</span>}
      </Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          if (readOnly) return;
          const rawValue = e.target.value;
          if (rawValue === '') {
            onChange(null);
            return;
          }
          if (min != null && rawValue.startsWith('-')) return;
          if (decimals != null) {
            const [, decimalPart = ''] = rawValue.split('.');
            if (decimalPart.length > decimals) return;
          }
          const nextValue = Number(rawValue);
          if (Number.isNaN(nextValue)) return;
          if (min != null && nextValue < min) return;
          onChange(nextValue);
        }}
        placeholder={readOnly ? '—' : placeholder}
        min={min}
        step={decimals != null ? `0.${'0'.repeat(Math.max(decimals - 1, 0))}1` : undefined}
        className={`h-8 text-sm ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''} ${readOnly ? 'bg-muted/50 cursor-not-allowed' : ''}`}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : 0}
      />
      <FieldError error={error} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm ${error ? 'border-destructive' : 'border-input'}`}
      >
        <option value="">{placeholder ?? 'Select...'}</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const label = typeof option === 'string' ? option : option.label;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
      <FieldError error={error} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-8 text-sm ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
      />
      <FieldError error={error} />
    </div>
  );
}

function CreateProjectForm() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [projectFieldErrors, setProjectFieldErrors] = useState<Record<string, string>>({});
  const [loadingProject, setLoadingProject] = useState(!!editId);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(editId);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const update = useCallback(<K extends string>(field: K, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage('');
    setError('');
    setProjectFieldErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
    setValidationErrors((prev) => prev.filter((entry) => entry.field !== field));
  }, []);

  const costFields = COST_FIELDS.filter((field) => field !== 'total_mep_cost');
  const sumOfCosts = costFields.reduce((sum, field) => sum + (Number(form[field]) || 0), 0);

  const costWarning = useMemo(() => {
    const totalCost = Number(form.total_mep_cost) || 0;
    if (totalCost > 0 && sumOfCosts > 0 && Math.abs(totalCost - sumOfCosts) > 1) {
      return `Sum of package costs (${sumOfCosts.toFixed(2)} ₹/Sq.ft) does not match Total MEP Cost (${totalCost.toFixed(2)} ₹/Sq.ft)`;
    }
    return '';
  }, [form.total_mep_cost, sumOfCosts]);

  const fieldErrorMap = useMemo(() => {
    const next: Record<string, string> = { ...projectFieldErrors };
    for (const entry of validationErrors) {
      if (!next[entry.field]) next[entry.field] = entry.error_message;
    }
    return next;
  }, [projectFieldErrors, validationErrors]);

  // Compute derived fields for live display
  const computedFields = useMemo(() => getComputedFields(form), [form]);

  const runValidation = useCallback(async (data: FormState) => {
    const errors = await validateProjectInputs(buildSubmitValidationData(data));
    setValidationErrors(errors);
    setShowValidation(true);
    return errors;
  }, []);

  useEffect(() => {
    if (!editId) return;

    Promise.all([getProjectById(editId), getProjectInputs(editId)])
      .then(([project, inputs]) => {
        if (!project) return;
        if (project.status !== 'draft' && project.status !== 'rejected') return;

        const formData: FormState = {
          project_name: project.project_name,
          typology: project.typology,
          project_stage: project.project_stage,
          location_city: project.location_city,
          location_state: project.location_state,
          project_year: project.project_year,
          built_up_area: project.built_up_area,
          carpet_area: project.carpet_area,
          saleable_area: project.saleable_area,
          leasable_area: project.leasable_area,
          // Existing flat columns
          plant_room_area: inputs?.plant_room_area ?? null,
          leasable_plant_room_area: inputs?.leasable_plant_room_area ?? null,
          shaft_area: inputs?.shaft_area ?? null,
          office_area: inputs?.office_area ?? null,
          fb_area: inputs?.fb_area ?? null,
          gross_area: inputs?.gross_area ?? null,
          occupancy_density_office: inputs?.occupancy_density_office ?? null,
          occupancy_density_fb: inputs?.occupancy_density_fb ?? null,
          total_tr: inputs?.total_tr ?? null,
          total_airflow_cfm: inputs?.total_airflow_cfm ?? null,
          hvac_strategy: inputs?.hvac_strategy ?? '',
          transformer_capacity_kva: inputs?.transformer_capacity_kva ?? null,
          tenant_power_kva: inputs?.tenant_power_kva ?? null,
          common_area_power_kva: inputs?.common_area_power_kva ?? null,
          lighting_load_w: inputs?.lighting_load_w ?? null,
          dg_capacity_kva: inputs?.dg_capacity_kva ?? null,
          dg_loading_factor: inputs?.dg_loading_factor ?? null,
          annual_energy_kwh: inputs?.annual_energy_kwh ?? null,
          hvac_cost: inputs?.hvac_cost ?? null,
          electrical_cost: inputs?.electrical_cost ?? null,
          dg_cost: inputs?.dg_cost ?? null,
          fire_fighting_cost: inputs?.fire_fighting_cost ?? null,
          stp_cost: inputs?.stp_cost ?? null,
          phe_cost: inputs?.phe_cost ?? null,
          bms_cost: inputs?.bms_cost ?? null,
          fapa_cost: inputs?.fapa_cost ?? null,
          cctv_cost: inputs?.cctv_cost ?? null,
          total_mep_cost: inputs?.total_mep_cost ?? null,
          operating_hours: inputs?.operating_hours ?? 3000,
        };

        // Hydrate extended fields into flat form state
        if (inputs?.extended_fields) {
          flattenExtendedFields(inputs.extended_fields as Record<string, unknown>, formData);
        }

        setForm(formData);
        setExistingProjectId(project.id);
        setRejectionReason(project.status === 'rejected' ? project.rejection_reason : null);
      })
      .finally(() => setLoadingProject(false));
  }, [editId]);

  const persist = async (status: 'draft' | 'submitted') => {
    if (!user) return;

    setError('');
    setSaveMessage('');
    setSubmitting(true);

    const currentProjectErrors = buildProjectFieldErrors(form);
    setProjectFieldErrors(currentProjectErrors);
    if (Object.keys(currentProjectErrors).length > 0) {
      setSubmitting(false);
      setShowValidation(true);
      return;
    }

    if (status === 'submitted') {
      const allValidationErrors = await runValidation(form);
      const blockingErrors = getRequiredValidationErrors(allValidationErrors);
      if (blockingErrors.length > 0) {
        setSubmitting(false);
        return;
      }
    }

    const projectData = {
      project_name: form.project_name,
      typology: form.typology,
      project_stage: form.project_stage as ProjectStage,
      location_city: form.location_city,
      location_state: form.location_state,
      project_year: form.project_year,
      built_up_area: form.built_up_area ?? 0,
      carpet_area: form.carpet_area ?? 0,
      saleable_area: form.saleable_area ?? 0,
      leasable_area: form.leasable_area ?? 0,
    };

    try {
      const project = existingProjectId
        ? await updateProject(existingProjectId, projectData)
        : await createProject(projectData);

      const projectId = project.id;
      setExistingProjectId(projectId);

      // Collect extended fields for persistence
      const extFields = collectExtendedFields(form);

      await upsertProjectInputs(projectId, {
        // Existing flat columns
        plant_room_area: (form.plant_room_area as number | null) ?? null,
        leasable_plant_room_area: (form.leasable_plant_room_area as number | null) ?? null,
        shaft_area: (form.shaft_area as number | null) ?? null,
        office_area: (form.office_area as number | null) ?? null,
        fb_area: (form.fb_area as number | null) ?? null,
        gross_area: (form.gross_area as number | null) ?? null,
        occupancy_density_office: (form.occupancy_density_office as number | null) ?? null,
        occupancy_density_fb: (form.occupancy_density_fb as number | null) ?? null,
        total_tr: (form.total_tr as number | null) ?? null,
        total_airflow_cfm: (form.total_airflow_cfm as number | null) ?? null,
        hvac_strategy: (form.hvac_strategy as string) || null,
        transformer_capacity_kva: (form.transformer_capacity_kva as number | null) ?? null,
        tenant_power_kva: (form.tenant_power_kva as number | null) ?? null,
        common_area_power_kva: (form.common_area_power_kva as number | null) ?? null,
        lighting_load_w: (form.lighting_load_w as number | null) ?? null,
        dg_capacity_kva: (form.dg_capacity_kva as number | null) ?? null,
        dg_loading_factor: (form.dg_loading_factor as number | null) ?? null,
        annual_energy_kwh: (form.annual_energy_kwh as number | null) ?? null,
        hvac_cost: (form.hvac_cost as number | null) ?? null,
        electrical_cost: (form.electrical_cost as number | null) ?? null,
        dg_cost: (form.dg_cost as number | null) ?? null,
        fire_fighting_cost: (form.fire_fighting_cost as number | null) ?? null,
        stp_cost: (form.stp_cost as number | null) ?? null,
        phe_cost: (form.phe_cost as number | null) ?? null,
        bms_cost: (form.bms_cost as number | null) ?? null,
        fapa_cost: (form.fapa_cost as number | null) ?? null,
        cctv_cost: (form.cctv_cost as number | null) ?? null,
        total_mep_cost: (form.total_mep_cost as number | null) ?? null,
        operating_hours: (form.operating_hours as number | null) ?? 3000,
        // Extended fields
        extended_fields: extFields,
      });

      if (status === 'submitted') {
        await updateProjectStatus(projectId, 'submitted');
        await createAuditLog({
          entity_type: 'project',
          entity_id: projectId,
          action: 'submitted',
          performed_by: user.id,
        });
        router.push('/board2/repository');
        return;
      }

      setSaveMessage('Draft saved. You can continue editing without losing the rest of the form.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: ProjectInputField, computedMap?: Map<string, ComputedFieldDef>) => {
    const meta = PROJECT_INPUT_FIELD_META[field];
    if (!meta) return null;
    const errorMessage = fieldErrorMap[field];

    // Check if this is a computed field
    const computed = computedMap?.get(field);
    if (computed) {
      const val = computed.compute(form);
      return (
        <NumField
          key={field}
          label={computed.label}
          unit={computed.unit}
          value={val}
          onChange={() => {}}
          readOnly
        />
      );
    }

    if (meta.kind === 'select') {
      return (
        <SelectField
          key={field}
          label={meta.label}
          value={(form[field] as string) ?? ''}
          onChange={(value) => update(field, value)}
          options={meta.options ?? []}
          placeholder="Select..."
          error={errorMessage}
        />
      );
    }

    if (meta.kind === 'text') {
      return (
        <TextField
          key={field}
          label={meta.label}
          value={(form[field] as string) ?? ''}
          onChange={(value) => update(field, value)}
          placeholder={meta.placeholder}
          error={errorMessage}
        />
      );
    }

    return (
      <NumField
        key={field}
        label={meta.label}
        unit={meta.unit ?? ''}
        value={(form[field] as number | null) ?? null}
        onChange={(value) => update(field, value)}
        placeholder={meta.placeholder}
        min={meta.min}
        decimals={meta.decimals}
        error={errorMessage}
      />
    );
  };

  const renderGroup = (group: EngineeringServiceGroup, computedMap: Map<string, ComputedFieldDef>) => {
    const allFields = [
      ...group.fields,
      ...(group.subGroups?.flatMap((sg) => sg.fields) ?? []),
    ];
    const computedInGroup = allFields.filter((f) => computedMap.has(f));

    return (
      <Section key={group.key} title={group.title} defaultOpen={group.key === 'area-building' || group.key === 'hvac'}>
        <div className="grid grid-cols-2 gap-4">
          {group.fields.map((field) => renderField(field, computedMap))}
        </div>
        {group.subGroups?.map((subGroup) => (
          <div key={subGroup.key} className="mt-4 border-l-2 border-muted pl-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{subGroup.title}</p>
            <div className="grid grid-cols-2 gap-4">
              {subGroup.fields.map((field) => renderField(field, computedMap))}
            </div>
          </div>
        ))}
      </Section>
    );
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const requiredErrors = getRequiredValidationErrors(validationErrors);
  const advisoryErrors = validationErrors.filter((entry) => entry.rule_type !== 'required');

  // Build computed fields map for quick lookup
  const computedMap = new Map(computedFields.map((c) => [c.field, c]));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{existingProjectId ? 'Edit Project' : 'New Project'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {existingProjectId ? 'Update project details and resubmit for review.' : 'Enter project details from the MEP Services Comparison workbook.'}
        </p>
      </div>

      {rejectionReason && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">This project was previously rejected.</p>
          <p className="text-xs text-red-600 mt-1">Reason: {rejectionReason}</p>
          <p className="text-xs text-red-500 mt-1">Fix the issues above and resubmit for review.</p>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); persist('draft'); }}
        className="space-y-4"
      >
        {/* Section 1: Project Identity (truncated — area fields moved to Section 2) */}
        <Section title="1. Project Identity">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Name *</Label>
              <Input
                value={form.project_name}
                onChange={(e) => update('project_name', e.target.value)}
                placeholder="e.g. Green Tower Office"
                className={`h-8 text-sm ${fieldErrorMap.project_name ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
              />
              <FieldError error={fieldErrorMap.project_name} />
            </div>
            <SelectField
              label="Typology *"
              value={form.typology}
              onChange={(value) => update('typology', value)}
              options={typologies}
              error={fieldErrorMap.typology}
            />
            <SelectField
              label="Project Stage *"
              value={form.project_stage}
              onChange={(value) => update('project_stage', value)}
              options={PROJECT_STAGES}
              placeholder="Select project stage..."
              error={fieldErrorMap.project_stage}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input
                value={form.location_city}
                onChange={(e) => update('location_city', e.target.value)}
                placeholder="e.g. Mumbai"
                className={`h-8 text-sm ${fieldErrorMap.location_city ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
              />
              <FieldError error={fieldErrorMap.location_city} />
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
              onChange={(value) => update('project_year', value ?? new Date().getFullYear())}
              min={1980}
              error={fieldErrorMap.project_year}
            />
          </div>
        </Section>

        {/* Section 2: Design Parameters — all groups from config */}
        <Section title="2. Design Parameters">
          <div className="space-y-4">
            {/* Area & Building Parameters — single merged section */}
            <Section title="Area & Building Parameters" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                <NumField
                  label="Total BUA"
                  unit="sqft"
                  value={form.built_up_area}
                  onChange={(value) => update('built_up_area', value)}
                  min={0}
                  error={fieldErrorMap.built_up_area}
                />
                <NumField
                  label="Carpet Area"
                  unit="sqft"
                  value={form.carpet_area}
                  onChange={(value) => update('carpet_area', value)}
                  min={0}
                  error={fieldErrorMap.carpet_area}
                />
                <NumField
                  label="Saleable Area"
                  unit="sqft"
                  value={form.saleable_area}
                  onChange={(value) => update('saleable_area', value)}
                  min={0}
                  error={fieldErrorMap.saleable_area}
                />
                <NumField
                  label="Leasable Area"
                  unit="sqft"
                  value={form.leasable_area}
                  onChange={(value) => update('leasable_area', value)}
                  min={0}
                  error={fieldErrorMap.leasable_area}
                />
              </div>
              {/* Config-driven area-building fields (no extra Section wrapper) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {(ENGINEERING_SERVICE_GROUPS.find((g) => g.key === 'area-building')?.fields ?? []).map(
                  (field) => renderField(field, computedMap)
                )}
              </div>
            </Section>

            {/* Render all config groups EXCEPT area-building (handled above) */}
            {ENGINEERING_SERVICE_GROUPS.filter((group) => group.key !== 'area-building').map((group) => renderGroup(group, computedMap))}

            <Section title="Total" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                {TOTAL_COST_FIELDS.map((field) => renderField(field, computedMap))}
              </div>

              {sumOfCosts > 0 && (
                <div className="text-xs text-muted-foreground pt-2">
                  Sum of package costs: <strong>{sumOfCosts.toFixed(2)} ₹/Sq.ft (BUA)</strong>
                </div>
              )}
              {costWarning && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                  {costWarning}
                </div>
              )}
            </Section>
          </div>
        </Section>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {saveMessage && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{saveMessage}</p>
        )}

        {showValidation && (Object.keys(projectFieldErrors).length > 0 || requiredErrors.length > 0) && (
          <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Submission blocked until the required fields below are filled.</p>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(projectFieldErrors).map(([field, message]) => (
                <li key={field} className="text-xs text-destructive">
                  <span className="font-medium">{projectFieldLabels[field] ?? field}</span>: {message}
                </li>
              ))}
              {requiredErrors.map((entry, index) => (
                <li key={`${entry.field}-${index}`} className="text-xs text-destructive">
                  <span className="font-mono font-medium">{entry.field}</span>: {entry.error_message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showValidation && advisoryErrors.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-amber-700">Advisory validation checks</p>
            <ul className="list-disc list-inside space-y-1">
              {advisoryErrors.map((entry, index) => (
                <li key={`${entry.field}-${index}`} className="text-xs text-amber-700">
                  <span className="font-mono font-medium">{entry.field}</span>: {entry.error_message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="outline" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => persist('submitted')}
          >
            {submitting ? 'Submitting...' : 'Validate & Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <CreateProjectForm />
    </Suspense>
  );
}
