'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getProjects, getProjectKpiOutputs } from '@/lib/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { Download, GitCompareArrows, Eye } from 'lucide-react';
import type { Project, ProjectKpiOutput, KpiFormula } from '@/types';

interface OutputWithKpi extends ProjectKpiOutput {
  kpi_formula?: KpiFormula;
}

export default function RepositoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTypology, setFilterTypology] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState<
    { project: Project; outputs: OutputWithKpi[] }[]
  >([]);
  const [compareLoading, setCompareLoading] = useState(false);

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
      if (filterLocation && p.location_city !== filterLocation) return false;
      if (filterYear && String(p.project_year) !== filterYear) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, search, filterTypology, filterLocation, filterYear, filterStatus]);

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
          const outputs = await getProjectKpiOutputs(project.id);
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
      ['Project Name', 'Typology', 'City', 'State', 'Year', 'BUA', 'Carpet Area', 'Status'],
    ];
    for (const p of filtered) {
      rows.push([
        p.project_name,
        p.typology,
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
          <Label htmlFor="filter-location" className="text-xs">Location</Label>
          <select
            id="filter-location"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
        {filtered.length} projects shown &middot; Select {compareMode ? 'projects to compare' : '2+ approved projects to compare'}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Project Name</TableHead>
            <TableHead>Typology</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Built Up Area</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No projects found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(project.id)}
                  onChange={() => toggleSelect(project.id)}
                  className="h-4 w-4 rounded border-input"
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/board2/repository/${project.id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                >
                  {project.project_name}
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </Link>
              </TableCell>
              <TableCell>{project.typology}</TableCell>
              <TableCell>{project.location_city}{project.location_state ? `, ${project.location_state}` : ''}</TableCell>
              <TableCell>{project.built_up_area.toLocaleString()}</TableCell>
              <TableCell>{project.project_year}</TableCell>
              <TableCell>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    project.status === 'approved'
                      ? 'bg-green-50 text-green-700'
                      : project.status === 'submitted' || project.status === 'under_review'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {project.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Comparison View */}
      {compareMode && compareData.length >= 2 && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                KPI Comparison ({compareData.length} projects)
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
                          {d.project.typology} · {d.project.built_up_area.toLocaleString()} sqft
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
                        No KPI outputs available for the selected projects.
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
