/**
 * Learning Engine — Grüne Platform
 *
 * Statistical analysis module that learns from historical project data.
 * Uses the Formula Library as engineering knowledge and historical
 * projects as experience.
 *
 * Inputs: historical project inputs, calculated KPI outputs, project metadata
 * Outputs: recommended values, expected values, best case, confidence
 */

import type { Project, ProjectInputs, KpiFormula } from '@/types';
import { runFormulaEngine, calculateSimilarity, getProjectInputsBatch } from '@/lib/services';

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function coefficientOfVariation(sd: number, avg: number): number {
  if (avg === 0) return Infinity;
  return sd / avg;
}

/**
 * IQR-based outlier detection.
 * Returns values that fall outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
 */
function detectOutliers(sorted: number[]): { clean: number[]; outliers: number[] } {
  if (sorted.length < 4) return { clean: [...sorted], outliers: [] };

  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const clean: number[] = [];
  const outliers: number[] = [];
  for (const v of sorted) {
    if (v < lower || v > upper) outliers.push(v);
    else clean.push(v);
  }
  return { clean, outliers };
}

// ============================================================================
// YEAR DECAY WEIGHTING
// ============================================================================

/**
 * Exponential decay weight based on year difference.
 * More recent projects get higher weight.
 */
function yearDecayWeight(yearDiff: number, decayRate = 0.1): number {
  return Math.exp(-decayRate * yearDiff);
}

// ============================================================================
// LEARNING ENGINE CORE
// ============================================================================

export interface KpiStatistics {
  kpi_code: string;
  kpi_name: string;
  category: string;
  unit: string;
  sample_size: number;
  mean: number;
  median: number;
  std_dev: number;
  cv: number; // coefficient of variation
  range_p15: number; // 15th percentile (lower bound)
  range_p85: number; // 85th percentile (upper bound)
  upper_range: number; // 75th percentile
  best_case: number; // max value
  outliers_removed: number;
  weighted_mean: number; // year-decay weighted mean
  confidence: 'Low' | 'Medium' | 'High' | 'Very High';
  confidence_factors: string[];
  similar_project_ids: string[];
}

export interface LearningResult {
  target_project: {
    typology: string;
    built_up_area: number;
    location_city: string;
    project_year: number;
    hvac_strategy?: string;
  };
  statistics: KpiStatistics[];
  similar_projects_used: Project[];
  generated_at: string;
}

/**
 * Core learning function.
 * Given target project parameters, finds similar historical projects,
 * computes KPI values via the formula engine, and generates statistics.
 */
