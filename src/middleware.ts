/**
 * Next.js Middleware — Grüne Platform
 *
 * Gates all protected pages by checking the __session cookie.
 * Decodes the JWT payload to check expiry without full cryptographic
 * verification (fast, edge-compatible). Full verification happens in
 * API routes via the auth helper.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets and internal Next.js paths
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Only pass safe relative paths as redirect targets
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT to check expiry (fast, no crypto verification needed for middleware).
  // Full token verification happens in API routes via firebase-admin.
  const payload = decodeJwtPayload(sessionCookie);
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    // Token expired — clear the stale cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};
