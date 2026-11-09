import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService, PlanParamKey, PlanPatch } from '../../services/budget.service';
import { Budget } from '../../types';
import { TextField } from '../../components/ui';
import FormModal from './FormModal';
import { errorMessage, invalidateBudget, parseAmount } from './shared';

interface Props {
  visible: boolean;
  budget: Budget;
  onClose: () => void;
}

interface PlanField {
  key: PlanParamKey;
  label: string;
  max: number;
  /** Default when the budget has no override, by budget rule. */
  defaultFor: (rule: Budget['rule']) => number;
}

// Mirrors the backend limits/defaults (budget plan params).
const PLAN_FIELDS: PlanField[] = [
  { key: 'fiMultiplier', label: 'Meta FI (× ingreso mensual)', max: 1000, defaultFor: () => 150 },
  { key: 'minInvestmentPercent', label: 'Inversión mínima (%)', max: 100, defaultFor: () => 20 },
  { key: 'emergencyFundMonths', label: 'Fondo de emergencia (meses)', max: 120, defaultFor: () => 6 },
  { key: 'entertainmentPercent', label: 'Ocio (%)', max: 100, defaultFor: (r) => (r === '70-20-10' ? 10 : 30) },
  { key: 'fixedExpensesCapPercent', label: 'Tope gastos fijos (%)', max: 100, defaultFor: (r) => (r === '70-20-10' ? 70 : 50) },
];

const effectiveValue = (budget: Budget, field: PlanField): string => {
  const override = budget[field.key];
  const value = override == null || override === '' ? field.defaultFor(budget.rule) : Number(override);
  return String(value);
};

const ALL_NULL: PlanPatch = {
  fiMultiplier: null,
  minInvestmentPercent: null,
  emergencyFundMonths: null,
  entertainmentPercent: null,
  fixedExpensesCapPercent: null,
};

export default function PlanParamsModal({ visible, budget, onClose }: Props) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setValues(Object.fromEntries(PLAN_FIELDS.map((f) => [f.key, effectiveValue(budget, f)])));
      setErrors({});
    }
  }, [visible, budget]);

  const mutation = useMutation({
    mutationFn: (patch: PlanPatch) => budgetService.updatePlan(budget.id, patch),
    onSuccess: () => {
      invalidateBudget(qc);
      onClose();
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    const patch: PlanPatch = {};
    for (const field of PLAN_FIELDS) {
      const parsed = parseAmount(values[field.key] ?? '');
      if (Number.isNaN(parsed)) {
        nextErrors[field.key] = 'Ingresa un número.';
      } else if (parsed < 0 || parsed > field.max) {
        nextErrors[field.key] = `Debe estar entre 0 y ${field.max}.`;
      } else {
        patch[field.key] = parsed;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    mutation.mutate(patch);
  };

  return (
    <FormModal
      visible={visible}
      title="Parámetros del plan"
      subtitle="Ajusta las metas de tu plan financiero."
      submitLabel="Guardar"
      submitting={mutation.isPending}
      onSubmit={submit}
      onClose={onClose}
      onDelete={() => mutation.mutate(ALL_NULL)}
      deleteLabel="Restablecer valores"
      deleteTone="neutral"
    >
      {PLAN_FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          accessibilityLabel={field.label}
          value={values[field.key] ?? ''}
          onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
          keyboardType="decimal-pad"
          error={errors[field.key] ?? null}
          editable={!mutation.isPending}
        />
      ))}
    </FormModal>
  );
}
