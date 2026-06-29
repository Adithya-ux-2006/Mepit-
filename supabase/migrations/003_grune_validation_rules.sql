-- ============================================================================
-- Grüne Basis Engineering Standards — Validation Rules Seed
-- These rules are the authoritative engineering rulebook from the Grüne Basis
-- workbook. Every field entered in Board 1 must be validated against these
-- requirements before project acceptance.
-- ============================================================================

-- Clear any existing rules and re-seed
DELETE FROM validation_rules;

INSERT INTO validation_rules (field_name, rule_type, rule_expression, error_message) VALUES
  -- ============================================================================
  -- AREA SCHEDULE
  -- ============================================================================
  ('built_up_area', 'required', '{"min": 1}', 'Built-up area is required and must be greater than zero.'),
  ('built_up_area', 'min_value', '{"min": 5000}', 'Built-up area seems too low for a commercial project. Minimum expected is 5,000 sqft.'),
  ('carpet_area', 'required', '{"min": 1}', 'Carpet area is required and must be greater than zero.'),
  ('carpet_area', 'cross_field', '{"max_field": "built_up_area"}', 'Carpet area cannot exceed built-up area.'),
  ('carpet_area', 'cross_field', '{"min_ratio": 0.3, "ratio_field": "built_up_area"}', 'Carpet area should be at least 30% of BUA. Check area calculations.'),
  ('saleable_area', 'cross_field', '{"max_field": "built_up_area"}', 'Saleable area cannot exceed built-up area.'),
  ('leasable_area', 'cross_field', '{"max_field": "saleable_area"}', 'Leasable area cannot exceed saleable area.'),

  -- Plant Room: Grüne Basis target = 4% of BUA
  ('plant_room_area', 'cross_field', '{"min_ratio": 0.02, "ratio_field": "built_up_area"}', 'Plant room area should be at least 2% of BUA (Grüne Basis minimum). Target is ~4%.'),
  ('plant_room_area', 'cross_field', '{"max_ratio": 0.08, "ratio_field": "built_up_area"}', 'Plant room area exceeds 8% of BUA — significantly above Grüne Basis target of ~4%. Verify inputs.'),

  -- Leasable Plant Room: Grüne Basis target = 2% of BUA
  ('leasable_plant_room_area', 'cross_field', '{"min_ratio": 0.01, "ratio_field": "built_up_area"}', 'Leasable plant room area should be at least 1% of BUA (Grüne Basis minimum). Target is ~2%.'),
  ('leasable_plant_room_area', 'cross_field', '{"max_ratio": 0.05, "ratio_field": "built_up_area"}', 'Leasable plant room area exceeds 5% of BUA — above Grüne Basis target of ~2%. Verify inputs.'),

  -- Shaft Area: Grüne Basis target = 1-2% of BUA
  ('shaft_area', 'cross_field', '{"min_ratio": 0.005, "ratio_field": "built_up_area"}', 'Shaft area should be at least 0.5% of BUA (Grüne Basis minimum). Target is 1-2%.'),
  ('shaft_area', 'cross_field', '{"max_ratio": 0.04, "ratio_field": "built_up_area"}', 'Shaft area exceeds 4% of BUA — above Grüne Basis target of 1-2%. Verify inputs.'),

  -- ============================================================================
  -- HVAC PARAMETERS
  -- ============================================================================

  -- Occupancy: Office = 65 sqft/person, F&B = 25 sqft/person (meeting rooms)
  ('occupancy_density_office', 'min_value', '{"min": 40}', 'Office occupancy density below 40 sqft/person is unusually dense.'),
  ('occupancy_density_office', 'max_value', '{"max": 120}', 'Office occupancy density above 120 sqft/person is unusually sparse. Grüne Basis standard is 65 sqft/person.'),

  ('occupancy_density_fb', 'min_value', '{"min": 15}', 'F&B occupancy density below 15 sqft/person is unusually dense.'),
  ('occupancy_density_fb', 'max_value', '{"max": 60}', 'F&B occupancy density above 60 sqft/person is unusually sparse. Grüne Basis standard is 25 sqft/person.'),

  -- Total TR
  ('total_tr', 'min_value', '{"min": 1}', 'Total TR must be greater than zero for projects with cooling requirements.'),

  -- Cooling density: Chiller = 400+ sqft/TR, VRF = 350 sqft/TR
  -- These are advisory — checked via cross_field ratio of carpet_area / total_tr
  ('total_tr', 'cross_field', '{"min_ratio": 0.001, "ratio_field": "carpet_area"}', 'Total TR appears very low relative to carpet area. Check cooling requirements.'),

  -- Airflow: Chilled Water 1.7-2.0 CFM/sqft, VRF min 2 CFM/sqft
  ('total_airflow_cfm', 'min_value', '{"min": 100}', 'Total airflow must be at least 100 CFM for any conditioned space.'),
  ('total_airflow_cfm', 'cross_field', '{"min_ratio": 1.5, "ratio_field": "carpet_area"}', 'Airflow below 1.5 CFM/sqft is below Grüne Basis minimum (1.7 CFM/sqft for Chilled Water).'),
  ('total_airflow_cfm', 'cross_field', '{"max_ratio": 4.0, "ratio_field": "carpet_area"}', 'Airflow above 4.0 CFM/sqft is unusually high. Grüne Basis range is 1.7-2.0 CFM/sqft (CHW) or 2+ CFM/sqft (VRF).'),

  -- Operating hours
  ('operating_hours', 'min_value', '{"min": 1000}', 'Operating hours below 1,000 hrs/yr seems low for a commercial building.'),
  ('operating_hours', 'max_value', '{"max": 8760}', 'Operating hours cannot exceed 8,760 (24/7/365).'),

  -- ============================================================================
  -- ELECTRICAL PARAMETERS
  -- ============================================================================

  -- Tenant load benchmark: 8 VA/sqft carpet
  ('tenant_power_kva', 'min_value', '{"min": 1}', 'Tenant power capacity must be greater than zero.'),
  ('tenant_power_kva', 'cross_field', '{"min_ratio": 0.003, "ratio_field": "carpet_area"}', 'Tenant power appears very low. Grüne Basis benchmark is ~8 VA/sqft of carpet area.'),

  -- Common load: 2.5-3 VA/sqft
  ('common_area_power_kva', 'min_value', '{"min": 1}', 'Common area power capacity must be greater than zero.'),

  -- Transformer loading: max 80%
  ('transformer_capacity_kva', 'min_value', '{"min": 10}', 'Transformer capacity must be at least 10 kVA for commercial projects.'),
  ('transformer_capacity_kva', 'cross_field', '{"min_ratio": 0.8, "ratio_field": "tenant_power_kva"}', 'Transformer capacity should be at least 80% of total connected load. Check transformer sizing vs. tenant + common area power.'),

  -- DG
  ('dg_capacity_kva', 'min_value', '{"min": 10}', 'DG capacity must be at least 10 kVA for commercial projects.'),

  ('dg_loading_factor', 'min_value', '{"min": 0}', 'DG loading factor must be between 0 and 1.'),
  ('dg_loading_factor', 'max_value', '{"max": 1}', 'DG loading factor must be between 0 and 1. Grüne Basis benchmark is 0.8 (80% prime rated).'),

  -- ============================================================================
  -- ENERGY
  -- ============================================================================

  ('annual_energy_kwh', 'min_value', '{"min": 1}', 'Annual energy consumption must be greater than zero.'),

  -- ============================================================================
  -- COST BENCHMARKS (Grüne Basis Rs/sqft of BUA)
  -- ============================================================================
  -- HVAC: 250-300 Rs/sqft BUA
  ('hvac_cost', 'cross_field', '{"min_ratio": 100, "ratio_field": "built_up_area"}', 'HVAC cost appears very low. Grüne Basis benchmark is Rs 250-300/sqft BUA.'),
  ('hvac_cost', 'cross_field', '{"max_ratio": 600, "ratio_field": "built_up_area"}', 'HVAC cost exceeds Rs 600/sqft BUA — significantly above Grüne Basis benchmark of Rs 250-300.'),

  -- Electrical: 250-300 Rs/sqft BUA
  ('electrical_cost', 'cross_field', '{"min_ratio": 100, "ratio_field": "built_up_area"}', 'Electrical cost appears very low. Grüne Basis benchmark is Rs 250-300/sqft BUA.'),
  ('electrical_cost', 'cross_field', '{"max_ratio": 600, "ratio_field": "built_up_area"}', 'Electrical cost exceeds Rs 600/sqft BUA — significantly above Grüne Basis benchmark of Rs 250-300.'),

  -- Plumbing / STP: 70-100 Rs/sqft BUA
  ('stp_cost', 'cross_field', '{"min_ratio": 30, "ratio_field": "built_up_area"}', 'STP cost appears very low. Grüne Basis benchmark is Rs 70-100/sqft BUA.'),

  -- BMS: 30 Rs/sqft BUA
  ('bms_cost', 'cross_field', '{"min_ratio": 10, "ratio_field": "built_up_area"}', 'BMS cost appears very low. Grüne Basis benchmark is Rs 30/sqft BUA.'),

  -- FAPA: 35 Rs/sqft BUA
  ('fapa_cost', 'cross_field', '{"min_ratio": 10, "ratio_field": "built_up_area"}', 'FAPA cost appears very low. Grüne Basis benchmark is Rs 35/sqft BUA.'),

  -- CCTV: 35 Rs/sqft BUA
  ('cctv_cost', 'cross_field', '{"min_ratio": 10, "ratio_field": "built_up_area"}', 'CCTV cost appears very low. Grüne Basis benchmark is Rs 35/sqft BUA.'),

  -- ============================================================================
  -- CROSS-FIELD INTEGRITY
  -- ============================================================================
  ('total_mep_cost', 'required', '{"min": 1}', 'Total MEP cost is required for submitted projects.'),
  ('total_mep_cost', 'cross_field', '{"min_sum_of": ["hvac_cost", "electrical_cost", "dg_cost", "fire_fighting_cost", "stp_cost", "phe_cost", "bms_cost", "fapa_cost", "cctv_cost"], "tolerance_pct": 0.01}', 'Total MEP cost should equal the sum of all package costs (tolerance: 1%).');

