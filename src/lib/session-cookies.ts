import { NextResponse } from 'next/server';

interface SessionLike {
  access_token: string;
  refresh_token: string;
}

export function setSessionCookies(response: NextResponse, session: SessionLike, isProd: boolean) {
  response.cookies.set('__session', session.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });

  response.cookies.set('__refresh', session.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set('__session', '', { path: '/', maxAge: 0 });
  response.cookies.set('__refresh', '', { path: '/', maxAge: 0 });
}
