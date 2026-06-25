'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/layout/role-guard';
import { getProjectsByStatus, updateProjectStatus, createAuditLog, getProjectInputs, getKpiFormulas, calculateAndStoreKpiOutputs } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Project, ProjectInputs } from '@/types';

function ApprovalsContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<ProjectInputs | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPending = () => {
    setLoading(true);
    Promise.all([
      getProjectsByStatus('submitted'),
      getProjectsByStatus('under_review'),
    ])
      .then(([submitted, underReview]) => {
        setProjects([...submitted, ...underReview]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTimeout(fetchPending, 0); }, []);

  const handleReview = async (project: Project) => {
    setReviewingId(project.id);
    setComment('');
    await updateProjectStatus(project.id, 'under_review');
    const inp = await getProjectInputs(project.id);
    setInputs(inp);
    fetchPending();
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      await updateProjectStatus(id, 'approved', user.id);
      await createAuditLog({
        entity_type: 'project',
        entity_id: id,
        action: 'approved',
        performed_by: user.id,
        metadata: { comment },
      });

      // Run formula engine
      const project = projects.find((p) => p.id === id);
      const inp = inputs ?? await getProjectInputs(id);
      if (project && inp) {
        const formulas = await getKpiFormulas();
        await calculateAndStoreKpiOutputs(id, inp, formulas, project);
      }

      setReviewingId(null);
      setInputs(null);
      setComment('');
      fetchPending();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      await updateProjectStatus(id, 'draft');
      await createAuditLog({
        entity_type: 'project',
        entity_id: id,
        action: 'rejected',
        performed_by: user.id,
        metadata: { comment },
      });
      setReviewingId(null);
      setInputs(null);
      setComment('');
      fetchPending();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve submitted projects.
        </p>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No projects pending review.
        </div>
      )}

      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{project.project_name}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                project.status === 'under_review' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
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

            {reviewingId === project.id && (
              <div className="space-y-3 border-t border-border pt-3 mt-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Review Comment</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="text-sm"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(project.id)} disabled={processing}>
                    {processing ? 'Processing...' : 'Approve & Calculate KPIs'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(project.id)} disabled={processing}>
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {reviewingId !== project.id && (
              <Button size="sm" variant="outline" onClick={() => handleReview(project)}>
                Start Review
              </Button>
            )}
          </CardContent>
        </Card>
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
