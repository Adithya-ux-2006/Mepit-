import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

function serializeCookie(name: string, value: string, opts: { httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; path?: string; maxAge?: number }): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (opts.httpOnly) cookie += '; HttpOnly';
  if (opts.secure) cookie += '; Secure';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  if (typeof opts.maxAge === 'number') cookie += `; Max-Age=${opts.maxAge}`;
  return cookie;
}

function setSessionCookies(headers: Headers, accessToken: string, refreshToken?: string | undefined): void {
  const secure = process.env.NODE_ENV === 'production';
  headers.append('Set-Cookie', serializeCookie('__session', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  }));
  if (refreshToken) {
    headers.append('Set-Cookie', serializeCookie('__refresh', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    }));
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const parsed = cookieHeader.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const eq = c.indexOf('=');
      return eq === -1 ? [c, ''] : [decodeURIComponent(c.slice(0, eq)).trim(), decodeURIComponent(c.slice(eq + 1))];
    });
    // Reverse so last occurrence of a duplicate name wins (handles old path=/api auth + new path=/ coexistence)
    const cookies = Object.fromEntries(parsed.reverse());
    const refreshToken = cookies['__refresh'];

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const failHeaders = new Headers({ 'Content-Type': 'application/json' });
      failHeaders.append('Set-Cookie', serializeCookie('__session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 }));
      failHeaders.append('Set-Cookie', serializeCookie('__refresh', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 }));
      return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: failHeaders });
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    setSessionCookies(headers, data.session.access_token, data.session.refresh_token);

    return new Response(JSON.stringify({ success: true, uid: data.user?.id }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Session refresh unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session refresh' }, { status: 500 });
  }
}
