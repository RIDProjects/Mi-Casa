import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../../services/budget.service';
import { BudgetIncomeSource } from '../../types';
import { formatMoney } from '../../utils/currency';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius, toneInk } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { ActionBar, Badge, Card, EmptyState, ErrorState, PageHeader, Reveal, Screen, Skeleton } from '../../components/ui';
import IncomeFormModal from './IncomeFormModal';
import { errorMessage, INCOME_TYPE_LABELS, invalidateBudget } from './shared';
import { useBudgetQuery } from './useBudgetQuery';

const fmt = formatMoney;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
    eyebrow: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroAmount: { fontFamily: fonts.title, fontSize: 30, letterSpacing: -0.8 },
    heroMeta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13, marginTop: 2 },
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    rowText: { flex: 1, gap: 6 },
    name: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    amount: { fontFamily: fonts.title, color: c.onSurface, fontSize: 16 },
    skeleton: { gap: 14 },
  });

export default function IncomeSourcesScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const qc = useQueryClient();
  const { data: budget, isLoading, isError, refetch } = useBudgetQuery();
  const { refreshing, onRefresh } = useManualRefresh(refetch);
  const [form, setForm] = useState<{ open: boolean; income: BudgetIncomeSource | null }>({ open: false, income: null });

  const deleteIncome = useMutation({
    mutationFn: (id: string) => budgetService.removeIncome(id),
    onSuccess: () => {
      invalidateBudget(qc);
      setForm({ open: false, income: null });
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const confirmDelete = (income: BudgetIncomeSource) =>
    Alert.alert('¿Eliminar ingreso?', `Se eliminará "${income.name}". Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteIncome.mutate(income.id) },
    ]);

  const sources = budget?.incomeSources ?? [];
  const total = sources.reduce((s, i) => s + Number(i.amount), 0);

  const body = () => {
    if (isLoading) {
      return (
        <View testID="income-skeleton" style={styles.skeleton}>
          <Skeleton height={110} radius={radius.lg} />
          <Skeleton height={72} radius={radius.lg} />
          <Skeleton height={72} radius={radius.lg} />
        </View>
      );
    }
    if (isError || !budget) {
      return (
        <Card>
          <ErrorState
            message="No se pudieron cargar los ingresos. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      );
    }
    return (
      <>
        <Reveal index={0}>
          <PageHeader title="Ingresos" subtitle={budget.name} />
        </Reveal>

        <Reveal index={1}>
          <Card accent={toneInk(colors, 'ok')}>
            <Text style={styles.eyebrow}>Total mensual</Text>
            <Text style={[styles.heroAmount, { color: toneInk(colors, 'ok') }]} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(total)}
            </Text>
            <Text style={styles.heroMeta}>
              {sources.length} {sources.length === 1 ? 'fuente' : 'fuentes'}
            </Text>
          </Card>
        </Reveal>

        {sources.length === 0 ? (
          <Reveal index={2}>
            <Card>
              <EmptyState
                icon="wallet-outline"
                title="Sin fuentes de ingreso"
                subtitle="Usa el botón de abajo para agregar tu primer ingreso"
              />
            </Card>
          </Reveal>
        ) : (
          <Reveal index={2} style={styles.section}>
            <Text style={styles.sectionTitle}>Fuentes</Text>
            <View style={styles.list}>
              {sources.map((income) => (
                <Card key={income.id} onPress={() => setForm({ open: true, income })}>
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={2}>{income.name}</Text>
                      <Badge label={INCOME_TYPE_LABELS[income.type] ?? income.type} tone="ok" />
                    </View>
                    <Text style={styles.amount}>{fmt(Number(income.amount))}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </Reveal>
        )}
      </>
    );
  };

  return (
    <Screen scroll={false} edges={[]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
        {body()}
      </ScrollView>

      {budget && <ActionBar label="Nuevo ingreso" onPress={() => setForm({ open: true, income: null })} />}

      {budget && (
        <IncomeFormModal
          visible={form.open}
          budgetId={budget.id}
          income={form.income}
          onClose={() => setForm((f) => ({ ...f, open: false }))}
          onDelete={form.income ? () => confirmDelete(form.income!) : undefined}
        />
      )}
    </Screen>
  );
}
