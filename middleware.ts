import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith('/api/');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isPublic = pathname === '/' || pathname === '/login';

  if (isStatic || isPublic) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const isProd = process.env.NODE_ENV === 'production';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies = request.cookies.getAll();
        const accessToken = cookies.find((c) => c.name === '__session')?.value;
        const refreshToken = cookies.find((c) => c.name === '__refresh')?.value;

        let expiresAt: number | undefined;
        if (accessToken) {
          const payload = decodeJwtPayload(accessToken);
          if (payload) {
            expiresAt = payload.exp as number | undefined;
          }
        }

        return [
          {
            name: '__session',
            value: JSON.stringify({
              access_token: accessToken ?? '',
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: expiresAt,
              refresh_token: refreshToken ?? '',
            }),
          },
          ...cookies.filter((c) => c.name !== '__session' && c.name !== '__refresh'),
        ];
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
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

  const { data: { session } } = await supabase.auth.getSession();

  console.log('[middleware] pathname=%s hasSession=%s accessTokenLength=%d expiresAt=%s',
    pathname,
    !!session,
    request.cookies.get('__session')?.value?.length ?? 0,
    session?.expires_at ?? 'N/A'
  );

  if (!session) {
    if (isApiRoute) {
      return response;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.set('__session', '', { path: '/', maxAge: 0 });
    redirectResponse.cookies.set('__refresh', '', { path: '/', maxAge: 0 });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.png$).*)',
  ],
};
