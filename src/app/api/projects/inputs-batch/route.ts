import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { canReadProject } from '@/lib/project-access';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

const requestSchema = z.object({ projectIds: z.array(z.string().uuid()).min(1).max(50) }).strict();

export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: 'One to fifty valid project IDs are required' }, { status: 400 });

  const projectIds = [...new Set(parsed.data.projectIds)];
  const admin = getSupabaseAdmin();
  const { data: projects, error: projectsError } = await admin
    .from('projects').select('id, submitted_by, status').in('id', projectIds);
  if (projectsError) return sanitizeDatabaseError('Authorize project input batch', projectsError);
  const readableIds = (projects ?? []).filter((project) => canReadProject(user, project)).map((project) => project.id);
  if (!readableIds.length) return noStoreJson({});

  const { data, error } = await admin.from('project_inputs').select('*').in('project_id', readableIds);
  if (error) return sanitizeDatabaseError('Read project input batch', error);
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.project_id] = row;
  return noStoreJson(map);
}
