import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireSameOrigin } from '@/lib/request-security';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isPublic = pathname === '/' || pathname === '/login';

  if (isStatic || isPublic) return NextResponse.next();

  if (isApiRoute) {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
  }

  const accessToken = request.cookies.get('__session')?.value;
  const hasRefreshToken = Boolean(request.cookies.get('__refresh')?.value);
  const response = NextResponse.next();
  if (isApiRoute) response.headers.set('Cache-Control', 'no-store, max-age=0');

  if (!accessToken) {
    if (isApiRoute || hasRefreshToken) return response;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data, error } = await getSupabaseAdmin().auth.getClaims(accessToken);
  if (error || !data?.claims.sub) {
    if (isApiRoute || hasRefreshToken) return response;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|.*\\.png$).*)'],
};
