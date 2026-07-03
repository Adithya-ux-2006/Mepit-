import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.read);
  if (blocked) return blocked;

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Fetch full user record
  const { data: user, error } = await admin
    .from('users')
    .select('*')
    .eq('email', authUser.email)
    .single();

  if (error || !user) {
    // User doesn't exist yet — create them (first login after session cookie was set)
    const { data: newUser, error: createError } = await admin
      .from('users')
      .insert({ email: authUser.email, name: '', role: 'contributor' })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    return NextResponse.json(newUser);
  }

  return NextResponse.json(user);
}
