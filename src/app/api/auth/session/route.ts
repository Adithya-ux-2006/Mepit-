import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

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
  // Delete the old-scoped __refresh cookie if it exists
  headers.append('Set-Cookie', serializeCookie('__refresh', '', {
    path: '/api/auth',
    maxAge: 0,
  }));
}

function clearSessionCookies(headers: Headers): void {
  const secure = process.env.NODE_ENV === 'production';
  headers.append('Set-Cookie', serializeCookie('__session', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
  headers.append('Set-Cookie', serializeCookie('__refresh', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
  headers.append('Set-Cookie', serializeCookie('__refresh', '', {
    path: '/api/auth',
    maxAge: 0,
  }));
}

export async function POST(request: Request) {
  try {
    const blocked = rateLimitResponse(request, rateLimits.auth);
    if (blocked) return blocked;

    let email: string | undefined;
    let password: string | undefined;
    const isSignUp = new URL(request.url).searchParams.get('signup') === '1';
    try {
      const body = await request.json();
      email = body?.email;
      password = body?.password;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let sessionToken: string | undefined;
    let refreshToken: string | undefined;
    let userId: string | undefined;

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data.session) {
        return NextResponse.json({
          error: 'Account created. Please check your email for a confirmation link before signing in.',
        }, { status: 200 });
      }
      sessionToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      userId = data.user?.id;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : error.message;
        return NextResponse.json({ error: message }, { status: 401 });
      }
      sessionToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      userId = data.user?.id;
    }

    if (!sessionToken) {
      return NextResponse.json({ error: 'Failed to obtain session token' }, { status: 500 });
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    setSessionCookies(headers, sessionToken, refreshToken);

    return new Response(JSON.stringify({ success: true, uid: userId }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Session POST unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session creation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = rateLimitResponse(request, rateLimits.logout);
  if (blocked) return blocked;

  const headers = new Headers({ 'Content-Type': 'application/json' });
  clearSessionCookies(headers);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
