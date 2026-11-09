import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService, ExpensePayload } from '../../services/budget.service';
import { BudgetExpense, Periodicity } from '../../types';
import { TextField } from '../../components/ui';
import ChipSelector from './ChipSelector';
import CurrencyChips from './CurrencyChips';
import FormModal from './FormModal';
import { errorMessage, invalidateBudget, parseAmount, PERIODICITY_OPTIONS } from './shared';

type FlagKey = 'isFixed' | 'isCreditCard' | 'isAntExpense';

const FLAG_OPTIONS = [
  { value: 'isFixed', label: 'Fijo' },
  { value: 'isCreditCard', label: 'Tarjeta' },
  { value: 'isAntExpense', label: 'Hormiga' },
] as { value: FlagKey; label: string }[];

interface Props {
  visible: boolean;
  categoryId: string;
  /** Expense being edited; null/undefined creates a new one. */
  expense?: BudgetExpense | null;
  currencies?: { code: string; symbol: string }[];
  localCurrency?: string | null;
  onClose: () => void;
  onDelete?: () => void;
}

export default function ExpenseFormModal({ visible, categoryId, expense, currencies, localCurrency, onClose, onDelete }: Props) {
  const qc = useQueryClient();
  const isEditing = !!expense;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [periodicity, setPeriodicity] = useState<Periodicity>('monthly');
  const [currency, setCurrency] = useState('');
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({ isFixed: false, isCreditCard: false, isAntExpense: false });
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  useEffect(() => {
    if (visible) {
      setName(expense?.name ?? '');
      setAmount(expense ? String(expense.amount) : '');
      setPeriodicity(expense?.periodicity ?? 'monthly');
      setCurrency(expense?.currencyCode ?? localCurrency ?? '');
      setFlags({
        isFixed: !!expense?.isFixed,
        isCreditCard: !!expense?.isCreditCard,
        isAntExpense: !!expense?.isAntExpense,
      });
      setErrors({});
    }
  }, [visible, expense, localCurrency]);

  const mutation = useMutation({
    mutationFn: (payload: ExpensePayload) =>
      isEditing ? budgetService.updateExpense(expense!.id, payload) : budgetService.addExpense(categoryId, payload),
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
    mutation.mutate({ name: trimmed, amount: value, periodicity, ...flags, ...(currency ? { currencyCode: currency } : {}) });
  };

  const busy = mutation.isPending;

  return (
    <FormModal
      visible={visible}
      title={isEditing ? 'Editar gasto' : 'Nuevo gasto'}
      submitLabel="Guardar"
      submitting={busy}
      onSubmit={submit}
      onClose={onClose}
      onDelete={isEditing ? onDelete : undefined}
      deleteLabel="Eliminar gasto"
    >
      <TextField
        label="Nombre del gasto"
        accessibilityLabel="Nombre del gasto"
        icon="create-outline"
        value={name}
        onChangeText={setName}
        placeholder="Ej: Netflix, Supermercado..."
        error={errors.name}
        editable={!busy}
      />
      <TextField
        label="Monto"
        accessibilityLabel="Monto"
        icon="cash-outline"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
        editable={!busy}
      />
      <CurrencyChips currencies={currencies} value={currency} onChange={setCurrency} disabled={busy} />
      <ChipSelector label="Periodicidad" options={PERIODICITY_OPTIONS} value={periodicity} onChange={setPeriodicity} disabled={busy} />
      <ChipSelector
        label="Etiquetas"
        options={FLAG_OPTIONS}
        value={FLAG_OPTIONS.filter((o) => flags[o.value]).map((o) => o.value)}
        onChange={(key) => setFlags((f) => ({ ...f, [key]: !f[key] }))}
        disabled={busy}
      />
    </FormModal>
  );
}
