import { createHmac } from 'node:crypto';

function getHmacSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('RATE_LIMIT_SECRET must be configured in production');
  }
  return secret ?? 'grune-development-rate-limit-key';
}

export function hashSecurityKey(scope: string, value: string): string {
  return createHmac('sha256', getHmacSecret())
    .update(`${scope}:${value.trim().toLowerCase()}`)
    .digest('hex');
}

