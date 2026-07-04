import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { rateLimitResponse, rateLimits } from '@/lib/rate-limit';
import type { ValidationRule, RuleType } from '@/types';

interface ValidationError {
  field: string;
  rule_type: string;
  error_message: string;
}

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

  const errors: ValidationError[] = [];

  for (const rule of (rules ?? []) as ValidationRule[]) {
    const fieldValue = formData[rule.field_name];
    const expr = rule.rule_expression as Record<string, unknown>;

    switch (rule.rule_type as RuleType) {
      case 'required': {
        const min = typeof expr.min === 'number' ? expr.min : undefined;
        if (
          fieldValue == null ||
          (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
          (typeof fieldValue === 'number' && min !== undefined && fieldValue < min)
        ) {
          errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
        }
        break;
      }
      case 'min_value': {
        const min = typeof expr.min === 'number' ? expr.min : 0;
        if (typeof fieldValue === 'number' && fieldValue !== null && fieldValue < min) {
          errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
        }
        break;
      }
      case 'max_value': {
        const max = typeof expr.max === 'number' ? expr.max : Infinity;
        if (typeof fieldValue === 'number' && fieldValue !== null && fieldValue > max) {
          errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
        }
        break;
      }
      case 'cross_field': {
        if (typeof expr.max_field === 'string') {
          const maxFieldVal = formData[expr.max_field];
          if (typeof fieldValue === 'number' && typeof maxFieldVal === 'number' && fieldValue > maxFieldVal) {
            errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
          }
        }
        if (Array.isArray(expr.min_sum_of)) {
          const sum = expr.min_sum_of.reduce(
            (acc: number, f: string) => acc + ((formData[f] as number) ?? 0),
            0,
          );
          const tolerancePct = typeof expr.tolerance_pct === 'number' ? expr.tolerance_pct : 0.01;
          if (
            typeof fieldValue === 'number' && fieldValue > 0 && sum > 0 &&
            Math.abs(fieldValue - sum) > Math.max(fieldValue * tolerancePct, 1)
          ) {
            errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
          }
        }
        if (typeof expr.min_ratio === 'number' && typeof expr.ratio_field === 'string') {
          const refVal = formData[expr.ratio_field];
          if (typeof fieldValue === 'number' && typeof refVal === 'number' && refVal > 0) {
            if (fieldValue / refVal < expr.min_ratio) {
              errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
            }
          }
        }
        if (typeof expr.max_ratio === 'number' && typeof expr.ratio_field === 'string') {
          const refVal = formData[expr.ratio_field];
          if (typeof fieldValue === 'number' && typeof refVal === 'number' && refVal > 0) {
            if (fieldValue / refVal > expr.max_ratio) {
              errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
            }
          }
        }
        break;
      }
    }
  }

  return NextResponse.json(errors);
}

