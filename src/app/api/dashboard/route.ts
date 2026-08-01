import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { loadDashboardData } from '@/lib/dashboard-data';
import { noStoreJson, sanitizeDatabaseError } from '@/lib/request-security';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;
  const [user, authError] = await requireAuth(request);
  if (authError) return authError;
  try {
    return noStoreJson(await loadDashboardData(user));
  } catch (error) {
    return sanitizeDatabaseError('Load dashboard', error);
  }
}
