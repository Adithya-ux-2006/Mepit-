'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/layout/role-guard';
import { getProjectsByStatus, updateProjectStatus, createAuditLog } from '@/lib/services';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Project } from '@/types';

function ApprovalsContent() {
  const { user } = useAuth();
  const [approved, setApproved] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getProjectsByStatus('approved')
      .then(setApproved)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTimeout(fetchData, 0); }, []);

  const handleRevert = async (project: Project) => {
    if (!user) return;
    setProcessing(true);
    try {
      await updateProjectStatus(project.id, 'draft');
      await createAuditLog({
        entity_type: 'project',
        entity_id: project.id,
        action: 'reverted_to_draft',
        performed_by: user.id,
        metadata: { previous_status: 'approved' },
      });
      setConfirmId(null);
      fetchData();
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
        <h1 className="text-2xl font-semibold tracking-tight">Oversight</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projects are auto-approved on submission. Use this page to review and revert if needed.
        </p>
      </div>

      {approved.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No approved projects yet.
        </div>
      )}

      {approved.map((project) => (
        <Card key={project.id}>
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

            {confirmId === project.id ? (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="destructive" onClick={() => handleRevert(project)} disabled={processing}>
                  {processing ? 'Reverting...' : 'Confirm Revert to Draft'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmId(null)} disabled={processing}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmId(project.id)}>
                Revert to Draft
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
