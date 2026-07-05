import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const isProd = process.env.NODE_ENV === 'production';

    const collectedCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || '';
          if (!cookieHeader) return [];
          return cookieHeader.split(';').map(c => c.trim()).filter(Boolean).map(c => {
            const eq = c.indexOf('=');
            if (eq === -1) return { name: c, value: '' };
            return { name: decodeURIComponent(c.slice(0, eq)).trim(), value: decodeURIComponent(c.slice(eq + 1)) };
          });
        },
        setAll(cookiesToSet) {
          collectedCookies.push(...cookiesToSet);
        },
      },
      cookieOptions: {
        name: '__session',
        maxAge: 60 * 60,
        sameSite: 'lax' as const,
        path: '/',
        httpOnly: true,
        secure: isProd,
      },
    });

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
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : error.message;
        return NextResponse.json({ error: message }, { status: 401 });
      }
    }

    const response = NextResponse.json({ success: true });
    for (const { name, value, options } of collectedCookies) {
      if (name === '__session') {
        const isDelete = !value || (options as Record<string, unknown>)?.maxAge === 0;
        if (isDelete) {
          response.cookies.set('__session', '', { path: '/', maxAge: 0 });
          response.cookies.set('__refresh', '', { path: '/', maxAge: 0 });
        } else {
          try {
            const session = JSON.parse(value);
            if (session.access_token) {
              response.cookies.set('__session', session.access_token, {
                httpOnly: true, secure: isProd, sameSite: 'lax', path: '/',
                maxAge: 60 * 60,
              });
            }
            if (session.refresh_token) {
              response.cookies.set('__refresh', session.refresh_token, {
                httpOnly: true, secure: isProd, sameSite: 'lax', path: '/',
                maxAge: 60 * 60 * 24 * 30,
              });
            }
          } catch {
            response.cookies.set(name, value, options);
          }
        }
      } else {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (err) {
    console.error('Session POST unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session creation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = rateLimitResponse(request, rateLimits.logout);
  if (blocked) return blocked;

  const response = NextResponse.json({ success: true });
  response.cookies.set('__session', '', { path: '/', maxAge: 0 });
  response.cookies.set('__refresh', '', { path: '/', maxAge: 0 });
  return response;
}
