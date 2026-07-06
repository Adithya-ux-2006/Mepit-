import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const parsed = cookieHeader.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const eq = c.indexOf('=');
      return eq === -1 ? [c, ''] : [decodeURIComponent(c.slice(0, eq)).trim(), decodeURIComponent(c.slice(eq + 1))];
    });
    const cookies = Object.fromEntries(parsed.reverse());
    const refreshToken = cookies['__refresh'];

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const isProd = process.env.NODE_ENV === 'production';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ success: true, uid: data.user?.id });
    setSessionCookies(response, data.session, isProd);
    return response;
  } catch (err) {
    console.error('Session refresh unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session refresh' }, { status: 500 });
  }
}
