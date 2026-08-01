import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

interface DatabaseUser {
  id: string;
  name: string;
  role: string;
  created_at: string;
  auth_user_id?: string | null;
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

export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const sessionCookie = request
      ? request.cookies.get('__session')?.value
      : (await cookies()).get('__session')?.value;
    if (!sessionCookie) return null;

    const admin = getSupabaseAdmin();
    const { data: claimData, error: verifyError } = await admin.auth.getClaims(sessionCookie);
    const uid = claimData?.claims.sub;
    const email = claimData?.claims.email;
    const assuranceLevel = typeof claimData?.claims.aal === 'string' ? claimData.claims.aal : 'aal1';
    if (verifyError || !uid || typeof email !== 'string') return null;

    const initialLookup = await admin.from('users')
      .select('id, name, role, created_at, auth_user_id').eq('auth_user_id', uid).maybeSingle();
    let dbUser: DatabaseUser | null = initialLookup.data;
    let dbError = initialLookup.error;
    if (dbError?.code === '42703') {
      const legacy = await admin.from('users').select('id, name, role, created_at').eq('email', email).maybeSingle();
      dbUser = legacy.data;
      dbError = legacy.error;
    }
    if (dbError) return null;

    if (!dbUser) {
      const legacy = await admin.from('users').select('id, name, role, created_at, auth_user_id').eq('email', email).maybeSingle();
      if (legacy.error && legacy.error.code !== '42703') return null;
      if (legacy.data) {
        const linked = await admin.from('users').update({ auth_user_id: uid }).eq('id', legacy.data.id)
          .select('id, name, role, created_at').single();
        if (linked.error) return null;
        dbUser = linked.data;
      }
    }

    if (!dbUser) {
      const created = await admin.from('users').insert({
        auth_user_id: uid, email, name: '', role: 'contributor',
      }).select('id, name, role, created_at').single();
      if (created.error || !created.data) return null;
      dbUser = created.data;
    }

    if (dbUser.role !== 'contributor' && dbUser.role !== 'admin') return null;
    return {
      uid, email, role: dbUser.role, dbUserId: dbUser.id,
      name: dbUser.name, createdAt: dbUser.created_at, assuranceLevel,
    };
  } catch {
    return null;
  }
}

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
