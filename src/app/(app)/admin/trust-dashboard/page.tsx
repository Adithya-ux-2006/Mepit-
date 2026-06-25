'use client';

import { useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/role-guard';
import { getProjects, getKpiFormulas } from '@/lib/services';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart3, Database, Activity, Clock } from 'lucide-react';
import type { Project, KpiFormula } from '@/types';

function TrustDashboardContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formulas, setFormulas] = useState<KpiFormula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjects(), getKpiFormulas()])
      .then(([p, f]) => {
        setProjects(p);
        setFormulas(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const approved = projects.filter((p) => p.status === 'approved');
  const submitted = projects.filter((p) => p.status === 'submitted' || p.status === 'under_review');
  const drafts = projects.filter((p) => p.status === 'draft');

  const typologyBreakdown: Record<string, number> = {};
  for (const p of approved) {
    typologyBreakdown[p.typology] = (typologyBreakdown[p.typology] ?? 0) + 1;
  }

  const yearBreakdown: Record<string, number> = {};
  for (const p of approved) {
    const y = String(p.project_year);
    yearBreakdown[y] = (yearBreakdown[y] ?? 0) + 1;
  }

  const recentProjects = approved.filter((p) => {
    const year = p.project_year;
    return year && year >= new Date().getFullYear() - 3;
  }).length;

  const avgCycleTime = projects
    .filter((p) => p.approved_at && p.created_at)
    .reduce((sum, p) => {
      const diff = new Date(p.approved_at!).getTime() - new Date(p.created_at).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
  const avgCycleDays = approved.length ? (avgCycleTime / approved.length).toFixed(1) : '—';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trust Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Repository health and intelligence quality metrics.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{approved.length}</p>
              <p className="text-xs text-muted-foreground">Approved Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{formulas.length}</p>
              <p className="text-xs text-muted-foreground">Active KPI Formulas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{submitted.length}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{avgCycleDays}</p>
              <p className="text-xs text-muted-foreground">Avg Approval Cycle (days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repository Depth by Typology */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Repository Depth by Typology</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(typologyBreakdown).sort((a, b) => b[1] - a[1]).map(([typology, count]) => (
                <div key={typology}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>{typology}</span>
                    <span className="text-muted-foreground">{count} projects</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(count / Math.max(...Object.values(typologyBreakdown))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(typologyBreakdown).length === 0 && (
                <p className="text-xs text-muted-foreground">No approved projects yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Recency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Recency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Projects from last 3 years</span>
                <span className="font-semibold">{recentProjects} / {approved.length}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${approved.length ? (recentProjects / approved.length) * 100 : 0}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {approved.length === 0
                  ? 'No data yet.'
                  : recentProjects < approved.length / 2
                    ? 'Older-weighted repository — cost recommendations may be less reliable.'
                    : 'Well-balanced repository recency.'}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">By Year</p>
              <div className="space-y-1">
                {Object.entries(yearBreakdown).sort().reverse().map(([year, count]) => (
                  <div key={year} className="flex justify-between text-xs">
                    <span>{year}</span>
                    <span className="text-muted-foreground">{count} projects</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drafts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Submission Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Drafts</span>
                <span className="font-semibold">{drafts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Submitted / Under Review</span>
                <span className="font-semibold">{submitted.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved</span>
                <span className="font-semibold">{approved.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommendation Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Typologies with ≥3 approved projects</span>
                <span className="font-semibold">
                  {Object.values(typologyBreakdown).filter((c) => c >= 3).length} / {Object.keys(typologyBreakdown).length}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {approved.length < 10
                  ? 'Repository too thin for reliable recommendations. Focus on migrating historical data.'
                  : approved.length < 30
                    ? 'Improving. Some typologies have enough depth for Medium confidence recommendations.'
                    : 'Healthy repository. Board 3 can produce useful recommendations.'}
              </div>
              {approved.length >= 10 && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Board 3 is ready for pilot use with honest confidence display.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TrustDashboardPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <TrustDashboardContent />
    </RoleGuard>
  );
}
