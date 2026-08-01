import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENGINEERING_SERVICE_GROUPS,
  PROJECT_INPUT_FIELD_META,
  getComputedFields,
} from '../src/lib/project-input-config.ts';

function valuesFor(inputs) {
  return new Map(
    getComputedFields(inputs).map((definition) => [
      definition.field,
      definition.compute(inputs),
    ]),
  );
}

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not close to ${expected}`);
}

test('matches workbook transformer sizing and density formulas', () => {
  const values = valuesFor({
    built_up_area: 1_236_861,
    transformer_sizing_calc: 4_607,
    transformer_loading_pct: 80,
  });

  closeTo(values.get('transformer_sizing_after_loading'), 5_758.75);
  closeTo(values.get('va_sqft_transformer'), 4.655939511392145);
});

test('accepts workbook decimal loading factors as well as form percentages', () => {
  const percentage = valuesFor({
    transformer_sizing_calc: 6_272,
    transformer_loading_pct: 80,
  });
  const decimal = valuesFor({
    transformer_sizing_calc: 6_272,
    transformer_loading_pct: 0.8,
  });

  assert.equal(percentage.get('transformer_sizing_after_loading'), 7_840);
  assert.equal(decimal.get('transformer_sizing_after_loading'), 7_840);
});

test('divides DG calculated load by the loading factor', () => {
  const values = valuesFor({
    dg_capacity_calc: 5_326,
    dg_loading_pct: 100,
  });

  assert.equal(values.get('dg_set_kva_after_loading'), 5_326);
  closeTo(
    valuesFor({ dg_capacity_calc: 8_858, dg_loading_pct: 90 }).get('dg_set_kva_after_loading'),
    8_858 / 0.9,
  );
});

test('includes editable EV density in total BUA power density', () => {
  const values = valuesFor({
    built_up_area: 1_000_000,
    tenant_power_kva: 2_500,
    common_area_power_kva: 1_500,
    va_sqft_bua_ev: 0.75,
  });

  assert.equal(PROJECT_INPUT_FIELD_META.va_sqft_bua_ev.kind, 'number');
  assert.equal(values.has('va_sqft_bua_ev'), false);
  assert.equal(values.get('va_sqft_bua_total'), 4.75);
});

test('computes MEP package crores from all workbook cost-rate rows', () => {
  const values = valuesFor({
    built_up_area: 1_000_000,
    hvac_cost: 200,
    electrical_cost: 150,
    dg_cost: 25,
    fire_fighting_cost: 30,
    stp_cost: 10,
    owc_cost_rs_sqft: 5,
    phe_cost: 20,
    bms_cost: 8,
    fapa_cost: 7,
    cctv_cost: 5,
  });

  assert.equal(values.get('mep_package_value_crores'), 46);
});

test('falls back to package lump sums when rate rows are empty', () => {
  const values = valuesFor({
    hvac_package_cost_lumpsum: 20_000_000,
    electrical_package_cost_lumpsum: 15_000_000,
    ff_package_cost_lumpsum: 5_000_000,
  });

  assert.equal(values.get('mep_package_value_crores'), 4);
});

test('renders every electrical and DG derived field in the form', () => {
  const electricalGroup = ENGINEERING_SERVICE_GROUPS.find((group) => group.key === 'electrical-dg');
  assert.ok(electricalGroup);

  const expected = [
    'total_va_sqft_carpet',
    'total_va_sqft_saleable',
    'va_sqft_bua_tenant',
    'va_sqft_bua_common_ex_ev',
    'va_sqft_bua_ev',
    'va_sqft_bua_total',
    'transformer_sizing_after_loading',
    'va_sqft_transformer',
    'dg_load_va_saleable',
    'dg_load_va_bua',
    'va_sqft_dg_capacity',
    'dg_set_kva_after_loading',
  ];

  for (const field of expected) {
    assert.ok(electricalGroup.fields.includes(field), `${field} is missing from the form group`);
  }
});

test('returns null for invalid loading factors and zero denominators', () => {
  const values = valuesFor({
    transformer_sizing_calc: 4_607,
    transformer_loading_pct: 0,
    dg_capacity_calc: 5_326,
    dg_loading_pct: 0,
  });

  assert.equal(values.get('transformer_sizing_after_loading'), null);
  assert.equal(values.get('va_sqft_transformer'), null);
  assert.equal(values.get('dg_set_kva_after_loading'), null);
  assert.equal(values.get('cooling_load_carpet'), null);
});