-- ============================================================================
-- SEED: Comprehensive KPI Formula Library (all 25 formulas)
-- ============================================================================
INSERT INTO kpi_formulas (kpi_code, kpi_name, category, numerator_expression, denominator_expression, unit, description) VALUES
  ('PLANT_ROOM_PCT', 'Plant Room %', 'Space Planning', 'Plant Room Area', 'BUA', '%', 'Percentage of built-up area occupied by plant rooms. Target: ~4%.'),
  ('LEASABLE_PLANT_ROOM_PCT', 'Leasable Plant Room %', 'Space Planning', 'Leasable Plant Room Area', 'BUA', '%', 'Percentage of built-up area occupied by leasable plant rooms. Target: ~2%.'),
  ('SHAFT_AREA_PCT', 'Shaft Area %', 'Space Planning', 'Shaft Area', 'BUA', '%', 'Percentage of built-up area occupied by shafts. Target: 1-2%.'),
  ('POPULATION', 'Population', 'HVAC', '(Office Area / Office Density) + (F&B Area / F&B Density)', '', 'Persons', 'Total building population. Office density benchmark: 65 sqft/person. F&B: 25 sqft/person.'),
  ('COOLING_LOAD_DENSITY', 'Cooling Load Density', 'HVAC', 'Carpet Area', 'Total TR', 'sqft/TR', 'Carpet area served per ton of refrigeration. Chiller: 400+ sqft/TR. VRF: 350 sqft/TR.'),
  ('CFM_SQFT', 'CFM/sqft', 'HVAC', 'Total Airflow', 'Carpet Area', 'CFM/sqft', 'Airflow rate per sqft. Chilled Water: 1.7-2.0 CFM/sqft. VRF: min 2 CFM/sqft.'),
  ('KW_PER_TR', 'kW/TR', 'HVAC', 'Annual Energy', 'Total TR * Operating Hours', 'kW/TR', 'Chiller plant efficiency. Centrifugal: >6.5 COP. Screw: >6.2 COP.'),
  ('HVAC_RS_SQFT', 'HVAC Rs/sqft', 'Cost', 'HVAC Cost', 'BUA', 'Rs/sqft', 'HVAC system cost per sqft BUA. Benchmark: Rs 250-300/sqft.'),
  ('TOTAL_VA_SQFT_CARPET', 'Total VA/sqft (Carpet)', 'Electrical', '(Tenant Power + Common Area Power) * 1000', 'Carpet Area', 'VA/sqft', 'Electrical power density on carpet area. Tenant: 8 VA/sqft. Common: 2.5-3 VA/sqft.'),
  ('TOTAL_VA_SQFT_SALEABLE', 'Total VA/sqft (Saleable)', 'Electrical', '(Tenant Power + Common Area Power) * 1000', 'Saleable Area', 'VA/sqft', 'Electrical power density on saleable area.'),
  ('TOTAL_VA_SQFT_BUA', 'Total VA/sqft (BUA)', 'Electrical', '(Tenant Power + Common Area Power) * 1000', 'BUA', 'VA/sqft', 'Electrical power density on BUA. Benchmark: ~5.5 VA/sqft.'),
  ('TRANSFORMER_DENSITY', 'Transformer Density', 'Electrical', 'Transformer Capacity * 1000', 'BUA', 'VA/sqft', 'Transformer capacity per sqft BUA. Max loading: 80%.'),
  ('LIGHTING_W_SQFT', 'Lighting W/sqft', 'Electrical', 'Lighting Load', 'Carpet Area', 'W/sqft', 'Lighting power density on carpet area.'),
  ('DG_LOAD_DENSITY', 'DG Load Density', 'DG', 'DG Capacity', 'BUA', 'kVA/sqft', 'DG installed capacity per sqft BUA. Benchmark: 80% prime rated.'),
  ('DG_CAPACITY_DENSITY', 'DG Capacity Density', 'DG', 'DG Capacity * Loading Factor', 'BUA', 'kVA/sqft', 'DG actual load per sqft BUA.'),
  ('EPI', 'EPI', 'Sustainability', 'Annual Energy', 'Gross Area', 'kWh/sqft/yr', 'Energy Performance Index. Annual energy per sqft gross area.'),
  ('TOTAL_MEP_RS_SQFT', 'Total MEP Rs/sqft', 'Cost', 'Total MEP Cost', 'BUA', 'Rs/sqft', 'Total MEP cost per sqft BUA.'),
  ('ELECTRICAL_RS_SQFT', 'Electrical Rs/sqft', 'Cost', 'Electrical Cost', 'BUA', 'Rs/sqft', 'Electrical system cost per sqft BUA. Benchmark: Rs 250-300.'),
  ('DG_RS_SQFT', 'DG Rs/sqft', 'Cost', 'DG Cost', 'BUA', 'Rs/sqft', 'DG system cost per sqft BUA.'),
  ('FF_RS_SQFT', 'Fire Fighting Rs/sqft', 'Cost', 'Fire Fighting Cost', 'BUA', 'Rs/sqft', 'Fire fighting system cost per sqft BUA.'),
  ('STP_RS_SQFT', 'STP Rs/sqft', 'Cost', 'STP Cost', 'BUA', 'Rs/sqft', 'STP cost per sqft BUA. Benchmark: Rs 70-100.'),
  ('PHE_RS_SQFT', 'PHE Rs/sqft', 'Cost', 'PHE Cost', 'BUA', 'Rs/sqft', 'PHE system cost per sqft BUA.'),
  ('BMS_RS_SQFT', 'BMS Rs/sqft', 'Cost', 'BMS Cost', 'BUA', 'Rs/sqft', 'BMS cost per sqft BUA. Benchmark: Rs 30.'),
  ('FAPA_RS_SQFT', 'FAPA Rs/sqft', 'Cost', 'FAPA Cost', 'BUA', 'Rs/sqft', 'Fire alarm and PA system cost per sqft BUA. Benchmark: Rs 35.'),
  ('CCTV_RS_SQFT', 'CCTV Rs/sqft', 'Cost', 'CCTV Cost', 'BUA', 'Rs/sqft', 'CCTV system cost per sqft BUA. Benchmark: Rs 35.')
ON CONFLICT (kpi_code) DO UPDATE SET
  description = EXCLUDED.description;
