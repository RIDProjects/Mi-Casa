import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../theme/colors';
import { budgetService } from '../services/budget.service';
import { BudgetCategory, Periodicity } from '../types';
import { formatMoney } from '../utils/currency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const fmt = formatMoney;

// Mirrors backend PERIODICITY_FACTOR (backend/src/budget/budget.service.ts)
const PERIODICITY_FACTOR: Record<Periodicity, number> = {
  daily: 1 / 30,
  weekly: 1 / 4,
  biweekly: 1 / 2,
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  fourmonthly: 4,
  semiannual: 6,
  annual: 12,
};

const toMonthly = (amount: number, periodicity: Periodicity) =>
  Number(amount) / PERIODICITY_FACTOR[periodicity];

function CategoryRow({ cat }: { cat: BudgetCategory }) {
  const monthlyTotal = cat.expenses.reduce(
    (s, e) => s + toMonthly(e.amount, e.periodicity),
    0,
  );

  return (
    <View style={catStyles.row}>
      <View style={catStyles.header}>
        <Text style={catStyles.name}>{cat.name}</Text>
        <Text style={catStyles.budgeted}>{fmt(monthlyTotal)}/mes</Text>
      </View>
      <Text style={catStyles.count}>
        {cat.expenses.length} {cat.expenses.length === 1 ? 'gasto' : 'gastos'}
      </Text>
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  budgeted: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  count: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});

export default function BudgetScreen() {
  const {
    data: budget,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['budget'],
    queryFn: budgetService.getCurrent,
    staleTime: 0,
    retry: 1,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner message="Cargando presupuesto..." />;

  if (!budget) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.title}>Presupuesto</Text>
        </View>
        <EmptyState
          icon="pie-chart-outline"
          title="Sin presupuesto activo"
          subtitle="Creá un presupuesto desde la app web para verlo acá"
        />
      </SafeAreaView>
    );
  }

  const { summary } = budget;
  const overBudget = summary?.alerts?.overBudget ?? false;
  const pctGlobal = (summary?.totalMonthlyIncome ?? 0) > 0
    ? Math.min(100, ((summary?.totalMonthlyExpenses ?? 0) / summary.totalMonthlyIncome) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Presupuesto</Text>
            <Text style={styles.subtitle}>
              {budget.name}{budget.year ? ` — ${budget.year}` : ''}
            </Text>
          </View>
        </View>

        {/* Alerta de excedido */}
        {overBudget && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning-outline" size={18} color={Colors.red} />
            <Text style={styles.alertText}>Los gastos superan los ingresos</Text>
          </View>
        )}

        {/* Resumen global */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total presupuestado (mensual)</Text>
            <Text style={styles.summaryValue}>{fmt(summary?.totalMonthlyExpenses ?? 0)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pctGlobal}%` as any,
                  backgroundColor: overBudget ? Colors.red : Colors.blue,
                },
              ]}
            />
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.green }]} />
              <Text style={styles.legendText}>Ingresos: {fmt(summary?.totalMonthlyIncome ?? 0)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.red }]} />
              <Text style={styles.legendText}>Gastos: {fmt(summary?.totalMonthlyExpenses ?? 0)}</Text>
            </View>
          </View>
          <View style={[styles.summaryRow, styles.borderTop]}>
            <Text style={styles.summaryLabel}>Disponible</Text>
            <Text style={[
              styles.summaryValue,
              {
                color: (summary?.available ?? 0) >= 0
                  ? Colors.green
                  : Colors.red,
              },
            ]}>
              {fmt(summary?.available ?? 0)}
            </Text>
          </View>
        </View>

        {/* Categorías */}
        {budget.categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <View style={styles.categoriesList}>
              {budget.categories.map((cat) => (
                <CategoryRow key={cat.id} cat={cat} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.redBg,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  alertText: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  section: { gap: 12 },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  categoriesList: { gap: 8 },
});
