import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { evaluateValidationRules } from '@/lib/validation-engine';
import type { ValidationRule } from '@/types';

export async function POST(request: NextRequest) {
  const blocked = rateLimitResponse(request, rateLimits.write);
  if (blocked) return blocked;

  const [, error] = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const { data: formData } = body as { data?: Record<string, unknown> };

  if (!formData || typeof formData !== 'object') {
    return NextResponse.json({ error: 'data object is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: rules, error: dbError } = await admin
    .from('validation_rules')
    .select('*')
    .eq('is_active', true);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(evaluateValidationRules(formData, (rules ?? []) as ValidationRule[]));
}

