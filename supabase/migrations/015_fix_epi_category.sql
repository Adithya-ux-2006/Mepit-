-- Fix EPI KPI category: was incorrectly seeded as 'Sustainability', should be 'Electrical'
UPDATE kpi_formulas SET category = 'Electrical' WHERE kpi_code = 'EPI';
