'use client';

import { useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/role-guard';
import {
  getKpiFormulas,
  createKpiFormula,
  updateKpiFormula,
  deleteKpiFormula,
} from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { KpiFormula, KpiCategory } from '@/types';

const categories: KpiCategory[] = ['Space Planning', 'HVAC', 'Electrical', 'DG', 'Sustainability', 'Cost'];

function KpiLibraryContent() {
  const [kpis, setKpis] = useState<KpiFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    kpi_code: '',
    kpi_name: '',
    category: 'Cost' as KpiCategory,
    numerator_expression: '',
    denominator_expression: '',
    unit: '',
    description: '',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchKpis = () => {
    setLoading(true);
    getKpiFormulas()
      .then(setKpis)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTimeout(fetchKpis, 0); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (kpi: KpiFormula) => {
    setForm({
      kpi_code: kpi.kpi_code,
      kpi_name: kpi.kpi_name,
      category: kpi.category,
      numerator_expression: kpi.numerator_expression,
      denominator_expression: kpi.denominator_expression,
      unit: kpi.unit,
      description: kpi.description,
    });
    setEditingId(kpi.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateKpiFormula(editingId, form);
    } else {
      await createKpiFormula(form);
    }
    resetForm();
    fetchKpis();
  };

  const handleDelete = async (id: string) => {
    await deleteKpiFormula(id);
    fetchKpis();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KPI Formula Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage KPI formula definitions used by the calculation engine.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>Add KPI</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit KPI' : 'New KPI'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">KPI Code</Label>
                <Input
                  value={form.kpi_code}
                  onChange={(e) => setForm((p) => ({ ...p, kpi_code: e.target.value }))}
                  placeholder="e.g. HVAC_RS_SQFT"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={form.kpi_name}
                  onChange={(e) => setForm((p) => ({ ...p, kpi_name: e.target.value }))}
                  placeholder="e.g. HVAC Rs/sqft"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as KpiCategory }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g. Rs/sqft"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Numerator Expression</Label>
                <Input
                  value={form.numerator_expression}
                  onChange={(e) => setForm((p) => ({ ...p, numerator_expression: e.target.value }))}
                  placeholder="e.g. HVAC Cost"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Denominator Expression</Label>
                <Input
                  value={form.denominator_expression}
                  onChange={(e) => setForm((p) => ({ ...p, denominator_expression: e.target.value }))}
                  placeholder="e.g. BUA"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Engineering interpretation"
                className="text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Formula</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No KPI definitions yet.
              </TableCell>
            </TableRow>
          )}
          {kpis.map((kpi) => (
            <TableRow key={kpi.id}>
              <TableCell className="font-mono text-xs">{kpi.kpi_code}</TableCell>
              <TableCell className="font-medium">{kpi.kpi_name}</TableCell>
              <TableCell>
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{kpi.category}</span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{kpi.unit}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {kpi.numerator_expression} &divide; {kpi.denominator_expression}
              </TableCell>
              <TableCell>
                <span className={`text-xs px-1.5 py-0.5 rounded ${kpi.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                  {kpi.is_active ? 'Yes' : 'No'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(kpi)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(kpi.id)}>Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function KpiLibraryPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <KpiLibraryContent />
    </RoleGuard>
  );
}
