import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';
import { checkAuthenticationLimits, clearAuthenticationLimits } from '@/lib/security-rate-limit';
import { noStoreJson } from '@/lib/request-security';
import { authCredentialsSchema, signupCredentialsSchema, validateInput } from '@/lib/validations';
import { resolveAuthUser } from '@/lib/auth';

function getAuthConfiguration() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Authentication provider is not configured');
  return { url, key };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const isSignUp = request.nextUrl.searchParams.get('signup') === '1';
    const validation = validateInput(isSignUp ? signupCredentialsSchema : authCredentialsSchema, body);
    if (!validation.success) {
      return noStoreJson({ error: 'Valid email and password are required' }, { status: 400 });
    }

    const { email, password } = validation.data;
    if (isSignUp && process.env.ALLOW_PUBLIC_SIGNUP !== 'true') {
      return noStoreJson({ error: 'Account registration is managed by an administrator' }, { status: 403 });
    }

    const limited = await checkAuthenticationLimits(request, email);
    if (limited.response) return limited.response;

    const { url, key } = getAuthConfiguration();
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      return noStoreJson({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (!result.data.session) {
      return noStoreJson({
        success: true,
        message: 'Check your email to confirm the account before signing in.',
      });
    }

    const authUser = await resolveAuthUser(result.data.session.access_token);
    if (!authUser) {
      return noStoreJson({ error: 'Your account profile is unavailable. Contact an administrator.' }, { status: 403 });
    }

    await clearAuthenticationLimits(limited.keys);
    const response = noStoreJson({ success: true });
    setSessionCookies(response, result.data.session, process.env.NODE_ENV === 'production');
    return response;
  } catch {
    return noStoreJson({ error: 'Authentication is temporarily unavailable' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = noStoreJson({ success: true });
  clearSessionCookies(response);
  return response;
}
