import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireSameOrigin } from '@/lib/request-security';
import { buildContentSecurityPolicy } from '@/lib/content-security-policy';

function createPageResponse(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isPublic = pathname === '/' || pathname === '/login';

  if (isStatic) return NextResponse.next();

  if (isApiRoute) {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
  }

  const response = isApiRoute ? NextResponse.next() : createPageResponse(request);
  if (isApiRoute) response.headers.set('Cache-Control', 'no-store, max-age=0');
  if (isPublic) return response;

  const accessToken = request.cookies.get('__session')?.value;
  const hasRefreshToken = Boolean(request.cookies.get('__refresh')?.value);

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
