'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/role-guard';
import { getProjectsByStatus } from '@/lib/api';
import { useReviewActions } from '@/lib/use-review-actions';
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
  const router = useRouter();
  const [submitted, setSubmitted] = useState<Project[]>([]);
  const [underReview, setUnderReview] = useState<Project[]>([]);
  const [approved, setApproved] = useState<Project[]>([]);
  const [rejected, setRejected] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setListError(null);
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
      .catch(() => setListError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setTimeout(fetchData, 0); }, [fetchData]);

  const onActionSuccess = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const actions = useReviewActions(onActionSuccess);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const errorBanner = (msg: string | null) =>
    msg ? <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</div> : null;

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

      {errorBanner(listError)}
      {errorBanner(actions.error)}

      {section('Review Queue', submitted, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => actions.startReview(project).then((ok) => { if (ok) router.push(`/board2/repository/${project.id}`); })} disabled={actions.processing === project.id}>
            {actions.processing === project.id ? 'Starting...' : 'Start Review'}
          </Button>
          {actions.returningId === project.id ? (
            <ReturnToDraftInput
              reason={actions.returnReason}
              onReasonChange={actions.setReturnReason}
              onConfirm={() => actions.returnToDraft(project)}
              onCancel={() => { actions.setReturningId(null); actions.setReturnReason(''); }}
              processing={actions.processing === project.id}
            />
          ) : (
            <Button size="sm" variant="ghost" onClick={() => actions.setReturningId(project.id)} disabled={actions.processing === project.id}>
              Send Back to Draft
            </Button>
          )}
        </div>
      ))}

      {section('Under Review', underReview, (project) => (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => actions.approve(project)} disabled={actions.processing === project.id}>
            {actions.processing === project.id ? 'Approving...' : 'Approve'}
          </Button>
          {actions.rejectingId === project.id ? (
            <RejectInput
              reason={actions.rejectionReason}
              onReasonChange={actions.setRejectionReason}
              onConfirm={() => actions.reject(project)}
              onCancel={() => { actions.setRejectingId(null); actions.setRejectionReason(''); }}
              processing={actions.processing === project.id}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={() => { actions.setRejectingId(project.id); actions.setRejectionReason(''); }} disabled={actions.processing === project.id}>
              Reject
            </Button>
          )}
          {actions.returningId === project.id ? (
            <ReturnToDraftInput
              reason={actions.returnReason}
              onReasonChange={actions.setReturnReason}
              onConfirm={() => actions.returnToDraft(project)}
              onCancel={() => { actions.setReturningId(null); actions.setReturnReason(''); }}
              processing={actions.processing === project.id}
            />
          ) : (
            <Button size="sm" variant="ghost" onClick={() => actions.setReturningId(project.id)} disabled={actions.processing === project.id}>
              Send Back to Draft
            </Button>
          )}
          <Button size="sm" variant="link" onClick={() => router.push(`/board2/repository/${project.id}`)}>
            View Details
          </Button>
        </div>
      ))}

      {section('Approved Projects', approved, (project) => (
        <div className="flex gap-2 pt-2">
          {actions.returningId === project.id ? (
            <ReturnToDraftInput
              reason={actions.returnReason}
              onReasonChange={actions.setReturnReason}
              onConfirm={() => actions.returnToDraft(project)}
              onCancel={() => { actions.setReturningId(null); actions.setReturnReason(''); }}
              processing={actions.processing === project.id}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={() => actions.setReturningId(project.id)} disabled={actions.processing === project.id}>
              {actions.processing === project.id ? 'Reverting...' : 'Revert to Draft'}
            </Button>
          )}
        </div>
      ))}

      {section('Rejected Projects', rejected, (project) => (
        <div className="flex gap-2 pt-2">
          {actions.returningId === project.id ? (
            <ReturnToDraftInput
              reason={actions.returnReason}
              onReasonChange={actions.setReturnReason}
              onConfirm={() => actions.returnToDraft(project)}
              onCancel={() => { actions.setReturningId(null); actions.setReturnReason(''); }}
              processing={actions.processing === project.id}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={() => actions.setReturningId(project.id)} disabled={actions.processing === project.id}>
              Send Back to Draft
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function RejectInput({
  reason, onReasonChange, onConfirm, onCancel, processing,
}: {
  reason: string; onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; processing: boolean;
}) {
  return (
    <div className="space-y-2 pt-2 border-t w-full">
      <p className="text-xs font-medium text-red-600">Rejection reason:</p>
      <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Explain why this project is being rejected..." className="h-8 text-sm" autoFocus />
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={onConfirm} disabled={processing || !reason.trim()}>
          {processing ? 'Rejecting...' : 'Confirm Reject'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
      </div>
    </div>
  );
}

function ReturnToDraftInput({
  reason, onReasonChange, onConfirm, onCancel, processing,
}: {
  reason: string; onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; processing: boolean;
}) {
  return (
    <div className="space-y-2 pt-2 border-t w-full">
      <p className="text-xs font-medium text-muted-foreground">Reason for returning (visible to contributor):</p>
      <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="What needs to be fixed?" className="h-8 text-sm" autoFocus />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onConfirm} disabled={processing}>
          {processing ? 'Sending...' : 'Confirm Send to Draft'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={processing}>Cancel</Button>
      </div>
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
