import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    id: authUser.dbUserId,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    created_at: authUser.createdAt,
  });
}
