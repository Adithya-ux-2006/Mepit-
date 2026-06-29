import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyIdToken } from '@/lib/firebase-admin';

export async function POST(request: Request) {
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
    maxAge: 60 * 60 * 24 * 7, // 7 days — token is re-verified server-side on each request
  });

  return NextResponse.json({ success: true, uid: decoded.uid });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
  return NextResponse.json({ success: true });
}
