import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const authUser = await getAuthUser(request);
  if (!authUser) {
    console.error('/api/users/me: getAuthUser returned null');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: user, error } = await admin
    .from('users')
    .select('*')
    .eq('id', authUser.dbUserId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
