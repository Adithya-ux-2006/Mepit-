'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getProjects } from '@/lib/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Project } from '@/types';

export default function RepositoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTypology, setFilterTypology] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and search submitted projects.
        </p>
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

      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No projects found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  href={`/board2/repository/${project.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {project.project_name}
                </Link>
              </TableCell>
              <TableCell>{project.typology}</TableCell>
              <TableCell>{project.location_city}{project.location_state ? `, ${project.location_state}` : ''}</TableCell>
              <TableCell>{project.built_up_area}</TableCell>
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
    </div>
  );
}
