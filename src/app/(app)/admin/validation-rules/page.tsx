'use client';

import { useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/role-guard';
import {
  getValidationRules,
  createValidationRule,
  updateValidationRule,
  deleteValidationRule,
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
import type { ValidationRule, RuleType } from '@/types';

const ruleTypes: RuleType[] = ['required', 'min_value', 'max_value', 'cross_field'];

function ValidationRulesContent() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = { field_name: '', rule_type: 'required' as RuleType, rule_expression: '{}', error_message: '' };
  const [form, setForm] = useState(emptyForm);

  const fetch = () => {
    setLoading(true);
    getValidationRules()
      .then(setRules)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTimeout(fetch, 0); }, []);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (r: ValidationRule) => {
    setForm({
      field_name: r.field_name,
      rule_type: r.rule_type,
      rule_expression: JSON.stringify(r.rule_expression),
      error_message: r.error_message,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    let expr: Record<string, unknown> = {};
    try { expr = JSON.parse(form.rule_expression); } catch { expr = {}; }

    if (editingId) {
      await updateValidationRule(editingId, {
        field_name: form.field_name,
        rule_type: form.rule_type,
        rule_expression: expr,
        error_message: form.error_message,
      });
    } else {
      await createValidationRule({
        field_name: form.field_name,
        rule_type: form.rule_type,
        rule_expression: expr,
        error_message: form.error_message,
      });
    }
    reset();
    fetch();
  };

  const handleDelete = async (id: string) => {
    await deleteValidationRule(id);
    fetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Validation Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage validation rules that gate project submission.
          </p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true); }}>Add Rule</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Rule' : 'New Rule'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Field Name</Label>
                <Input
                  value={form.field_name}
                  onChange={(e) => setForm((p) => ({ ...p, field_name: e.target.value }))}
                  placeholder="e.g. built_up_area"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rule Type</Label>
                <select
                  value={form.rule_type}
                  onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value as RuleType }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {ruleTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rule Expression (JSON)</Label>
              <Input
                value={form.rule_expression}
                onChange={(e) => setForm((p) => ({ ...p, rule_expression: e.target.value }))}
                placeholder='{"min": 1}'
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Error Message</Label>
              <Textarea
                value={form.error_message}
                onChange={(e) => setForm((p) => ({ ...p, error_message: e.target.value }))}
                placeholder="Shown to the engineer when validation fails"
                className="text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
              <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Expression</TableHead>
            <TableHead>Error Message</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No validation rules yet.
              </TableCell>
            </TableRow>
          )}
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-xs">{rule.field_name}</TableCell>
              <TableCell><span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{rule.rule_type}</span></TableCell>
              <TableCell className="font-mono text-xs max-w-[200px] truncate">{JSON.stringify(rule.rule_expression)}</TableCell>
              <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{rule.error_message}</TableCell>
              <TableCell>
                <span className={`text-xs px-1.5 py-0.5 rounded ${rule.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                  {rule.is_active ? 'Yes' : 'No'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ValidationRulesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ValidationRulesContent />
    </RoleGuard>
  );
}
