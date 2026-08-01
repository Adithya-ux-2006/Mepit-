import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';
import { checkRefreshLimit } from '@/lib/security-rate-limit';
import { noStoreJson } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  try {
    const limited = await checkRefreshLimit(request);
    if (limited) return limited;

    const refreshToken = request.cookies.get('__refresh')?.value;
    if (!refreshToken) return noStoreJson({ error: 'Session expired' }, { status: 401 });

    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Authentication provider is not configured');

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const response = noStoreJson({ error: 'Session expired' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const response = noStoreJson({ success: true });
    setSessionCookies(response, data.session, process.env.NODE_ENV === 'production');
    return response;
  } catch {
    return noStoreJson({ error: 'Session refresh is temporarily unavailable' }, { status: 500 });
  }
}
