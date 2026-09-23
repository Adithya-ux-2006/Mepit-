import assert from 'node:assert/strict';
import test from 'node:test';
import { runFormulaEngine } from '../src/lib/engineering.ts';

const BASE_INPUTS = {
  built_up_area: 100_000,
  carpet_area: 65_000,
  saleable_area: 75_000,
  plant_room_area: 4_000,
  leasable_plant_room_area: 2_000,
  shaft_area: 1_500,
  office_area: 70_000,
  fb_area: 10_000,
  occupancy_density_office: 100,
  occupancy_density_fb: 20,
  total_tr: 250,
  tenant_power_kva: 2_000,
  common_area_power_kva: 1_000,
  extended_fields: {},
};

function withOverrides(overrides) {
  return { ...BASE_INPUTS, extended_fields: { ...overrides } };
}

// ── Override wins for each confirmed-mapping KPI ─────────────────────

test('PLANT_ROOM_PCT: override wins', () => {
  assert.equal(runFormulaEngine('PLANT_ROOM_PCT', BASE_INPUTS).value, 4);
  assert.equal(runFormulaEngine('PLANT_ROOM_PCT', withOverrides({ plant_room_bua_pct: 5.5 })).value, 5.5);
});

test('LEASABLE_PLANT_ROOM_PCT: override wins', () => {
  assert.equal(runFormulaEngine('LEASABLE_PLANT_ROOM_PCT', BASE_INPUTS).value, 2);
  assert.equal(runFormulaEngine('LEASABLE_PLANT_ROOM_PCT', withOverrides({ leasable_plant_room_bua_pct: 3.2 })).value, 3.2);
});

test('SHAFT_AREA_PCT: override wins', () => {
  assert.equal(runFormulaEngine('SHAFT_AREA_PCT', BASE_INPUTS).value, 1.5);
  assert.equal(runFormulaEngine('SHAFT_AREA_PCT', withOverrides({ shaft_area_bua_pct: 2.1 })).value, 2.1);
});

test('POPULATION: override wins', () => {
  assert.equal(runFormulaEngine('POPULATION', BASE_INPUTS).value, 1200);
  assert.equal(runFormulaEngine('POPULATION', withOverrides({ population: 999 })).value, 999);
});

test('COOLING_LOAD_DENSITY: cooling_load_carpet override wins', () => {
  assert.equal(runFormulaEngine('COOLING_LOAD_DENSITY', BASE_INPUTS).value, 260);
  assert.equal(runFormulaEngine('COOLING_LOAD_DENSITY', withOverrides({ cooling_load_carpet: 300 })).value, 300);
});

test('TOTAL_VA_SQFT_CARPET: override wins', () => {
  const base = runFormulaEngine('TOTAL_VA_SQFT_CARPET', BASE_INPUTS).value;
  assert.ok(Math.abs(base - 46.1538) < 0.01);
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_CARPET', withOverrides({ total_va_sqft_carpet: 50 })).value, 50);
});

test('TOTAL_VA_SQFT_SALEABLE: override wins', () => {
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_SALEABLE', BASE_INPUTS).value, 40);
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_SALEABLE', withOverrides({ total_va_sqft_saleable: 45 })).value, 45);
});

test('TOTAL_VA_SQFT_BUA: va_sqft_bua_total override wins', () => {
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_BUA', BASE_INPUTS).value, 30);
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_BUA', withOverrides({ va_sqft_bua_total: 35 })).value, 35);
});

// ── Regression: non-overridden fields unaffected ──────────────────────

test('CFM_SQFT: no override mapping, computes from raw inputs', () => {
  assert.equal(runFormulaEngine('CFM_SQFT', BASE_INPUTS).value, null);
  assert.equal(runFormulaEngine('CFM_SQFT', withOverrides({ population: 999 })).value, null);
});

test('HVAC_RS_SQFT: reads hvac_cost directly, ignores unrelated overrides', () => {
  assert.equal(runFormulaEngine('HVAC_RS_SQFT', BASE_INPUTS).value, null);
  assert.equal(runFormulaEngine('HVAC_RS_SQFT', withOverrides({ population: 999 })).value, null);
});

test('TRANSFORMER_DENSITY: no override mapping, computes from raw inputs', () => {
  assert.equal(runFormulaEngine('TRANSFORMER_DENSITY', BASE_INPUTS).value, null);
  assert.equal(runFormulaEngine('TRANSFORMER_DENSITY', withOverrides({ population: 999 })).value, null);
});

// ── Override edge cases ───────────────────────────────────────────────

test('non-number override is ignored (falls through to formula)', () => {
  assert.equal(runFormulaEngine('POPULATION', withOverrides({ population: 'abc' })).value, 1200);
  assert.equal(runFormulaEngine('POPULATION', withOverrides({ population: null })).value, 1200);
  assert.equal(runFormulaEngine('POPULATION', withOverrides({ population: undefined })).value, 1200);
});

test('zero override is used (zero is a valid number)', () => {
  assert.equal(runFormulaEngine('POPULATION', withOverrides({ population: 0 })).value, 0);
});

test('negative override is used (user may intentionally zero out)', () => {
  // Negative is unusual but typeof === 'number' so it's accepted
  assert.equal(runFormulaEngine('PLANT_ROOM_PCT', withOverrides({ plant_room_bua_pct: -1 })).value, -1);
});

// ── Multiple overrides on same project ────────────────────────────────

test('multiple overrides on same project all take effect', () => {
  const overrides = {
    plant_room_bua_pct: 5.5,
    population: 800,
    cooling_load_carpet: 350,
    va_sqft_bua_total: 40,
  };
  assert.equal(runFormulaEngine('PLANT_ROOM_PCT', withOverrides(overrides)).value, 5.5);
  assert.equal(runFormulaEngine('POPULATION', withOverrides(overrides)).value, 800);
  assert.equal(runFormulaEngine('COOLING_LOAD_DENSITY', withOverrides(overrides)).value, 350);
  assert.equal(runFormulaEngine('TOTAL_VA_SQFT_BUA', withOverrides(overrides)).value, 40);

  // Non-overridden KPI on same project still computes normally
  assert.equal(runFormulaEngine('CFM_SQFT', withOverrides(overrides)).value, null);
});
