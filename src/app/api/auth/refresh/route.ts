import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

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

    const collectedCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return parsed.map(([name, value]) => ({ name: name ?? '', value: value ?? '' }));
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

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      response.cookies.set('__session', '', { path: '/', maxAge: 0 });
      response.cookies.set('__refresh', '', { path: '/', maxAge: 0 });
      return response;
    }

    const response = NextResponse.json({ success: true, uid: data.user?.id });
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
    console.error('Session refresh unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session refresh' }, { status: 500 });
  }
}
