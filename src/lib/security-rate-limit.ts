import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getClientIp } from '@/lib/rate-limit';
import { noStoreJson } from '@/lib/request-security';
import { hashSecurityKey } from '@/lib/security-hash';

export { hashSecurityKey } from '@/lib/security-hash';

interface LimitPolicy {
  limit: number;
  windowSeconds: number;
  blockSeconds: number;
}

interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const fallback = new Map<string, { attempts: number; startedAt: number; blockedUntil: number }>();

export const authLimitPolicies = {
  ip: { limit: 20, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  account: { limit: 6, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  refresh: { limit: 30, windowSeconds: 10 * 60, blockSeconds: 15 * 60 },
} satisfies Record<string, LimitPolicy>;

function fallbackConsume(keyHash: string, policy: LimitPolicy): LimitResult {
  const now = Date.now();
  const existing = fallback.get(keyHash);
  if (!existing || now - existing.startedAt >= policy.windowSeconds * 1000) {
    fallback.set(keyHash, { attempts: 1, startedAt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000) };
  }
  existing.attempts += 1;
  if (existing.attempts > policy.limit) {
    existing.blockedUntil = now + policy.blockSeconds * 1000;
    return { allowed: false, retryAfterSeconds: policy.blockSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

async function consume(keyHash: string, policy: LimitPolicy): Promise<LimitResult> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('consume_security_rate_limit', {
      p_key_hash: keyHash,
      p_limit: policy.limit,
      p_window_seconds: policy.windowSeconds,
      p_block_seconds: policy.blockSeconds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: Boolean(row?.allowed),
      retryAfterSeconds: Number(row?.retry_after_seconds) || 0,
    };
  } catch {
    if (process.env.NODE_ENV === 'production') {
      console.error('Durable rate limiter unavailable; using process-local fallback');
    }
    return fallbackConsume(keyHash, policy);
  }
}

export async function checkAuthenticationLimits(
  request: NextRequest,
  email: string,
): Promise<{ response: NextResponse | null; keys: string[] }> {
  const ipKey = hashSecurityKey('auth-ip', getClientIp(request));
  const accountKey = hashSecurityKey('auth-account', email);
  const keys = [ipKey, accountKey];
  const [ipResult, accountResult] = await Promise.all([
    consume(ipKey, authLimitPolicies.ip),
    consume(accountKey, authLimitPolicies.account),
  ]);
  const retryAfter = Math.max(ipResult.retryAfterSeconds, accountResult.retryAfterSeconds);
  if (!ipResult.allowed || !accountResult.allowed) {
    const response = noStoreJson(
      { error: 'Too many authentication attempts. Try again later.' },
      { status: 429 },
    );
    response.headers.set('Retry-After', String(retryAfter));
    return { response, keys };
  }
  return { response: null, keys };
}

export async function clearAuthenticationLimits(keys: string[]): Promise<void> {
  for (const key of keys) fallback.delete(key);
  try {
    await getSupabaseAdmin().rpc('clear_security_rate_limits', { p_key_hashes: keys });
  } catch {
    // Successful authentication should not fail if cleanup is temporarily unavailable.
  }
}

export async function checkRefreshLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = hashSecurityKey('refresh-ip', getClientIp(request));
  const result = await consume(key, authLimitPolicies.refresh);
  if (result.allowed) return null;
  const response = noStoreJson({ error: 'Too many refresh attempts. Try again later.' }, { status: 429 });
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  return response;
}
