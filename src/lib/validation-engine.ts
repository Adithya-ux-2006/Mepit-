import type { RuleType, ValidationRule } from '@/types';

export interface ValidationError {
  field: string;
  rule_type: string;
  error_message: string;
}

function directComparableValue(fieldValue: unknown, expr: Record<string, unknown>): number | null {
  if (typeof fieldValue !== 'number') return null;
  if (expr.value_already_normalized === true) return fieldValue;
  return fieldValue;
}

export function evaluateValidationRules(
  formData: Record<string, unknown>,
  rules: ValidationRule[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
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
            (acc: number, field: string) => acc + ((formData[field] as number) ?? 0),
            0,
          );
          const tolerancePct = typeof expr.tolerance_pct === 'number' ? expr.tolerance_pct : 0.01;
          if (
            typeof fieldValue === 'number' &&
            fieldValue > 0 &&
            sum > 0 &&
            Math.abs(fieldValue - sum) > Math.max(fieldValue * tolerancePct, 1)
          ) {
            errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
          }
        }

        if (typeof expr.min_ratio === 'number') {
          const comparableValue = directComparableValue(fieldValue, expr);
          if (comparableValue != null) {
            if (expr.value_already_normalized === true) {
              if (comparableValue < expr.min_ratio) {
                errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
              }
            } else if (typeof expr.ratio_field === 'string') {
              const refVal = formData[expr.ratio_field];
              if (typeof refVal === 'number' && refVal > 0 && comparableValue / refVal < expr.min_ratio) {
                errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
              }
            }
          }
        }

        if (typeof expr.max_ratio === 'number') {
          const comparableValue = directComparableValue(fieldValue, expr);
          if (comparableValue != null) {
            if (expr.value_already_normalized === true) {
              if (comparableValue > expr.max_ratio) {
                errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
              }
            } else if (typeof expr.ratio_field === 'string') {
              const refVal = formData[expr.ratio_field];
              if (typeof refVal === 'number' && refVal > 0 && comparableValue / refVal > expr.max_ratio) {
                errors.push({ field: rule.field_name, rule_type: rule.rule_type, error_message: rule.error_message });
              }
            }
          }
        }
        break;
      }
    }
  }

  return errors;
}

export function getRequiredValidationErrors(errors: ValidationError[]): ValidationError[] {
  return errors.filter((error) => error.rule_type === 'required');
}
