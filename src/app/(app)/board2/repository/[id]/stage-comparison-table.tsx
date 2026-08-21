'use client';

import { Fragment } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PROJECT_INPUT_FIELD_META, formatProjectInputValue, type ProjectInputField } from '@/lib/project-input-config';
import { getProjectStageLabel } from '@/lib/project-stages';
import type { Project, ProjectInputs } from '@/types';

export interface StageSnapshot {
  project: Project;
  inputs: ProjectInputs | null;
  flatInputs: Record<string, unknown>;
}

export interface StageComparisonGroup {
  key: string;
  title: string;
  fields: readonly string[];
}

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

function getFieldLabel(field: string): string {
  if (projectFieldLabels[field]) return projectFieldLabels[field];
  const meta = PROJECT_INPUT_FIELD_META[field as ProjectInputField];
  if (meta) return meta.label;
  return field.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeComparableValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : '';
  return String(value).trim().toLowerCase();
}

function stageValueChanged(current: unknown, previous: unknown): boolean {
  return normalizeComparableValue(current) !== normalizeComparableValue(previous);
}

function getSnapshotValue(snapshot: StageSnapshot, field: string): unknown {
  if (field in projectFieldLabels) {
    return snapshot.project[field as keyof Project];
  }
  return snapshot.flatInputs[field];
}

function formatStageComparisonValue(field: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field === 'project_year') return String(value);
  if (['built_up_area', 'carpet_area', 'saleable_area', 'leasable_area'].includes(field) && typeof value === 'number') {
    return `${value.toLocaleString()} sq. ft`;
  }
  const meta = PROJECT_INPUT_FIELD_META[field as ProjectInputField];
  if (meta) return formatProjectInputValue(field as ProjectInputField, value);
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(value);
}

export function StageComparisonTable({
  groups,
  snapshots,
}: {
  groups: readonly StageComparisonGroup[];
  snapshots: readonly StageSnapshot[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-56 bg-background">Field</TableHead>
            {snapshots.map((snapshot) => (
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
          {groups.map((group) => (
            <Fragment key={group.key}>
              <TableRow>
                <TableCell
                  colSpan={snapshots.length + 1}
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
                  {snapshots.map((snapshot, index) => {
                    const value = getSnapshotValue(snapshot, field);
                    const previousValue = index > 0 ? getSnapshotValue(snapshots[index - 1], field) : value;
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
  );
}
