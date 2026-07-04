'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/layout/role-guard';
import { getProjectsByStatus, updateProjectStatus, getKpiFormulas, getProjectInputs, calculateAndStoreKpiOutputs } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Project } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

function ProjectCard({ project, children }: { project: Project; children: React.ReactNode }) {
  return (
    <Card key={project.id} className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{project.project_name}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[project.status] ?? 'bg-gray-50 text-gray-600'}`}>
            {project.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Typology</span>
            <p className="font-medium">{project.typology}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Location</span>
            <p className="font-medium">{project.location_city}, {project.location_state}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">BUA</span>
            <p className="font-medium">{project.built_up_area?.toLocaleString()} sqft</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Year</span>
            <p className="font-medium">{project.project_year}</p>
          </div>
        </div>
        {project.rejection_reason && project.status === 'rejected' && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
            Reason: {project.rejection_reason}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function ApprovalsContent() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState<Project[]>([]);
  const [underReview, setUnderReview] = useState<Project[]>([]);
  const [approved, setApproved] = useState<Project[]>([]);
  const [rejected, setRejected] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (projectId: string) => {
    setErrors((prev) => { const next = { ...prev }; delete next[projectId]; return next; });
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      getProjectsByStatus('submitted'),
      getProjectsByStatus('under_review'),
      getProjectsByStatus('approved'),
      getProjectsByStatus('rejected'),
    ])
      .then(([sub, rev, app, rej]) => {
        setSubmitted(sub);
        setUnderReview(rev);
        setApproved(app);
        setRejected(rej);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setTimeout(fetchData, 0); }, [fetchData]);

  const withErrorHandling = async (projectId: string, fn: () => Promise<void>) => {
    if (!user) return;
    setProcessing(projectId);
    clearError(projectId);
    try {
      await fn();
      setProcessing(null);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setErrors((prev) => ({ ...prev, [projectId]: message }));
      setProcessing(null);
      setRejectingId(null);
    }
  };

  const handleStartReview = (project: Project) => {
    withErrorHandling(project.id, async () => {
      await updateProjectStatus(project.id, 'under_review');
    });
  };

  const handleApprove = (project: Project) => {
    withErrorHandling(project.id, async () => {
      await updateProjectStatus(project.id, 'approved', user!.id);
      const [formulas, inputs] = await Promise.all([
        getKpiFormulas(),
        getProjectInputs(project.id),
      ]);
      if (inputs && formulas.length > 0) {
        await calculateAndStoreKpiOutputs(project.id, inputs, formulas, project);
      }
    });
  };

  const handleReject = (project: Project) => {
    if (!rejectionReason.trim()) return;
    withErrorHandling(project.id, async () => {
      await updateProjectStatus(project.id, 'rejected', undefined, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
    });
  };

  const handleReturnToDraft = (project: Project) => {
    withErrorHandling(project.id, async () => {
      await updateProjectStatus(project.id, 'draft');
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const section = (title: string, projects: Project[], renderActions: (p: Project) => React.ReactNode) => (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {projects.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg mb-4">
          None.
        </div>
      )}
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {errors[project.id] && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">
              {errors[project.id]}
            </p>
          )}
          {renderActions(project)}
        </ProjectCard>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review submitted projects through the approval pipeline.
        </p>
      </div>

      {section('Review Queue', submitted, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => handleStartReview(project)} disabled={processing === project.id}>
            {processing === project.id ? 'Starting...' : 'Start Review'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleReturnToDraft(project)} disabled={processing === project.id}>
            Send Back to Draft
          </Button>
        </div>
      ))}

      {section('Under Review', underReview, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => handleApprove(project)} disabled={processing === project.id}>
            {processing === project.id ? 'Approving...' : 'Approve'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setRejectingId(project.id); setRejectionReason(''); }} disabled={processing === project.id}>
            Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleReturnToDraft(project)} disabled={processing === project.id}>
            Send Back to Draft
          </Button>
        </div>
      ))}

      {rejectingId && (
        <div className="max-w-xl mx-auto space-y-2 border border-red-200 rounded-lg p-4 bg-red-50 -mt-4 mb-4">
          <p className="text-sm font-medium text-red-700">Rejection reason for this project:</p>
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this project is being rejected..."
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => handleReject(underReview.find(p => p.id === rejectingId) ?? submitted.find(p => p.id === rejectingId)!)} disabled={processing === rejectingId || !rejectionReason.trim()}>
              {processing === rejectingId ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectionReason(''); }} disabled={processing === rejectingId}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {section('Approved Projects', approved, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => handleReturnToDraft(project)} disabled={processing === project.id}>
            {processing === project.id ? 'Reverting...' : 'Revert to Draft'}
          </Button>
        </div>
      ))}

      {section('Rejected Projects', rejected, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => handleReturnToDraft(project)} disabled={processing === project.id}>
            Send Back to Draft
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ApprovalsContent />
    </RoleGuard>
  );
}
