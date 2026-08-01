import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { evaluateValidationRules, getRequiredValidationErrors } from '@/lib/validation-engine';
import type { ProjectStatus } from '@/types';

const VALID_STATUSES: ProjectStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];

function isValidTransition(current: ProjectStatus, next: ProjectStatus): boolean {
  const allowed: Record<ProjectStatus, ProjectStatus[]> = {
    draft: ['submitted'],
    submitted: ['draft', 'under_review', 'rejected'],
    under_review: ['approved', 'rejected', 'draft'],
    approved: ['draft'],
    rejected: ['draft'],
  };
  return allowed[current]?.includes(next) ?? false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [user, initialAuthError] = await requireAuth(request);
  if (initialAuthError) return initialAuthError;

  const { id } = await params;
  const body = await request.json();
  const { status: rawStatus, rejection_reason } = body as { status?: string; rejection_reason?: string };
  if (rejection_reason && (typeof rejection_reason !== 'string' || rejection_reason.length > 1000)) {
    return NextResponse.json({ error: 'Invalid rejection reason' }, { status: 400 });
  }

  if (!rawStatus || !VALID_STATUSES.includes(rawStatus as ProjectStatus)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  const nextStatus = rawStatus as ProjectStatus;
  const admin = getSupabaseAdmin();

  // Fetch current project
  const { data: project, error: fetchError } = await admin
    .from('projects')
    .select('status, submitted_by')
    .eq('id', id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const currentStatus = project.status as ProjectStatus;

  if (!isValidTransition(currentStatus, nextStatus)) {
    return NextResponse.json({
      error: `Cannot transition from '${currentStatus}' to '${nextStatus}'`,
    }, { status: 400 });
  }

  if (nextStatus === 'submitted') {
    const [projectFieldsResult, projectInputsResult, rulesResult] = await Promise.all([
      admin
        .from('projects')
        .select('project_name, typology, built_up_area, carpet_area, saleable_area, leasable_area')
        .eq('id', id)
        .single(),
      admin.from('project_inputs').select('*').eq('project_id', id).single(),
      admin.from('validation_rules').select('*').eq('is_active', true),
    ]);

    if (projectFieldsResult.error || !projectFieldsResult.data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (rulesResult.error) {
      return NextResponse.json({ error: rulesResult.error.message }, { status: 500 });
    }

    const formData: Record<string, unknown> = {
      ...projectFieldsResult.data,
      ...((projectInputsResult.error || !projectInputsResult.data)
        ? {}
        : projectInputsResult.data),
    };

    const requiredErrors = getRequiredValidationErrors(
      evaluateValidationRules(formData, rulesResult.data ?? []),
    );

    if (requiredErrors.length > 0) {
      return NextResponse.json(
        { error: 'Required design parameters are missing', validation_errors: requiredErrors },
        { status: 400 },
      );
    }
  }

  // Authorization check
  const isContributorAction = (
    currentStatus === 'draft' && nextStatus === 'submitted'
  ) || (
    currentStatus === 'submitted' && nextStatus === 'draft'
  ) || (
    currentStatus === 'rejected' && nextStatus === 'draft'
  );

  if (isContributorAction) {
    // Contributor can only move their own project
    // Check ownership via the project DB lookup we already did
    if (project.submitted_by !== user.dbUserId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    // All other transitions (under_review, approved, rejected, admin revert)
    // require admin role
    const [, authError] = await requireAdmin(request);
    if (authError) return authError;
  }

  // Build the update payload
  const update: Record<string, unknown> = { status: nextStatus };
  const actorId = user.dbUserId;

  if (nextStatus === 'approved') {
    update.approved_at = new Date().toISOString();
    update.approved_by = actorId;
  }

  if (nextStatus === 'rejected') {
    update.approved_at = null;
    update.approved_by = null;
  }

  if (nextStatus === 'draft' && rejection_reason) {
    // Send-back-to-draft with a reason stored in rejection_reason
    update.rejection_reason = rejection_reason;
  }

  if (nextStatus === 'rejected' && rejection_reason) {
    update.rejection_reason = rejection_reason;
  }

  // Try the update; if the rejection_reason column doesn't exist yet,
  // remove it from the payload and retry
  const tryUpdate = (payload: Record<string, unknown>) =>
    admin.from('projects').update(payload).eq('id', id);

  let { error: dbError } = await tryUpdate(update);

  if (dbError && dbError.message.includes('rejection_reason') && dbError.message.includes('column')) {
    const fallback = { ...update };
    delete fallback.rejection_reason;
    dbError = (await tryUpdate(fallback)).error;
  }

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Audit log
  const auditAction = nextStatus === 'under_review' ? 'review_started' : nextStatus;
  const { error: auditError } = await admin
    .from('audit_log')
    .insert({
      entity_type: 'project',
      entity_id: id,
      action: auditAction,
      performed_by: actorId,
      metadata: { previous_status: currentStatus },
    });

  if (auditError) {
    console.error('Failed to write audit log for status transition:', auditError);
  }

  return NextResponse.json({ success: true, previous_status: currentStatus });
}
