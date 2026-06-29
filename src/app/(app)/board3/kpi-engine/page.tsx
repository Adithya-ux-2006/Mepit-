'use client';

import { useEffect, useState, useMemo } from 'react';
import { getProjects, getKpiFormulas } from '@/lib/services';
import { runLearningEngine } from '@/lib/learning-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download } from 'lucide-react';
import type { Project, KpiCategory, KpiFormula, RecommendationCard } from '@/types';

const typologies = [
  'Office', 'Retail', 'Hospitality', 'Mixed Use',
  'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
];

const hvacStrategies = ['Central Plant', 'VRF', 'Hybrid', 'Split AC', 'Other'];

const sustainabilityTargets = ['None', '3-Star', '4-Star', '5-Star', 'LEED Silver', 'LEED Gold', 'LEED Platinum', 'GRIHA'];

const complexities = ['Low', 'Medium', 'High'];

const specialRequirements = ['Data Centre Load', 'High Kitchen Load', 'Clean Room', 'Atrium', 'Other'];

interface FormState {
  typology: string;
  built_up_area: number | null;
  location_city: string;
  location_state: string;
  project_year: number | null;
  hvac_strategy: string;
  sustainability_target: string;
  complexity: string;
  special_requirements: string[];
}

export default function KpiEnginePage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [formulas, setFormulas] = useState<KpiFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<RecommendationCard[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState<FormState>({
    typology: '',
    built_up_area: null,
    location_city: '',
    location_state: '',
    project_year: null,
    hvac_strategy: '',
    sustainability_target: '',
    complexity: '',
    special_requirements: [],
  });

  useEffect(() => {
    Promise.all([
      getProjects(),
      getKpiFormulas(),
    ])
      .then(([p, f]) => {
        setAllProjects(p.filter((pr) => pr.status === 'approved'));
        setFormulas(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const approvedCount = allProjects.length;

  const handleGenerate = async () => {
    if (!form.typology || form.built_up_area == null || !form.location_city || form.project_year == null) return;

    setGenerating(true);
    setResults(null);

    try {
      const result = await runLearningEngine(
        {
          typology: form.typology,
          built_up_area: form.built_up_area,
          location_city: form.location_city,
          location_state: form.location_state,
          project_year: form.project_year,
          hvac_strategy: form.hvac_strategy || undefined,
        },
        allProjects,
        formulas,
        15
      );

      const formulaMap = new Map(formulas.map((f) => [f.kpi_code, f]));

      const cards: RecommendationCard[] = result.statistics.map((stat) => {
        const formula = formulaMap.get(stat.kpi_code);
        return {
          kpi_code: stat.kpi_code,
          kpi_name: stat.kpi_name,
          category: stat.category as KpiCategory,
          recommended_value: stat.weighted_mean,
          weighted_mean: stat.weighted_mean,
          typical_range_min: stat.range_p15,
          typical_range_max: stat.range_p85,
          best_case: stat.best_case,
          upper_range: stat.upper_range,
          confidence: stat.confidence,
          confidence_factors: stat.confidence_factors,
          similar_projects_count: stat.sample_size,
          outliers_removed: stat.outliers_removed,
          std_dev: stat.std_dev,
          cv: stat.cv,
          unit: stat.unit,
          formula_description: formula?.description ?? '',
        };
      });

      setResults(cards);
    } catch (err) {
      console.error('Recommendation engine error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const categoryOrder = ['Space Planning', 'HVAC', 'Electrical', 'DG', 'Sustainability', 'Cost'] as const;
  const grouped = useMemo(() => {
    if (!results) return {};
    const g: Record<string, RecommendationCard[]> = {};
    for (const r of results) {
      const cat = r.category;
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    }
    return g;
  }, [results]);

  const confidenceColor = (c: RecommendationCard['confidence']) => {
    switch (c) {
      case 'Very High': return 'text-green-600 bg-green-50';
      case 'High': return 'text-blue-600 bg-blue-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'Low': return 'text-red-600 bg-red-50';
    }
  };

  const handleExport = () => {
    if (!results) return;
    const rows = [['KPI Code', 'KPI Name', 'Category', 'Recommended Value', 'Range Min', 'Range Max', 'Unit', 'Confidence', 'Projects Used']];
    for (const r of results) {
      rows.push([r.kpi_code, r.kpi_name, r.category, String(r.recommended_value), String(r.typical_range_min), String(r.typical_range_max), r.unit, r.confidence, String(r.similar_projects_count)]);
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-recommendations-${form.typology}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSpecial = (req: string) => {
    setForm((prev) => ({
      ...prev,
      special_requirements: prev.special_requirements.includes(req)
        ? prev.special_requirements.filter((r) => r !== req)
        : [...prev.special_requirements, req],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Recommendation Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate benchmark KPI recommendations based on similar historical projects.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Repository: <strong>{approvedCount}</strong> approved projects
          {approvedCount < 10 && (
            <span className="text-amber-600 ml-2">
              &mdash; Low repository depth will affect confidence
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typology *</Label>
              <select
                value={form.typology}
                onChange={(e) => setForm((p) => ({ ...p, typology: e.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Select...</option>
                {typologies.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Built Up Area * (sqft)</Label>
              <Input
                type="number"
                value={form.built_up_area ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, built_up_area: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input
                value={form.location_city}
                onChange={(e) => setForm((p) => ({ ...p, location_city: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={form.location_state}
                onChange={(e) => setForm((p) => ({ ...p, location_state: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Year *</Label>
              <Input
                type="number"
                value={form.project_year ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, project_year: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Fine-tuning */}
          <details className="group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              Fine-Tuning Options (optional)
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">HVAC Strategy</Label>
                <select
                  value={form.hvac_strategy}
                  onChange={(e) => setForm((p) => ({ ...p, hvac_strategy: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Any</option>
                  {hvacStrategies.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sustainability Target</Label>
                <select
                  value={form.sustainability_target}
                  onChange={(e) => setForm((p) => ({ ...p, sustainability_target: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">None</option>
                  {sustainabilityTargets.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Complexity</Label>
                <select
                  value={form.complexity}
                  onChange={(e) => setForm((p) => ({ ...p, complexity: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Any</option>
                  {complexities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Special Requirements</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {specialRequirements.map((req) => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => toggleSpecial(req)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.special_requirements.includes(req)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground'
                    }`}
                  >
                    {req}
                  </button>
                ))}
              </div>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !form.typology || form.built_up_area == null || !form.location_city || form.project_year == null}
            >
              {generating ? 'Generating...' : 'Generate Recommendations'}
            </Button>
            {results && results.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Recommendations
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({results.length} KPIs)
              </span>
            </h2>
          </div>

          {categoryOrder.map((cat) => {
            const catCards = grouped[cat];
            if (!catCards?.length) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catCards.map((card) => (
                    <Card key={card.kpi_code} className="border-border/80">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">{card.kpi_code}</p>
                            <p className="text-sm font-medium mt-0.5">{card.kpi_name}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${confidenceColor(card.confidence)}`}>
                            {card.confidence}
                          </span>
                        </div>
                        <p className="text-2xl font-semibold mt-2">
                          {card.recommended_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {card.unit}
                          </span>
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Range (15–85th)</span>
                            <p className="font-medium">{card.typical_range_min.toLocaleString()} &ndash; {card.typical_range_max.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Best Case</span>
                            <p className="font-medium text-green-600">{card.best_case.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Upper Range (75th)</span>
                            <p className="font-medium">{card.upper_range.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Projects</span>
                            <p className="font-medium">{card.similar_projects_count}{card.outliers_removed > 0 ? ` (${card.outliers_removed} outliers)` : ''}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Std Dev</span>
                            <p className="font-medium">{card.std_dev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CV</span>
                            <p className="font-medium">{(card.cv * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        {card.confidence_factors.length > 0 && (
                          <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                            {card.confidence_factors.map((f, i) => (
                              <p key={i}>&bull; {f}</p>
                            ))}
                          </div>
                        )}
                        {card.formula_description && (
                          <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
                            {card.formula_description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
