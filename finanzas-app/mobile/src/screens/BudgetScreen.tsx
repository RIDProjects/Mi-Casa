import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BudgetCategory } from '../types';
import { BudgetStackParamList } from '../navigation/types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, Tone, toneInk, toneTint } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { ActionBar, Card, EmptyState, ErrorState, PageHeader, ProgressBar, ProgressRing, Reveal, Screen, Skeleton } from '../components/ui';
import CategoryNameModal from './budget/CategoryNameModal';
import { categoryMonthlyTotal } from './budget/shared';
import { useBudgetQuery } from './budget/useBudgetQuery';

const fmt = formatMoney;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    alertText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroText: { flex: 1, gap: 4 },
    eyebrow: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroAmount: { fontFamily: fonts.title, color: c.onSurface, fontSize: 30, letterSpacing: -0.8 },
    ringValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 18 },
    ringCaption: { fontFamily: fonts.medium, color: c.outline, fontSize: 10 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12, flexShrink: 1 },
    availableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    availableLabel: { fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 13 },
    availableValue: { fontFamily: fonts.title, fontSize: 17, flexShrink: 1 },
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    list: { gap: 10 },
    catCard: { gap: 10 },
    catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    catName: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14, flex: 1 },
    catTotal: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15 },
    catFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    catFooterText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    flex: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
    incomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    incomeIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    incomeText: { flex: 1, gap: 2 },
    incomeTitle: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    incomeMeta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    incomeTotal: { fontFamily: fonts.title, fontSize: 16 },
  });

function CategoryCard({ cat, total, onPress }: { cat: BudgetCategory; total: number; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const monthlyTotal = categoryMonthlyTotal(cat);
  const share = total > 0 ? monthlyTotal / total : 0;

  return (
    <Card style={styles.catCard} onPress={onPress}>
      <View style={styles.catHeader}>
        <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
        <Text style={styles.catTotal}>{fmt(monthlyTotal)}/mes</Text>
      </View>
      <ProgressBar value={share} tone="info" height={6} />
      <View style={styles.catFooter}>
        <Text style={styles.catFooterText}>
          {cat.expenses.length} {cat.expenses.length === 1 ? 'gasto' : 'gastos'}
        </Text>
        <Text style={styles.catFooterText}>{(share * 100).toFixed(0)}% del total</Text>
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  return (
    <View testID="budget-skeleton" style={{ gap: 14 }}>
      <Skeleton height={150} radius={radius.lg} />
      <Skeleton height={86} radius={radius.lg} />
      <Skeleton height={86} radius={radius.lg} />
    </View>
  );
}

export default function BudgetScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<BudgetStackParamList>>();
  const [addingCategory, setAddingCategory] = useState(false);
  const { data: budget, isLoading, isError, refetch } = useBudgetQuery();

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const header = (
    <Reveal index={0}>
      <PageHeader
        title="Presupuesto"
        subtitle={budget ? `${budget.name}${budget.year ? ` — ${budget.year}` : ''}` : undefined}
      />
    </Reveal>
  );

  if (isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Reveal index={1}>
          <Card>
            <ErrorState
              message="No se pudo cargar el presupuesto. Revisa tu conexión e inténtalo de nuevo."
              onRetry={() => refetch()}
            />
          </Card>
        </Reveal>
      </Screen>
    );
  }

  if (!budget) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Reveal index={1}>
          <Card>
            <EmptyState
              icon="pie-chart-outline"
              title="Sin presupuesto activo"
              subtitle="Crea un presupuesto desde la app web para verlo acá"
            />
          </Card>
        </Reveal>
      </Screen>
    );
  }

  const { summary } = budget;
  const overBudget = summary?.alerts?.overBudget ?? false;
  const income = summary?.totalMonthlyIncome ?? 0;
  const expenses = summary?.totalMonthlyExpenses ?? 0;
  const available = summary?.available ?? 0;
  const usedRatio = income > 0 ? Math.min(1, expenses / income) : 0;
  const usedPct = Math.round(usedRatio * 100);
  const heroTone: Tone = overBudget ? 'danger' : usedRatio > 0.8 ? 'warn' : 'ok';
  const categories = budget.categories ?? [];
  const incomeSources = budget.incomeSources ?? [];
  const incomeSourcesTotal = incomeSources.reduce((sum, i) => sum + Number(i.amount), 0);
  const categoriesTotal = categories.reduce((s, cat) => s + categoryMonthlyTotal(cat), 0);

  return (
    <Screen scroll={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
      {header}

      {overBudget && (
        <Reveal index={1}>
          <View
            style={[
              styles.alertBanner,
              { backgroundColor: toneTint(colors, 'danger'), borderColor: toneInk(colors, 'danger') + '40' },
            ]}
          >
            <Ionicons name="warning-outline" size={20} color={toneInk(colors, 'danger')} />
            <Text style={[styles.alertText, { color: toneInk(colors, 'danger') }]}>
              Los gastos superan los ingresos
            </Text>
          </View>
        </Reveal>
      )}

      <Reveal index={2}>
        <Card accent={toneInk(colors, heroTone)}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>Total presupuestado (mensual)</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {fmt(expenses)}
              </Text>
            </View>
            <ProgressRing value={usedRatio} size={84} thickness={9} color={toneInk(colors, heroTone)}>
              <Text style={styles.ringValue}>{usedPct}%</Text>
              <Text style={styles.ringCaption}>de ingresos</Text>
            </ProgressRing>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.okInk }]} />
              <Text style={styles.legendText}>Ingresos: {fmt(income)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.dangerInk }]} />
              <Text style={styles.legendText}>Gastos: {fmt(expenses)}</Text>
            </View>
          </View>
          <View style={styles.availableRow}>
            <Text style={styles.availableLabel}>Disponible</Text>
            <Text
              style={[styles.availableValue, { color: toneInk(colors, available >= 0 ? 'ok' : 'danger') }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fmt(available)}
            </Text>
          </View>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card onPress={() => navigation.navigate('IncomeSources')}>
          <View style={styles.incomeRow}>
            <View style={[styles.incomeIcon, { backgroundColor: toneTint(colors, 'ok') }]}>
              <Ionicons name="wallet-outline" size={19} color={toneInk(colors, 'ok')} />
            </View>
            <View style={styles.incomeText}>
              <Text style={styles.incomeTitle}>Ingresos</Text>
              <Text style={styles.incomeMeta}>
                {incomeSources.length} {incomeSources.length === 1 ? 'fuente' : 'fuentes'}
              </Text>
            </View>
            <Text style={[styles.incomeTotal, { color: toneInk(colors, 'ok') }]}>{fmt(incomeSourcesTotal)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </View>
        </Card>
      </Reveal>

      {categories.length > 0 && (
        <Reveal index={4} style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <View style={styles.list}>
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                total={categoriesTotal}
                onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id })}
              />
            ))}
          </View>
        </Reveal>
      )}
      </ScrollView>

      <ActionBar label="Nueva categoría" onPress={() => setAddingCategory(true)} />
      <CategoryNameModal visible={addingCategory} budgetId={budget.id} onClose={() => setAddingCategory(false)} />
    </Screen>
  );
}
