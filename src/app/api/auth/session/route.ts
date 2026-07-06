import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const isProd = process.env.NODE_ENV === 'production';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let session: { access_token: string; refresh_token: string } | null = null;

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
      session = data.session;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : error.message;
        return NextResponse.json({ error: message }, { status: 401 });
      }
      session = data.session;
    }

    const response = NextResponse.json({ success: true });
    if (session) {
      setSessionCookies(response, session, isProd);
    }

    return response;
  } catch (err) {
    console.error('Session POST unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session creation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = rateLimitResponse(request, rateLimits.logout);
  if (blocked) return blocked;

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
