import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../../services/budget.service';
import { BudgetCategory } from '../../types';
import { TextField } from '../../components/ui';
import FormModal from './FormModal';
import { errorMessage, invalidateBudget } from './shared';

interface Props {
  visible: boolean;
  budgetId: string;
  /** Category being renamed; null/undefined creates a new one. */
  category?: Pick<BudgetCategory, 'id' | 'name'> | null;
  onClose: () => void;
}

export default function CategoryNameModal({ visible, budgetId, category, onClose }: Props) {
  const qc = useQueryClient();
  const isEditing = !!category;
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(category?.name ?? '');
      setError(null);
    }
  }, [visible, category]);

  const mutation = useMutation({
    mutationFn: (trimmed: string) =>
      isEditing
        ? budgetService.updateCategory(category!.id, { name: trimmed })
        : budgetService.addCategory(budgetId, { name: trimmed }),
    onSuccess: () => {
      invalidateBudget(qc);
      onClose();
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Ingresa un nombre.');
      return;
    }
    setError(null);
    mutation.mutate(trimmed);
  };

  return (
    <FormModal
      visible={visible}
      title={isEditing ? 'Renombrar categoría' : 'Nueva categoría'}
      submitLabel="Guardar"
      submitting={mutation.isPending}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label="Nombre"
        accessibilityLabel="Nombre de la categoría"
        icon="pricetag-outline"
        value={name}
        onChangeText={setName}
        placeholder="Casa, Transporte..."
        error={error}
        editable={!mutation.isPending}
        autoFocus
      />
    </FormModal>
  );
}
