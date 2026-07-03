/**
 * Server-side Authentication Helper — Grüne Platform
 *
 * Verifies Firebase ID tokens from the __session cookie and resolves
 * the user's role from the Supabase users table. Used by all API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyIdToken } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface AuthUser {
  uid: string;
  email: string;
  role: 'contributor' | 'admin';
  dbUserId: string;
}

/**
 * Verify the session cookie and return the authenticated user, or null.
 */
export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = request
      ? request.cookies.get('__session')?.value
      : cookieStore.get('__session')?.value;

    if (!sessionCookie) return null;

    const decoded = await verifyIdToken(sessionCookie);
    if (!decoded || !decoded.email) return null;

    // Look up the user in our database to get their role
    const admin = getSupabaseAdmin();
    const { data: user, error } = await admin
      .from('users')
      .select('id, role')
      .eq('email', decoded.email)
      .single();

    if (error || !user) return null;

    return {
      uid: decoded.uid,
      email: decoded.email,
      role: user.role,
      dbUserId: user.id,
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