export async function runLearningEngine(
  target: {
    typology: string;
    built_up_area: number;
    location_city: string;
    location_state: string;
    project_year: number;
    hvac_strategy?: string;
  },
  approvedProjects: Project[],
  formulas: KpiFormula[],
  topN = 15
): Promise<LearningResult> {
  // Step 1: Find similar projects (async with HVAC matching)
  const scored = approvedProjects.map((p) => ({
    project: p,
    score: calculateSimilarity(target, p),
  })).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, Math.min(topN * 2, scored.length));

  // Batch-load inputs for top candidates (single query instead of N+1)
  const candidateIds = topCandidates.map((s) => s.project.id);
  const inputsMap = await getProjectInputsBatch(candidateIds);

  const projectsWithInputs: { project: Project; inputs: ProjectInputs; score: number }[] = [];
  for (const s of topCandidates) {
    const inputs = inputsMap.get(s.project.id);
    if (inputs) {
      const fullScore = calculateSimilarity(target, s.project, inputs);
      if (fullScore > 0) {
        projectsWithInputs.push({ project: s.project, inputs, score: fullScore });
      }
    }
  }

  projectsWithInputs.sort((a, b) => b.score - a.score);
  const similarProjects = projectsWithInputs.slice(0, topN);

  // Step 2: For each KPI formula, compute values from similar projects
  const statistics: KpiStatistics[] = [];

  for (const formula of formulas) {
    const valueProjectPairs: { value: number; project: Project; weight: number }[] = [];

    for (const sp of similarProjects) {
      const result = runFormulaEngine(formula.kpi_code, {
        ...sp.inputs,
        built_up_area: sp.project.built_up_area,
        carpet_area: sp.project.carpet_area,
        saleable_area: sp.project.saleable_area,
      });

      if (result.value != null) {
        const yearDiff = Math.abs((sp.project.project_year ?? 0) - target.project_year);
        const weight = yearDecayWeight(yearDiff);
        valueProjectPairs.push({
          value: result.value,
          project: sp.project,
          weight,
        });
      }
    }

    if (valueProjectPairs.length === 0) continue;

    const values = valueProjectPairs.map((v) => v.value);
    const sorted = [...values].sort((a, b) => a - b);

    // Basic statistics
    const avg = mean(values);
    const med = median(sorted);
    const sd = standardDeviation(values, avg);
    const cv = coefficientOfVariation(sd, avg);

    // Outlier detection
    const { clean, outliers } = detectOutliers(sorted);

    // Percentiles
    const rangeP15 = percentile(clean, 15);
    const rangeP85 = percentile(clean, 85);
    const upperRange = percentile(clean, 75);
    const bestCase = clean[clean.length - 1];

    // Year-weighted mean
    const weightedSum = valueProjectPairs.reduce(
      (acc, vp) => acc + vp.value * vp.weight,
      0
    );
    const weightTotal = valueProjectPairs.reduce(
      (acc, vp) => acc + vp.weight,
      0
    );
    const weightedMean = weightTotal > 0 ? weightedSum / weightTotal : avg;

    // Enhanced confidence calculation
    const qualifiedCount = projectsWithInputs.filter((s) => s.score >= 60).length;
    const confidenceFactors: string[] = [];
    let confidenceLevel = 0; // 0=Low, 1=Medium, 2=High, 3=Very High

    // Factor 1: Sample size
    if (qualifiedCount >= 15) { confidenceLevel = 3; confidenceFactors.push(`${qualifiedCount} highly similar projects`); }
    else if (qualifiedCount >= 7) { confidenceLevel = 2; confidenceFactors.push(`${qualifiedCount} similar projects`); }
    else if (qualifiedCount >= 3) { confidenceLevel = 1; confidenceFactors.push(`Only ${qualifiedCount} similar projects`); }
    else { confidenceLevel = 0; confidenceFactors.push(`Very few similar projects (${qualifiedCount})`); }

    // Factor 2: Coefficient of variation (lower = more consistent = higher confidence)
    if (cv < 0.15) { confidenceLevel = Math.min(3, confidenceLevel + 1); confidenceFactors.push('Low variance — consistent data'); }
    else if (cv > 0.5) { confidenceLevel = Math.max(0, confidenceLevel - 1); confidenceFactors.push('High variance — inconsistent data'); }

    // Factor 3: Outlier ratio
    if (outliers.length > 0) {
      const outlierRatio = outliers.length / values.length;
      if (outlierRatio > 0.2) {
        confidenceLevel = Math.max(0, confidenceLevel - 1);
        confidenceFactors.push(`${outliers.length} outliers detected`);
      }
    }

    // Factor 4: BUA proximity of top matches
    const topScore = scored[0]?.score ?? 0;
    if (topScore >= 85) {
      confidenceLevel = Math.min(3, confidenceLevel + (confidenceLevel < 3 ? 1 : 0));
      confidenceFactors.push('Strong project match');
    }

    const levels: Array<'Low' | 'Medium' | 'High' | 'Very High'> = ['Low', 'Medium', 'High', 'Very High'];
    const confidence = levels[confidenceLevel];

    statistics.push({
      kpi_code: formula.kpi_code,
      kpi_name: formula.kpi_name,
      category: formula.category,
      unit: formula.unit,
      sample_size: valueProjectPairs.length,
      mean: Math.round(avg * 100) / 100,
      median: Math.round(med * 100) / 100,
      std_dev: Math.round(sd * 100) / 100,
      cv: Math.round(cv * 1000) / 1000,
      range_p15: Math.round(rangeP15 * 100) / 100,
      range_p85: Math.round(rangeP85 * 100) / 100,
      upper_range: Math.round(upperRange * 100) / 100,
      best_case: Math.round(bestCase * 100) / 100,
      outliers_removed: outliers.length,
      weighted_mean: Math.round(weightedMean * 100) / 100,
      confidence,
      confidence_factors: confidenceFactors,
      similar_project_ids: valueProjectPairs.map((v) => v.project.id),
    });
  }

  return {
    target_project: {
      typology: target.typology,
      built_up_area: target.built_up_area,
      location_city: target.location_city,
      project_year: target.project_year,
      hvac_strategy: target.hvac_strategy,
    },
    statistics,
    similar_projects_used: similarProjects.map((s) => s.project),
    generated_at: new Date().toISOString(),
  };
}
