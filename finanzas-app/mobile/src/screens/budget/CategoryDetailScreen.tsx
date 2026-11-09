import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../../services/budget.service';
import { AutoDebtLine, BudgetExpense } from '../../types';
import { BudgetStackParamList } from '../../navigation/types';
import { useMoney } from '../../hooks/useMoney';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { ActionBar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Reveal, Screen, Skeleton } from '../../components/ui';
import CategoryNameModal from './CategoryNameModal';
import ExpenseFormModal from './ExpenseFormModal';
import { categoryAutoLines, categoryMonthlyTotal, errorMessage, invalidateBudget, PERIODICITY_LABELS, toMonthly } from './shared';
import { useBudgetQuery } from './useBudgetQuery';


type RouteT = RouteProp<BudgetStackParamList, 'CategoryDetail'>;

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
    heroAmount: { fontFamily: fonts.title, color: c.onSurface, fontSize: 30, letterSpacing: -0.8 },
    heroMeta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13, marginTop: 2 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    list: { gap: 10 },
    expenseCard: { gap: 8 },
    expenseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    expenseName: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15, flex: 1 },
    expenseMonthly: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15 },
    expenseMeta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    skeleton: { gap: 14, borderRadius: radius.lg },
  });

function AutoDebtCard({ line }: { line: AutoDebtLine }) {
  const styles = useThemedStyles(createStyles);
  const fmt = useMoney();
  return (
    <Card style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseName} numberOfLines={2}>{line.label}</Text>
        <Text style={styles.expenseMonthly}>{fmt(line.monthlyAmount)}/mes</Text>
      </View>
      <Text style={styles.expenseMeta}>Mensual · saldo {fmt(line.balance)}</Text>
      <View style={styles.badgeRow}>
        <Badge label="Automático" tone="info" />
        {line.estimated && <Badge label="Estimado" tone="neutral" />}
      </View>
    </Card>
  );
}

function ExpenseCard({ expense, onPress }: { expense: BudgetExpense; onPress: () => void }) {
  const code = expense.currencyCode ?? undefined;
  const styles = useThemedStyles(createStyles);
  const fmt = useMoney();
  return (
    <Card style={styles.expenseCard} onPress={onPress}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseName} numberOfLines={2}>{expense.name}</Text>
        <Text style={styles.expenseMonthly}>{fmt(toMonthly(expense.amount, expense.periodicity), code)}/mes</Text>
      </View>
      <Text style={styles.expenseMeta}>
        {PERIODICITY_LABELS[expense.periodicity]} · {fmt(Number(expense.amount), code)}
      </Text>
      {(expense.isFixed || expense.isCreditCard || expense.isAntExpense) && (
        <View style={styles.badgeRow}>
          {expense.isFixed && <Badge label="Fijo" tone="info" />}
          {expense.isCreditCard && <Badge label="Tarjeta" tone="neutral" />}
          {expense.isAntExpense && <Badge label="Hormiga" tone="warn" />}
        </View>
      )}
    </Card>
  );
}

export default function CategoryDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const fmt = useMoney();
  const navigation = useNavigation();
  const { categoryId } = useRoute<RouteT>().params;
  const qc = useQueryClient();
  const { data: budget, isLoading, isError, refetch } = useBudgetQuery();
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const [expenseForm, setExpenseForm] = useState<{ open: boolean; expense: BudgetExpense | null }>({ open: false, expense: null });
  const [renaming, setRenaming] = useState(false);

  const category = budget?.categories?.find((c) => c.id === categoryId);

  const deleteExpense = useMutation({
    mutationFn: (id: string) => budgetService.removeExpense(id),
    onSuccess: () => {
      invalidateBudget(qc);
      setExpenseForm({ open: false, expense: null });
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => budgetService.removeCategory(id),
    onSuccess: () => {
      invalidateBudget(qc);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const confirmDeleteExpense = (expense: BudgetExpense) =>
    Alert.alert('¿Eliminar gasto?', `Se eliminará "${expense.name}". Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense.mutate(expense.id) },
    ]);

  const confirmDeleteCategory = () =>
    Alert.alert(
      '¿Eliminar categoría?',
      'Se eliminarán todos los gastos de esta categoría. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteCategory.mutate(categoryId) },
      ],
    );

  const body = () => {
    if (isLoading) {
      return (
        <View testID="category-skeleton" style={styles.skeleton}>
          <Skeleton height={110} radius={radius.lg} />
          <Skeleton height={80} radius={radius.lg} />
          <Skeleton height={80} radius={radius.lg} />
        </View>
      );
    }
    if (isError) {
      return (
        <Card>
          <ErrorState
            message="No se pudo cargar la categoría. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      );
    }
    if (!budget || !category) {
      return (
        <Card>
          <EmptyState icon="pricetag-outline" title="Categoría no encontrada" subtitle="Puede que ya haya sido eliminada" />
        </Card>
      );
    }

    const expenses = category.expenses ?? [];
    const autoLines = categoryAutoLines(category, budget);
    const autoTotal = autoLines.reduce((s, l) => s + Number(l.monthlyAmount), 0);
    const count = expenses.length + autoLines.length;
    return (
      <>
        <Reveal index={0}>
          <PageHeader title={category.name} />
        </Reveal>

        <Reveal index={1}>
          <Card accent={colors.brand}>
            <Text style={styles.eyebrow}>Total mensual</Text>
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(categoryMonthlyTotal(category, budget.rates) + autoTotal)}/mes
            </Text>
            <Text style={styles.heroMeta}>
              {count} {count === 1 ? 'gasto' : 'gastos'}
            </Text>
          </Card>
        </Reveal>

        <Reveal index={2} style={styles.actionsRow}>
          <Button label="Renombrar" icon="create-outline" variant="secondary" small onPress={() => setRenaming(true)} />
          {category.isDefault ? (
            <Badge label="Categoría predeterminada" tone="neutral" />
          ) : (
            <Button
              label="Eliminar categoría"
              icon="trash-outline"
              variant="danger"
              small
              loading={deleteCategory.isPending}
              onPress={confirmDeleteCategory}
            />
          )}
        </Reveal>

        {count === 0 ? (
          <Reveal index={3}>
            <Card>
              <EmptyState
                icon="receipt-outline"
                title="Sin gastos en esta categoría"
                subtitle="Usa el botón de abajo para agregar el primero"
              />
            </Card>
          </Reveal>
        ) : (
          <Reveal index={3} style={styles.section}>
            <Text style={styles.sectionTitle}>Gastos</Text>
            <View style={styles.list}>
              {expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} onPress={() => setExpenseForm({ open: true, expense })} />
              ))}
              {autoLines.map((line) => (
                <AutoDebtCard key={`${line.source}-${line.id}`} line={line} />
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

      {category && <ActionBar label="Nuevo gasto" onPress={() => setExpenseForm({ open: true, expense: null })} />}

      {category && (
        <>
          <ExpenseFormModal
            visible={expenseForm.open}
            categoryId={category.id}
            expense={expenseForm.expense}
            currencies={budget?.currencies}
            localCurrency={budget?.localCurrency}
            onClose={() => setExpenseForm((f) => ({ ...f, open: false }))}
            onDelete={expenseForm.expense ? () => confirmDeleteExpense(expenseForm.expense!) : undefined}
          />
          <CategoryNameModal
            visible={renaming}
            budgetId={budget!.id}
            category={category}
            onClose={() => setRenaming(false)}
          />
        </>
      )}
    </Screen>
  );
}
