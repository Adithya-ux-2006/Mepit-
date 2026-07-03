import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyIdToken } from '@/lib/firebase-admin';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: 5 attempts per minute per IP — brute-force protection
  const blocked = rateLimitResponse(request, rateLimits.auth);
  if (blocked) return blocked;

  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  // Verify the Firebase ID token server-side before accepting it
  const decoded = await verifyIdToken(idToken);

  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set('__session', idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour — matches Firebase ID token lifetime. Middleware checks expiry on every page load.
  });

  return NextResponse.json({ success: true, uid: decoded.uid });
}

export async function DELETE(request: Request) {
  // Rate limit: 10 per minute per IP — prevent logout flood
  const blocked = rateLimitResponse(request, rateLimits.logout);
  if (blocked) return blocked;

  const cookieStore = await cookies();
  cookieStore.delete('__session');
  return NextResponse.json({ success: true });
}
