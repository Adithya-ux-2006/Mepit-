-- Add benchmark ranges directly to kpi_formulas so the review page
-- can read them alongside the formulas in a single query.

ALTER TABLE kpi_formulas ADD COLUMN IF NOT EXISTS min_benchmark NUMERIC;
ALTER TABLE kpi_formulas ADD COLUMN IF NOT EXISTS max_benchmark NUMERIC;
ALTER TABLE kpi_formulas ADD COLUMN IF NOT EXISTS benchmark_note TEXT;

UPDATE kpi_formulas SET
  min_benchmark = 3, max_benchmark = 5, benchmark_note = 'Grüne Basis target: ~4% of BUA'
WHERE kpi_code = 'PLANT_ROOM_PCT';

UPDATE kpi_formulas SET
  min_benchmark = 1, max_benchmark = 3, benchmark_note = 'Grüne Basis target: ~2% of BUA'
WHERE kpi_code = 'LEASABLE_PLANT_ROOM_PCT';

UPDATE kpi_formulas SET
  min_benchmark = 0.5, max_benchmark = 3, benchmark_note = 'Grüne Basis target: 1-2% of BUA'
WHERE kpi_code = 'SHAFT_AREA_PCT';

UPDATE kpi_formulas SET
  min_benchmark = 300, max_benchmark = 500, benchmark_note = 'Benchmark: 300-500 sqft/TR'
WHERE kpi_code = 'COOLING_LOAD_DENSITY';

UPDATE kpi_formulas SET
  min_benchmark = 1.7, max_benchmark = 2.5, benchmark_note = 'Benchmark: 1.7-2.5 CFM/sqft'
WHERE kpi_code = 'CFM_SQFT';

UPDATE kpi_formulas SET
  min_benchmark = 4, max_benchmark = 7, benchmark_note = 'Benchmark: ~5.5 VA/sqft'
WHERE kpi_code = 'TRANSFORMER_DENSITY';

UPDATE kpi_formulas SET
  min_benchmark = 200, max_benchmark = 400, benchmark_note = 'Benchmark: Rs 250-300/sqft BUA'
WHERE kpi_code = 'HVAC_RS_SQFT';

UPDATE kpi_formulas SET
  min_benchmark = 200, max_benchmark = 400, benchmark_note = 'Benchmark: Rs 250-300/sqft BUA'
WHERE kpi_code = 'ELECTRICAL_RS_SQFT';

UPDATE kpi_formulas SET
  min_benchmark = 500, max_benchmark = 900, benchmark_note = 'Benchmark: aggregate MEP Rs 500-900/sqft BUA'
WHERE kpi_code = 'TOTAL_MEP_RS_SQFT';
