import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  normalizeProjectFormErrorField,
  parseProjectFormApiError,
} from '../src/lib/project-form-errors.ts';

test('turns nested API validation failures into editable form errors', () => {
  const errors = parseProjectFormApiError(
    'extended_fields.diversity_considered: Too big: expected number to be <=1',
  );

  assert.deepEqual(errors, [{
    field: 'diversity_considered',
    rule_type: 'input',
    error_message: 'Diversity Considered must be 1 or less.',
  }]);
});

test('normalizes extended field paths and ignores unrelated API errors', () => {
  assert.equal(
    normalizeProjectFormErrorField('extended_fields.stp_type'),
    'stp_type',
  );
  assert.deepEqual(
    parseProjectFormApiError('Unable to complete the request'),
    [],
  );
});

test('renders correction controls and enforces configured maximum values', () => {
  const source = readFileSync(
    new URL('../src/app/(app)/board1/create-project/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /data-validation-correction=/);
  assert.match(source, /Update flagged fields/);
  assert.match(source, /max=\{meta\.max\}/);
  assert.match(source, /nextValue > max/);
});
