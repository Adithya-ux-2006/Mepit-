export interface ProjectFormError {
  field: string;
  rule_type: string;
  error_message: string;
}

const PROJECT_FIELDS = new Set([
  'project_name',
  'typology',
  'project_stage',
  'location_city',
  'location_state',
  'project_year',
  'built_up_area',
  'carpet_area',
  'saleable_area',
  'leasable_area',
]);

export function normalizeProjectFormErrorField(field: string): string {
  return field.replace(/^extended_fields\./, '');
}

function isEditableProjectFormField(rawField: string, field: string): boolean {
  return rawField.startsWith('extended_fields.') || PROJECT_FIELDS.has(field) || field.includes('_');
}

function humanizeProjectFormError(field: string, message: string): string {
  const label = field.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tooBig = message.match(/Too big: expected number to be <=\s*([\d.]+)/i);
  if (tooBig) return `${label} must be ${tooBig[1]} or less.`;

  const tooSmall = message.match(/Too small: expected number to be >=\s*([\d.]+)/i);
  if (tooSmall) return `${label} must be at least ${tooSmall[1]}.`;

  return message;
}

export function parseProjectFormApiError(message: string): ProjectFormError[] {
  const normalizedMessage = message.replace(/^Validation failed:\s*/i, '');
  const errors: ProjectFormError[] = [];

  for (const part of normalizedMessage.split(';')) {
    const match = part.trim().match(/^([a-zA-Z][\w.]*)\s*:\s*(.+)$/);
    if (!match) continue;

    const rawField = match[1];
    const field = normalizeProjectFormErrorField(rawField);
    if (!isEditableProjectFormField(rawField, field)) continue;

    errors.push({
      field,
      rule_type: 'input',
      error_message: humanizeProjectFormError(field, match[2].trim()),
    });
  }

  return errors;
}
