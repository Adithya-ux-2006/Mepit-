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
import { BarChart3, Database, Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
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

  // Typology gap analysis
  const allTypologies = ['Office', 'Retail', 'Hospitality', 'Mixed Use', 'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional'];
  const missingTypologies = allTypologies.filter((t) => !typologyBreakdown[t]);
  const thinTypologies = Object.entries(typologyBreakdown).filter(([, c]) => c < 3).map(([t]) => t);

  // Location coverage
  const locationBreakdown: Record<string, number> = {};
  for (const p of approved) {
    locationBreakdown[p.location_city] = (locationBreakdown[p.location_city] ?? 0) + 1;
  }

  // BUA distribution
  const buaValues = approved.map((p) => p.built_up_area).filter((v) => v > 0).sort((a, b) => a - b);
  const avgBua = buaValues.length ? Math.round(buaValues.reduce((a, b) => a + b, 0) / buaValues.length) : 0;
  const minBua = buaValues[0] ?? 0;
  const maxBua = buaValues[buaValues.length - 1] ?? 0;

  // Data completeness score
  const completeProjects = approved.filter((p) =>
    p.built_up_area > 0 && p.carpet_area > 0 && p.saleable_area > 0 && p.project_year > 0
  ).length;
  const completenessScore = approved.length ? Math.round((completeProjects / approved.length) * 100) : 0;

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

        {/* Data Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Data Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Completeness Score</span>
                <span className="font-semibold">
                  <span className={completenessScore >= 80 ? 'text-green-600' : completenessScore >= 50 ? 'text-amber-600' : 'text-red-600'}>
                    {completenessScore}%
                  </span>
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${completenessScore >= 80 ? 'bg-green-500' : completenessScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Projects with BUA, carpet area, saleable area, and year all populated.</p>

              <div className="flex justify-between text-sm">
                <span>BUA Range</span>
                <span className="font-semibold">{minBua.toLocaleString()} – {maxBua.toLocaleString()} sqft</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average BUA</span>
                <span className="font-semibold">{avgBua.toLocaleString()} sqft</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Analysis */}
      {(missingTypologies.length > 0 || thinTypologies.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Repository Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {missingTypologies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Missing Typologies ({missingTypologies.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingTypologies.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{t}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Board 3 cannot generate recommendations for these typologies.</p>
                </div>
              )}
              {thinTypologies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Thin Typologies ({thinTypologies.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {thinTypologies.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{t} ({typologyBreakdown[t]})</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Recommendations will have Low/Medium confidence for these typologies.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Coverage */}
      {Object.keys(locationBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(locationBreakdown).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
                <div key={city} className="flex justify-between text-xs">
                  <span>{city}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
