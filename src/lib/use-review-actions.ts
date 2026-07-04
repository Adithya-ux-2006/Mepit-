'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateProjectStatus, getKpiFormulas, getProjectInputs, calculateAndStoreKpiOutputs } from '@/lib/api';
import type { Project } from '@/types';

export interface ReviewState {
  processing: string | null;
  error: string | null;
  rejectingId: string | null;
  rejectionReason: string;
  returningId: string | null;
  returnReason: string;
}

export interface ReviewActions {
  processing: string | null;
  error: string | null;
  rejectingId: string | null;
  rejectionReason: string;
  returningId: string | null;
  returnReason: string;
  startReview: (project: Project) => Promise<boolean>;
  approve: (project: Project) => Promise<boolean>;
  reject: (project: Project) => Promise<boolean>;
  returnToDraft: (project: Project) => Promise<boolean>;
  setRejectingId: (id: string | null) => void;
  setRejectionReason: (reason: string) => void;
  setReturningId: (id: string | null) => void;
  setReturnReason: (reason: string) => void;
  clearError: () => void;
}

export function useReviewActions(onSuccess?: () => void): ReviewActions {
  const { user } = useAuth();
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const clearError = useCallback(() => setError(null), []);

  const wrap = useCallback(async (projectId: string, fn: () => Promise<void>): Promise<boolean> => {
    if (!user) return false;
    setProcessing(projectId);
    setError(null);
    try {
      await fn();
      setProcessing(null);
      onSuccess?.();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setError(message);
      setProcessing(null);
      return false;
    }
  }, [user, onSuccess]);

  const startReview = useCallback(async (project: Project): Promise<boolean> => {
    return wrap(project.id, async () => {
      await updateProjectStatus(project.id, 'under_review');
    });
  }, [wrap]);

  const approve = useCallback(async (project: Project): Promise<boolean> => {
    return wrap(project.id, async () => {
      await updateProjectStatus(project.id, 'approved', user!.id);
      const [formulas, inputs] = await Promise.all([
        getKpiFormulas(),
        getProjectInputs(project.id),
      ]);
      if (inputs && formulas.length > 0) {
        await calculateAndStoreKpiOutputs(project.id, inputs, formulas, project);
      }
    });
  }, [wrap, user]);

  const reject = useCallback(async (project: Project): Promise<boolean> => {
    if (!rejectionReason.trim()) return false;
    return wrap(project.id, async () => {
      await updateProjectStatus(project.id, 'rejected', undefined, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
    });
  }, [wrap, rejectionReason]);

  const returnToDraft = useCallback(async (project: Project): Promise<boolean> => {
    return wrap(project.id, async () => {
      await updateProjectStatus(project.id, 'draft', undefined, returnReason.trim() || undefined);
      setReturningId(null);
      setReturnReason('');
    });
  }, [wrap, returnReason]);

  return {
    processing,
    error,
    rejectingId,
    rejectionReason,
    returningId,
    returnReason,
    startReview,
    approve,
    reject,
    returnToDraft,
    setRejectingId,
    setRejectionReason,
    setReturningId,
    setReturnReason,
    clearError,
  };
}
