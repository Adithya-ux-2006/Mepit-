import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-server';

interface DatabaseUser {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  role: 'contributor' | 'admin';
  dbUserId: string;
  name: string;
  createdAt: string;
  assuranceLevel: string;
}

let authUserIdSchemaAvailable: boolean | null = null;

function isMissingAuthUserIdSchema(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === '42703' || candidate.code === 'PGRST204'
    || candidate.message?.includes('auth_user_id') === true;
}

async function findOrCreateDatabaseUser(uid: string, email: string): Promise<DatabaseUser | null> {
  const admin = getSupabaseAdmin();
  if (authUserIdSchemaAvailable !== false) {
    const byAuthId = await admin.from('users')
      .select('id, name, role, created_at').eq('auth_user_id', uid).maybeSingle();
    if (byAuthId.data) {
      authUserIdSchemaAvailable = true;
      return byAuthId.data;
    }
    authUserIdSchemaAvailable = isMissingAuthUserIdSchema(byAuthId.error) ? false : true;
  }

  // Email is taken only from the verified Supabase token. This fallback keeps
  // existing installations usable until migration 012 has been applied.
  const byEmail = await admin.from('users')
    .select('id, name, role, created_at').eq('email', email).maybeSingle();
  if (byEmail.error) return null;
  if (byEmail.data) {
    if (authUserIdSchemaAvailable) {
      await admin.from('users').update({ auth_user_id: uid }).eq('id', byEmail.data.id);
    }
    return byEmail.data;
  }

  const profile = { email, name: '', role: 'contributor' as const };
  const created = await admin.from('users').insert({ ...profile, auth_user_id: uid })
    .select('id, name, role, created_at').single();
  if (created.data) return created.data;

  // Pre-migration fallback. A concurrent insert may also have created the row,
  // so re-read by verified email before failing the session.
  const legacyCreated = await admin.from('users').insert(profile)
    .select('id, name, role, created_at').single();
  if (legacyCreated.data) return legacyCreated.data;
  const concurrent = await admin.from('users')
    .select('id, name, role, created_at').eq('email', email).maybeSingle();
  return concurrent.data ?? null;
}

export async function resolveAuthUser(accessToken: string): Promise<AuthUser | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data: claimData, error: verifyError } = await admin.auth.getClaims(accessToken);
    const uid = claimData?.claims.sub;
    const email = claimData?.claims.email;
    const assuranceLevel = typeof claimData?.claims.aal === 'string' ? claimData.claims.aal : 'aal1';
    if (verifyError || !uid || typeof email !== 'string') return null;

    const dbUser = await findOrCreateDatabaseUser(uid, email);
    if (!dbUser || (dbUser.role !== 'contributor' && dbUser.role !== 'admin')) return null;
    return {
      uid,
      email,
      role: dbUser.role,
      dbUserId: dbUser.id,
      name: dbUser.name,
      createdAt: dbUser.created_at,
      assuranceLevel,
    };
  } catch {
    return null;
  }
}

async function getAuthUserUncached(request?: NextRequest): Promise<AuthUser | null> {
  const sessionCookie = request
    ? request.cookies.get('__session')?.value
    : (await cookies()).get('__session')?.value;
  return sessionCookie ? resolveAuthUser(sessionCookie) : null;
}

export const getAuthUser = cache(getAuthUserUncached);

export async function requireAuth(request: NextRequest): Promise<[AuthUser, null] | [null, NextResponse]> {
  const user = await getAuthUser(request);
  if (!user) return [null, NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
  return [user, null];
}

export async function requireAdmin(request: NextRequest): Promise<[AuthUser, null] | [null, NextResponse]> {
  const [user, error] = await requireAuth(request);
  if (error) return [null, error];
  if (user.role !== 'admin') return [null, NextResponse.json({ error: 'Forbidden' }, { status: 403 })];
  if (process.env.REQUIRE_ADMIN_MFA === 'true' && user.assuranceLevel !== 'aal2') {
    return [null, NextResponse.json({ error: 'Multi-factor authentication required' }, { status: 403 })];
  }
  return [user, null];
}
