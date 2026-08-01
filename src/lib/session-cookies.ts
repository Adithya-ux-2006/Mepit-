import { NextResponse } from 'next/server';

interface SessionLike {
  access_token: string;
  refresh_token: string;
}

const sharedCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  priority: 'high' as const,
};

export function setSessionCookies(response: NextResponse, session: SessionLike, isProd: boolean) {
  response.cookies.set('__session', session.access_token, {
    ...sharedCookieOptions,
    secure: isProd,
    maxAge: 60 * 60,
  });
  response.cookies.set('__refresh', session.refresh_token, {
    ...sharedCookieOptions,
    secure: isProd,
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set('__session', '', { ...sharedCookieOptions, maxAge: 0 });
  response.cookies.set('__refresh', '', { ...sharedCookieOptions, maxAge: 0 });
}
