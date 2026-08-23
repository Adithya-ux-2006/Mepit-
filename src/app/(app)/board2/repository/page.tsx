'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getProjects, previewKpiOutputs } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/loading-buffer';
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
import { Download, GitCompareArrows, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import type { Project, ProjectKpiOutput, KpiFormula } from '@/types';
import { getProjectStageLabel, PROJECT_STAGES } from '@/lib/project-stages';

interface OutputWithKpi extends ProjectKpiOutput {
  kpi_formula?: KpiFormula;
}

interface ProjectGroup {
  rootId: string;
  projectName: string;
  typology: string;
  location: string;
  year: number;
  stages: Project[];
}

function getStageOrder(stage: string): number {
  const index = PROJECT_STAGES.findIndex((s) => s.value === stage);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export default function RepositoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTypology, setFilterTypology] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState<
    { project: Project; outputs: OutputWithKpi[] }[]
  >([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typologies = useMemo(
    () => [...new Set(projects.map((p) => p.typology))].sort(),
    [projects]
  );
  const locations = useMemo(
    () => [...new Set(projects.map((p) => p.location_city))].sort(),
    [projects]
  );
  const years = useMemo(
    () => [...new Set(projects.map((p) => String(p.project_year)))].sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (
        search &&
        !p.project_name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterTypology && p.typology !== filterTypology) return false;
      if (filterStage && p.project_stage !== filterStage) return false;
      if (filterLocation && p.location_city !== filterLocation) return false;
      if (filterYear && String(p.project_year) !== filterYear) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, search, filterTypology, filterStage, filterLocation, filterYear, filterStatus]);

  const projectGroups = useMemo(() => {
    const groupMap = new Map<string, ProjectGroup>();
    for (const p of filtered) {
      const rootId = p.source_project_id ?? p.id;
      if (!groupMap.has(rootId)) {
        groupMap.set(rootId, {
          rootId,
          projectName: p.project_name,
          typology: p.typology,
          location: `${p.location_city}${p.location_state ? `, ${p.location_state}` : ''}`,
          year: p.project_year,
          stages: [],
        });
      }
      groupMap.get(rootId)!.stages.push(p);
    }
    for (const group of groupMap.values()) {
      group.stages.sort((a, b) => getStageOrder(a.project_stage) - getStageOrder(b.project_stage));
    }
    return [...groupMap.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filtered]);

  const toggleGroup = (rootId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setCompareLoading(true);
    try {
      const selected = projects.filter((p) => selectedIds.includes(p.id));
      const data = await Promise.all(
        selected.map(async (project) => {
          const outputs = await previewKpiOutputs(project.id);
          return { project, outputs };
        })
      );
      setCompareData(data);
      setCompareMode(true);
    } catch {
      // ignore
    } finally {
      setCompareLoading(false);
    }
  };

  // Collect all unique KPI codes across compared projects for the comparison table
  const allKpiCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const d of compareData) {
      for (const o of d.outputs) {
        if (o.kpi_formula?.kpi_code) codes.add(o.kpi_formula.kpi_code);
      }
    }
    return [...codes];
  }, [compareData]);

  const getKpiValue = (
    outputs: OutputWithKpi[],
    kpiCode: string
  ): { value: number | null; unit: string } => {
    const match = outputs.find((o) => o.kpi_formula?.kpi_code === kpiCode);
    return { value: match?.calculated_value ?? null, unit: match?.kpi_formula?.unit ?? '' };
  };

  const handleExport = () => {
    const rows: string[][] = [
      ['Project Name', 'Typology', 'Project Stage', 'City', 'State', 'Year', 'BUA', 'Carpet Area', 'Status'],
    ];
    for (const p of filtered) {
      rows.push([
        p.project_name,
        p.typology,
        getProjectStageLabel(p.project_stage),
        p.location_city,
        p.location_state,
        String(p.project_year),
        String(p.built_up_area),
        String(p.carpet_area),
        p.status,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repository-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompareExport = () => {
    if (compareData.length === 0) return;
    const header = ['KPI Code', 'KPI Name', 'Unit', ...compareData.map((d) => d.project.project_name)];
    const rows: string[][] = [header];
    for (const kpiCode of allKpiCodes) {
      const first = compareData[0].outputs.find((o) => o.kpi_formula?.kpi_code === kpiCode);
      const row: string[] = [
        kpiCode,
        first?.kpi_formula?.kpi_name ?? '',
        first?.kpi_formula?.unit ?? '',
      ];
      for (const d of compareData) {
        const { value } = getKpiValue(d.outputs, kpiCode);
        row.push(value != null ? String(Math.round(value * 100) / 100) : '—');
      }
      rows.push(row);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageSkeleton title="Loading project repository" rows={9} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project Repository</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, compare, and export submitted projects.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompare}
              disabled={compareLoading}
            >
              <GitCompareArrows className="h-4 w-4 mr-1.5" />
              {compareLoading ? 'Loading...' : `Compare (${selectedIds.length})`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="data-surface grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="search" className="text-xs">Search</Label>
          <Input
            id="search"
            placeholder="Project name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-typology" className="text-xs">Typology</Label>
          <select
            id="filter-typology"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={filterTypology}
            onChange={(e) => setFilterTypology(e.target.value)}
          >
            <option value="">All</option>
            {typologies.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-stage" className="text-xs">Project Stage</Label>
          <select
            id="filter-stage"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="">All</option>
            {PROJECT_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>{stage.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-location" className="text-xs">Location</Label>
          <select
            id="filter-location"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="">All</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-year" className="text-xs">Year</Label>
          <select
            id="filter-year"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-status" className="text-xs">Status</Label>
          <select
            id="filter-status"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {projectGroups.length} projects &middot; {filtered.length} stages &middot; Select {compareMode ? 'stages to compare' : '2+ stages to compare'}
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-8" />
              <TableHead>Project Name</TableHead>
              <TableHead>Typology</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Stages</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
            {projectGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.rootId);
              return (
                <GroupRow
                  key={group.rootId}
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={() => toggleGroup(group.rootId)}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Comparison View */}
      {compareMode && compareData.length >= 2 && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                KPI Comparison ({compareData.length} stages)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCompareExport}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export Comparison
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setCompareMode(false); setCompareData([]); setSelectedIds([]); }}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">KPI Code</TableHead>
                    <TableHead className="min-w-[80px]">Unit</TableHead>
                    {compareData.map((d) => (
                      <TableHead key={d.project.id} className="min-w-[140px] text-right">
                        {d.project.project_name}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {getProjectStageLabel(d.project.project_stage)} · {d.project.typology} · {d.project.built_up_area.toLocaleString()} sq. ft
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allKpiCodes.map((kpiCode) => {
                    const first = compareData[0].outputs.find((o) => o.kpi_formula?.kpi_code === kpiCode);
                    return (
                      <TableRow key={kpiCode}>
                        <TableCell className="font-mono text-xs">{kpiCode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{first?.kpi_formula?.unit ?? ''}</TableCell>
                        {compareData.map((d) => {
                          const { value } = getKpiValue(d.outputs, kpiCode);
                          return (
                            <TableCell key={d.project.id} className="text-right font-medium text-sm">
                              {value != null ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {allKpiCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2 + compareData.length} className="text-center text-muted-foreground py-8">
                        No KPI outputs available for the selected stages.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GroupRow({
  group,
  isExpanded,
  onToggle,
  selectedIds,
  onToggleSelect,
}: {
  group: ProjectGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}) {
  const allSelected = group.stages.every((s) => selectedIds.includes(s.id));
  const someSelected = group.stages.some((s) => selectedIds.includes(s.id));

  const toggleAll = () => {
    for (const s of group.stages) {
      if (!allSelected) {
        if (!selectedIds.includes(s.id)) onToggleSelect(s.id);
      } else {
        if (selectedIds.includes(s.id)) onToggleSelect(s.id);
      }
    }
  };

  return (
    <>
      <TableRow className="bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={(e) => { e.stopPropagation(); toggleAll(); }}
            className="h-4 w-4 rounded border-input"
          />
        </TableCell>
        <TableCell>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell className="font-semibold">{group.projectName}</TableCell>
        <TableCell>{group.typology}</TableCell>
        <TableCell>{group.location}</TableCell>
        <TableCell>{group.year}</TableCell>
        <TableCell>
          <span className="text-xs text-muted-foreground">{group.stages.length} stage{group.stages.length !== 1 ? 's' : ''}</span>
        </TableCell>
      </TableRow>
      {isExpanded && group.stages.map((stage) => (
        <TableRow key={stage.id} className="hover:bg-muted/20">
          <TableCell>
            <input
              type="checkbox"
              checked={selectedIds.includes(stage.id)}
              onChange={() => onToggleSelect(stage.id)}
              className="h-4 w-4 rounded border-input"
            />
          </TableCell>
          <TableCell />
          <TableCell className="pl-10">
            <Link
              href={`/board2/repository/${stage.id}`}
              className="text-foreground hover:underline inline-flex items-center gap-1"
            >
              {getProjectStageLabel(stage.project_stage)}
              <Eye className="h-3 w-3 text-muted-foreground" />
            </Link>
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                stage.status === 'approved'
                  ? 'bg-green-50 text-green-700'
                  : stage.status === 'submitted' || stage.status === 'under_review'
                    ? 'bg-yellow-50 text-yellow-700'
                    : stage.status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-50 text-gray-600'
              }`}
            >
              {stage.status}
            </span>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
