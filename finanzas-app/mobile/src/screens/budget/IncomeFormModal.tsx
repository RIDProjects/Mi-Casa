import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService, IncomePayload } from '../../services/budget.service';
import { BudgetIncomeSource } from '../../types';
import { TextField } from '../../components/ui';
import ChipSelector from './ChipSelector';
import FormModal from './FormModal';
import { errorMessage, INCOME_TYPE_OPTIONS, invalidateBudget, parseAmount } from './shared';

interface Props {
  visible: boolean;
  budgetId: string;
  /** Income source being edited; null/undefined creates a new one. */
  income?: BudgetIncomeSource | null;
  onClose: () => void;
  onDelete?: () => void;
}

export default function IncomeFormModal({ visible, budgetId, income, onClose, onDelete }: Props) {
  const qc = useQueryClient();
  const isEditing = !!income;
  const [name, setName] = useState('');
  const [type, setType] = useState('salary');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  useEffect(() => {
    if (visible) {
      setName(income?.name ?? '');
      setType(income?.type ?? 'salary');
      setAmount(income ? String(income.amount) : '');
      setErrors({});
    }
  }, [visible, income]);

  const mutation = useMutation({
    mutationFn: (payload: IncomePayload) =>
      isEditing ? budgetService.updateIncome(income!.id, payload) : budgetService.addIncome(budgetId, payload),
    onSuccess: () => {
      invalidateBudget(qc);
      onClose();
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const submit = () => {
    const next: { name?: string; amount?: string } = {};
    const trimmed = name.trim();
    const value = parseAmount(amount);
    if (!trimmed) next.name = 'Ingresa un nombre.';
    if (isNaN(value) || value < 0) next.amount = 'Ingresa un monto válido (cero o más).';
    setErrors(next);
    if (next.name || next.amount) return;
    mutation.mutate({ name: trimmed, type, amount: value });
  };

  const busy = mutation.isPending;
  // Legacy types (e.g. "fixed") are not selectable, but must survive an edit that does not touch them.
  const typeOptions = INCOME_TYPE_OPTIONS.some((o) => o.value === type)
    ? INCOME_TYPE_OPTIONS
    : [...INCOME_TYPE_OPTIONS, { value: type, label: type }];

  return (
    <FormModal
      visible={visible}
      title={isEditing ? 'Editar ingreso' : 'Nuevo ingreso'}
      submitLabel="Guardar"
      submitting={busy}
      onSubmit={submit}
      onClose={onClose}
      onDelete={isEditing ? onDelete : undefined}
      deleteLabel="Eliminar ingreso"
    >
      <TextField
        label="Nombre"
        accessibilityLabel="Nombre del ingreso"
        icon="create-outline"
        value={name}
        onChangeText={setName}
        placeholder="Sueldo, Freelance..."
        error={errors.name}
        editable={!busy}
      />
      <TextField
        label="Monto mensual"
        accessibilityLabel="Monto mensual"
        icon="cash-outline"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
        editable={!busy}
      />
      <ChipSelector label="Tipo de ingreso" options={typeOptions} value={type} onChange={setType} disabled={busy} />
    </FormModal>
  );
}
