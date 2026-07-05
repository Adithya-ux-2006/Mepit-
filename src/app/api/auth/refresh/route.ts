import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('__refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      cookieStore.delete('__session');
      cookieStore.delete('__refresh');
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    cookieStore.set('__session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    if (data.session.refresh_token) {
      cookieStore.set('__refresh', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({
      success: true,
      uid: data.user?.id,
    });
  } catch (err) {
    console.error('Session refresh unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error during session refresh' }, { status: 500 });
  }
}
