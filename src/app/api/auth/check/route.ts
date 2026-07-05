import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const eq = c.indexOf('=');
      return eq === -1 ? [c, ''] : [decodeURIComponent(c.slice(0, eq)).trim(), decodeURIComponent(c.slice(eq + 1))];
    })
  );

  const hasSession = '__session' in cookies;
  const hasRefresh = '__refresh' in cookies;

  const user = await getAuthUser();

  return NextResponse.json({
    hasSession,
    hasRefresh,
    cookieCount: Object.keys(cookies).length,
    allCookies: Object.keys(cookies),
    authenticated: user !== null,
    userId: user?.uid,
    userEmail: user?.email,
  });
}
