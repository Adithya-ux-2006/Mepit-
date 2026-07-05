import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const publicPaths = ['/login', '/api/auth/session'];

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(sessionCookie);

  // If JWT can't be decoded, delete the bad cookie and redirect
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    response.cookies.delete('__refresh');
    return response;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const refreshCookie = request.cookies.get('__refresh')?.value;
    if (refreshCookie) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase.auth.refreshSession({ refresh_token: refreshCookie });
        if (data?.session) {
          const response = NextResponse.next();
          response.cookies.set('__session', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60,
          });
          if (data.session.refresh_token) {
            response.cookies.set('__refresh', data.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/api/auth',
              maxAge: 60 * 60 * 24 * 30,
            });
          }
          return response;
        }
      } catch {
        // Refresh failed — fall through to redirect
      }
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    response.cookies.delete('__refresh');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
