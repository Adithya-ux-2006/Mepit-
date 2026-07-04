import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface AuthUser {
  uid: string;
  email: string;
  role: 'contributor' | 'admin';
  dbUserId: string;
}

export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = request
      ? request.cookies.get('__session')?.value
      : cookieStore.get('__session')?.value;

    if (!sessionCookie) return null;

    const admin = getSupabaseAdmin();
    const { data: { user: supabaseUser }, error: verifyError } = await admin.auth.getUser(sessionCookie);
    if (verifyError || !supabaseUser || !supabaseUser.email) return null;

    const { data: existingUser, error: dbError } = await admin
      .from('users')
      .select('id, role')
      .eq('email', supabaseUser.email)
      .maybeSingle();

    if (dbError) return null;

    let dbUser = existingUser;
    if (!dbUser) {
      const { data: newUser, error: createError } = await admin
        .from('users')
        .insert({ email: supabaseUser.email, name: '', role: 'contributor' })
        .select('id, role')
        .single();

      if (createError || !newUser) return null;
      dbUser = newUser;
    }

    return {
      uid: supabaseUser.id,
      email: supabaseUser.email,
      role: dbUser.role as 'contributor' | 'admin',
      dbUserId: dbUser.id,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns [user, null] on success or [null, Response] on failure.
 */
export async function requireAuth(
  request: NextRequest,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const user = await getAuthUser(request);
  if (!user) {
    return [null, NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
  }
  return [user, null];
}

/**
 * Require admin role. Returns [user, null] on success or [null, Response] on failure.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const [user, error] = await requireAuth(request);
  if (error) return [null, error];
  if (user!.role !== 'admin') {
    return [null, NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })];
  }
  return [user!, null];
}
