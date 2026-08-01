import { NextRequest, NextResponse } from 'next/server';
import { getOriginRejection } from '@/lib/request-origin';

export function noStoreJson(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const requestHost = request.headers.get('host') ?? request.nextUrl.host;
  const requestOrigin = `${request.nextUrl.protocol}//${requestHost}`;
  const rejection = getOriginRejection(
    request.method,
    request.headers.get('origin'),
    request.headers.get('sec-fetch-site'),
    requestOrigin,
    process.env.NODE_ENV === 'production',
  );
  if (!rejection) return null;
  return noStoreJson({ error: 'Request origin rejected' }, { status: 403 });
}

export function sanitizeDatabaseError(context: string, error: unknown): NextResponse {
  console.error(`${context} failed`, error instanceof Error ? error.message : 'database error');
  return noStoreJson({ error: 'Unable to complete the request' }, { status: 500 });
}
