import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getRateLimitStatus } from '@/lib/rate-limit';

/**
 * GET /api/rate-limit/status
 *
 * Admin-only endpoint that returns a snapshot of the current
 * in-memory rate limit store. Useful for monitoring which IPs
 * are hitting limits and overall throttling state.
 *
 * NOTE: On Vercel serverless, this shows the state of ONE function
 * instance. With Upstash Redis, it would show global state.
 */
export async function GET(request: NextRequest) {
  const [user, error] = await requireAdmin(request);
  if (error) return error;

  const status = getRateLimitStatus(20);
  return NextResponse.json(status);
}
