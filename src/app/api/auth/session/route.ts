import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const blocked = rateLimitResponse(request, rateLimits.auth);
    if (blocked) return blocked;

    let email: string | undefined;
    let password: string | undefined;
    const isSignUp = new URL(request.url).searchParams.get('signup') === '1';
    try {
      const body = await request.json();
      email = body?.email;
      password = body?.password;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let sessionToken: string | undefined;
    let refreshToken: string | undefined;
    let userId: string | undefined;

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data.session) {
        return NextResponse.json({
          error: 'Account created. Please check your email for a confirmation link before signing in.',
        }, { status: 200 });
      }
      sessionToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      userId = data.user?.id;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : error.message;
        return NextResponse.json({ error: message }, { status: 401 });
      }
      sessionToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      userId = data.user?.id;
    }

    if (!sessionToken) {
      return NextResponse.json({ error: 'Failed to obtain session token' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set('__session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    if (refreshToken) {
      cookieStore.set('__refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ success: true, uid: userId });
  } catch (err) {
    console.error('Session POST unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session creation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = rateLimitResponse(request, rateLimits.logout);
  if (blocked) return blocked;

  const cookieStore = await cookies();
  cookieStore.delete('__session');
  cookieStore.delete('__refresh');
  return NextResponse.json({ success: true });
}
