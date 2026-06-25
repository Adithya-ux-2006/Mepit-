'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getProjects, getKpiFormulas } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, FolderOpen, BarChart3, CheckCircle, Clock, FileText } from 'lucide-react';
import type { Project } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formulaCount, setFormulaCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjects(), getKpiFormulas()])
      .then(([p, f]) => {
        setProjects(p);
        setFormulaCount(f.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

      {user?.role === 'admin' && (
        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-4 py-3">
          <span className="font-medium text-foreground">Admin:</span>{' '}
          <Link href="/admin/approvals" className="underline underline-offset-2 hover:text-foreground">
            {pending} pending approvals
          </Link>
          {' '}&middot;{' '}
          <Link href="/admin/trust-dashboard" className="underline underline-offset-2 hover:text-foreground">
            Trust Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
