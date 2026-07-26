'use client';

import { useEffect, useState, startTransition } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getProjects, getKpiFormulas, getAuditLogs, getRateLimitStatus, getUserProjects, updateProjectStatus } from '@/lib/api';
import type { RateLimitStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, FolderOpen, BarChart3, CheckCircle, Clock, FileText, Activity, Shield, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import type { Project, AuditLog, KpiFormula } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formulaCount, setFormulaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [rateLimitData, setRateLimitData] = useState<RateLimitStatus | null>(null);
  const [rlLoading, setRlLoading] = useState(false);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [formulas, setFormulas] = useState<KpiFormula[]>([]);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [getProjects(), getKpiFormulas(), getAuditLogs()];
    if (user?.id) {
      fetches.push(getUserProjects(user.id));
    }
    Promise.all(fetches)
      .then(([p, f, logs, mine]) => {
        startTransition(() => {
          setProjects(p as Project[]);
          setFormulas(f as KpiFormula[]);
          setFormulaCount((f as unknown[]).length);
          setRecentActivity((logs as AuditLog[]).slice(0, 10));
          if (mine) setMyProjects(mine as Project[]);
        });
      })
      .catch(() => {})
      .finally(() => startTransition(() => setLoading(false)));
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === 'admin') {
      startTransition(() => setRlLoading(true));
      getRateLimitStatus()
        .then((data) => startTransition(() => setRateLimitData(data)))
        .catch(() => startTransition(() => setRateLimitData(null)))
        .finally(() => startTransition(() => setRlLoading(false)));
    }
  }, [user?.role]);

  const approved = projects.filter((p) => p.status === 'approved').length;
  const pending = projects.filter((p) => p.status === 'submitted' || p.status === 'under_review').length;
  const drafts = projects.filter((p) => p.status === 'draft').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{drafts}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-semibold">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-semibold">{approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold">{formulaCount}</p>
              <p className="text-xs text-muted-foreground">KPI Formulas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/board1/create-project" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FilePlus className="h-4 w-4" />
                Board 1
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Submit new projects with full MEP engineering parameters.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/board2/repository" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4" />
                Board 2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse the project repository with KPI outputs and search.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/board3/kpi-engine" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Board 3
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generate KPI recommendations from similar historical projects.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {myProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              My Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={p.status === 'draft' || p.status === 'rejected' ? `/board1/create-project?id=${p.id}` : `/board2/repository/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.project_name}
                    </Link>
                    <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                      p.status === 'approved' ? 'bg-green-50 text-green-700' :
                      p.status === 'submitted' || p.status === 'under_review' ? 'bg-yellow-50 text-yellow-700' :
                      p.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {p.status}
                    </span>
                    {p.status === 'rejected' && p.rejection_reason && (
                      <span className="text-red-600 truncate max-w-[200px]" title={p.rejection_reason}>
                        — {p.rejection_reason}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'draft' && (
                      <>
                        <Link href={`/board1/create-project?id=${p.id}`} className="text-primary hover:underline">
                          Edit
                        </Link>
                        <button
                          onClick={async () => {
                            try {
                              await updateProjectStatus(p.id, 'submitted');
                              const mine = await getUserProjects(user!.id);
                              startTransition(() => setMyProjects(mine));
                            } catch {}
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          Submit
                        </button>
                      </>
                    )}
                    {p.status === 'rejected' && (
                      <Link href={`/board1/create-project?id=${p.id}`} className="text-primary hover:underline font-medium">
                        Edit & Resubmit
                      </Link>
                    )}
                    {p.status === 'submitted' && (
                      <span className="text-muted-foreground">Awaiting review</span>
                    )}
                    {p.status === 'approved' && (
                      <Link href={`/board2/repository/${p.id}`} className="text-primary hover:underline">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                      log.action === 'approved' ? 'bg-green-50 text-green-700' :
                      log.action === 'submitted' ? 'bg-blue-50 text-blue-700' :
                      log.action === 'rejected' || log.action === 'reverted_to_draft' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>{log.action}</span>
                    <span className="text-muted-foreground">
                      {log.entity_type} {log.entity_id.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.performed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === 'admin' && (
        <>
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-4 py-3">
            <span className="font-medium text-foreground">Admin:</span>{' '}
            <Link href="/admin/approvals" className="underline underline-offset-2 hover:text-foreground">
              {pending} pending approvals
            </Link>
          </div>

          <TrustDashboardSection projects={projects} formulas={formulas} />

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rate Limiting
                </span>
                <button
                  onClick={() => {
                    setRlLoading(true);
                    getRateLimitStatus()
                      .then(setRateLimitData)
                      .catch(() => setRateLimitData(null))
                      .finally(() => setRlLoading(false));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={rlLoading}
                >
                  <RefreshCw className={`h-3 w-3 inline mr-1 ${rlLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rateLimitData ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Configured Limits</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {Object.entries(rateLimitData.presets).map(([name, config]) => (
                        <div key={name} className="text-xs bg-secondary/50 rounded-lg px-3 py-2">
                          <p className="font-medium capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-muted-foreground">
                            {config.maxRequests}/{config.windowMs / 1000}s
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Active IPs ({rateLimitData.totalBuckets} total)
                    </p>
                    {rateLimitData.activeBuckets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No active request windows.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {rateLimitData.activeBuckets.map((bucket) => {
                          const usagePct = Math.round((bucket.requestCount / bucket.maxRequests) * 100);
                          const isHigh = usagePct > 75;
                          const isCritical = usagePct >= 100;
                          return (
                            <div key={bucket.ip} className="flex items-center gap-3 text-xs">
                              <code className="font-mono text-muted-foreground w-28 shrink-0 truncate" title={bucket.ip}>
                                {bucket.ip}
                              </code>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isCritical ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-primary'
                                      }`}
                                      style={{ width: `${Math.min(usagePct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground w-20 text-right shrink-0">
                                    {bucket.requestCount}/{bucket.maxRequests}
                                  </span>
                                  <span className="text-muted-foreground w-14 text-right shrink-0">
                                    {bucket.secondsUntilReset}s
                                  </span>
                                </div>
                              </div>
                              {bucket.throttled && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">
                                  <AlertTriangle className="h-3 w-3" />
                                  blocked
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Snapshot at {new Date(rateLimitData.snapshotAt).toLocaleTimeString()}. Counters reset on cold starts (in-memory).
                  </p>
                </div>
              ) : rlLoading ? (
                <p className="text-xs text-muted-foreground">Loading rate limit data...</p>
              ) : (
                <p className="text-xs text-muted-foreground">Unable to load rate limit status.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================================
// TRUST DASHBOARD SECTION (merged from /admin/trust-dashboard)
// ============================================================================

function TrustDashboardSection({ projects, formulas }: { projects: Project[]; formulas: KpiFormula[] }) {
  const approved = projects.filter((p) => p.status === 'approved');
  const submitted = projects.filter((p) => p.status === 'submitted' || p.status === 'under_review');

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

  const allTypologies = ['Office', 'Retail', 'Hospitality', 'Mixed Use', 'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional'];
  const missingTypologies = allTypologies.filter((t) => !typologyBreakdown[t]);
  const thinTypologies = Object.entries(typologyBreakdown).filter(([, c]) => c < 3).map(([t]) => t);

  const locationBreakdown: Record<string, number> = {};
  for (const p of approved) {
    locationBreakdown[p.location_city] = (locationBreakdown[p.location_city] ?? 0) + 1;
  }

  const buaValues = approved.map((p) => p.built_up_area).filter((v) => v > 0).sort((a, b) => a - b);
  const avgBua = buaValues.length ? Math.round(buaValues.reduce((a, b) => a + b, 0) / buaValues.length) : 0;
  const minBua = buaValues[0] ?? 0;
  const maxBua = buaValues[buaValues.length - 1] ?? 0;

  const completeProjects = approved.filter((p) =>
    p.built_up_area > 0 && p.carpet_area > 0 && p.saleable_area > 0 && p.project_year > 0
  ).length;
  const completenessScore = approved.length ? Math.round((completeProjects / approved.length) * 100) : 0;

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5" />
          Trust Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Repository health and intelligence quality metrics.</p>
      </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Quality</CardTitle>
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
              <div className="flex justify-between text-sm">
                <span>Average BUA</span>
                <span className="font-semibold">{avgBua.toLocaleString()} sqft</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>BUA Range</span>
                <span className="font-semibold">{minBua.toLocaleString()} – {maxBua.toLocaleString()} sqft</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  ? 'Repository too thin for reliable recommendations.'
                  : approved.length < 30
                    ? 'Improving. Some typologies have enough depth for Medium confidence.'
                    : 'Healthy repository. Board 3 can produce useful recommendations.'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
