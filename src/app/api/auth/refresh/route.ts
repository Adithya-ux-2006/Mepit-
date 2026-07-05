import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('__refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const failResponse = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      failResponse.cookies.delete('__session');
      failResponse.cookies.delete('__refresh');
      return failResponse;
    }

    const response = NextResponse.json({
      success: true,
      uid: data.user?.id,
    });

    response.cookies.set('__session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    if (data.session.refresh_token) {
      response.cookies.set('__refresh', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      response.cookies.set('__refresh', '', { path: '/api/auth', maxAge: 0 });
    }

    return response;
  } catch (err) {
    console.error('Session refresh unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session refresh' }, { status: 500 });
  }
}
