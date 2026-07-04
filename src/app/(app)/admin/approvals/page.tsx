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

function ApprovalsContent() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState<Project[]>([]);
  const [approved, setApproved] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      getProjectsByStatus('submitted'),
      getProjectsByStatus('approved'),
    ])
      .then(([sub, app]) => {
        setSubmitted(sub);
        setApproved(app);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setTimeout(fetchData, 0); }, [fetchData]);

  const handleApprove = async (project: Project) => {
    if (!user) return;
    setProcessing(project.id);
    try {
      await updateProjectStatus(project.id, 'approved', user.id);

      const [formulas, inputs] = await Promise.all([
        getKpiFormulas(),
        getProjectInputs(project.id),
      ]);
      if (inputs && formulas.length > 0) {
        await calculateAndStoreKpiOutputs(project.id, inputs, formulas, project);
      }

      setProcessing(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setProcessing(null);
    }
  };

  const handleReject = async (project: Project) => {
    if (!user || !rejectionReason.trim()) return;
    setProcessing(project.id);
    try {
      await updateProjectStatus(project.id, 'rejected', undefined, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      setProcessing(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setProcessing(null);
    }
  };

  const handleRevertToDraft = async (project: Project) => {
    if (!user) return;
    setProcessing(project.id);
    try {
      await updateProjectStatus(project.id, 'draft');
      setProcessing(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setProcessing(null);
    }
  };

  const handleRevertApproved = async (project: Project) => {
    if (!user) return;
    setProcessing(project.id);
    try {
      await updateProjectStatus(project.id, 'draft');
      setProcessing(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setProcessing(null);
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
          Review submitted projects and manage the approval queue.
        </p>
      </div>

      {/* Review Queue */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Review Queue</h2>
        {submitted.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
            No pending submissions.
          </div>
        )}
        {submitted.map((project) => (
          <Card key={project.id} className="mb-4 border-amber-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{project.project_name}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                  submitted
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

              {rejectingId === project.id ? (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-red-600">Rejection reason:</p>
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this project is being rejected..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(project)}
                      disabled={processing === project.id || !rejectionReason.trim()}
                    >
                      {processing === project.id ? 'Rejecting...' : 'Confirm Reject'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                      disabled={processing === project.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(project)}
                    disabled={processing === project.id}
                  >
                    {processing === project.id ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setRejectingId(project.id); setRejectionReason(''); }}
                    disabled={processing === project.id}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevertToDraft(project)}
                    disabled={processing === project.id}
                  >
                    Send Back to Draft
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approved Projects */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Approved Projects</h2>
        {approved.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
            No approved projects yet.
          </div>
        )}
        {approved.map((project) => (
          <Card key={project.id} className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{project.project_name}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-50 text-green-700">
                  approved
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRevertApproved(project)}
                disabled={processing === project.id}
              >
                {processing === project.id ? 'Reverting...' : 'Revert to Draft'}
              </Button>
            </CardContent>
          </Card>
        ))}
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
