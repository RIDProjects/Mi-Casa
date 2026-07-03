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
import { BudgetCategory } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function CategoryRow({ cat }: { cat: BudgetCategory }) {
  const overBudget = cat.spent > cat.budgeted;
  const pct = cat.budgeted > 0
    ? Math.min(100, (cat.spent / cat.budgeted) * 100)
    : 0;
  const fillColor = overBudget ? Colors.red : pct > 80 ? '#f59e0b' : Colors.green;

  return (
    <View style={catStyles.row}>
      <View style={catStyles.header}>
        <Text style={catStyles.name}>{cat.name}</Text>
        <View style={catStyles.amounts}>
          <Text style={[catStyles.spent, { color: overBudget ? Colors.red : Colors.textPrimary }]}>
            $ {fmt(cat.spent)}
          </Text>
          <Text style={catStyles.slash}> / </Text>
          <Text style={catStyles.budgeted}>$ {fmt(cat.budgeted)}</Text>
        </View>
      </View>
      <View style={catStyles.barBg}>
        <View
          style={[
            catStyles.barFill,
            { width: `${pct}%` as any, backgroundColor: fillColor },
          ]}
        />
      </View>
      <View style={catStyles.footer}>
        <Text style={[catStyles.pct, { color: fillColor }]}>
          {pct.toFixed(0)}% usado
        </Text>
        <Text style={[catStyles.remaining, { color: overBudget ? Colors.red : Colors.textSecondary }]}>
          {overBudget ? `+$ ${fmt(cat.spent - cat.budgeted)} excedido` : `$ ${fmt(cat.remaining)} restante`}
        </Text>
      </View>
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
  amounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spent: {
    fontSize: 14,
    fontWeight: '700',
  },
  slash: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  budgeted: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.cardAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pct: {
    fontSize: 12,
    fontWeight: '600',
  },
  remaining: {
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
  const pctGlobal = summary?.totalBudgeted > 0
    ? Math.min(100, (summary.totalGastos / summary.totalBudgeted) * 100)
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
              {budget.name} — {MONTH_NAMES[(budget.month ?? 1) - 1]} {budget.year}
            </Text>
          </View>
        </View>

        {/* Alerta de excedido */}
        {overBudget && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning-outline" size={18} color={Colors.red} />
            <Text style={styles.alertText}>
              Presupuesto excedido
              {summary.alerts.categories?.length > 0
                ? `: ${summary.alerts.categories.join(', ')}`
                : ''}
            </Text>
          </View>
        )}

        {/* Resumen global */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total presupuestado</Text>
            <Text style={styles.summaryValue}>$ {fmt(summary?.totalBudgeted ?? 0)}</Text>
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
              <Text style={styles.legendText}>Ingresos: $ {fmt(summary?.totalIngresos ?? 0)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.red }]} />
              <Text style={styles.legendText}>Gastos: $ {fmt(summary?.totalGastos ?? 0)}</Text>
            </View>
          </View>
          <View style={[styles.summaryRow, styles.borderTop]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[
              styles.summaryValue,
              {
                color: (summary?.totalIngresos ?? 0) >= (summary?.totalGastos ?? 0)
                  ? Colors.green
                  : Colors.red,
              },
            ]}>
              $ {fmt((summary?.totalIngresos ?? 0) - (summary?.totalGastos ?? 0))}
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
