import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('__session')?.value;
  const hasRefreshToken = !!request.cookies.get('__refresh')?.value;

  const isApiRoute = pathname.startsWith('/api/');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isPublic = pathname === '/' || pathname === '/login';

  if (isStatic || isPublic) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (!accessToken) {
    if (isApiRoute || hasRefreshToken) {
      return response;
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(accessToken);

  if (error || !user) {
    if (isApiRoute || hasRefreshToken) {
      return response;
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.png$).*)',
  ],
};
