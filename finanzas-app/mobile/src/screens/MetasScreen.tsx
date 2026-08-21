import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../theme/colors';
import { savingsService } from '../services/savings.service';
import { SavingsGoal } from '../types';
import { formatMoney } from '../utils/currency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const fmt = formatMoney;

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const pct = goal.progressPercentage ?? (
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0
  );
  const isComplete = pct >= 100;
  const fillColor = isComplete ? Colors.green : Colors.blue;

  return (
    <View style={[styles.goalCard, isComplete && styles.goalCardComplete]}>
      {/* Title row */}
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconWrap, { backgroundColor: isComplete ? Colors.greenBg : Colors.blueBg }]}>
          <Ionicons
            name={isComplete ? 'checkmark-circle-outline' : 'trophy-outline'}
            size={18}
            color={fillColor}
          />
        </View>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
          {goal.deadline && (
            <Text style={styles.goalDeadline}>
              Plazo: {new Date(goal.deadline).toLocaleDateString('es-CU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>
        <View style={[styles.pctBadge, { backgroundColor: isComplete ? Colors.greenBg : Colors.blueBg }]}>
          <Text style={[styles.pctText, { color: fillColor }]}>{pct.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Description */}
      {goal.description ? (
        <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
      ) : null}

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%` as any, backgroundColor: fillColor },
          ]}
        />
      </View>

      {/* Amounts */}
      <View style={styles.goalAmounts}>
        <View>
          <Text style={styles.amountLabel}>Ahorrado</Text>
          <Text style={[styles.amountValue, { color: Colors.green }]}>
            {fmt(goal.currentAmount)}
          </Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountLabel}>Objetivo</Text>
          <Text style={styles.amountValue}>{fmt(goal.targetAmount)}</Text>
        </View>
      </View>

      {isComplete && (
        <View style={styles.completeBanner}>
          <Ionicons name="checkmark-circle" size={15} color={Colors.green} />
          <Text style={styles.completeText}>Meta alcanzada</Text>
        </View>
      )}
    </View>
  );
}

export default function MetasScreen() {
  const {
    data: goals = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: savingsService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner message="Cargando metas..." />;

  const completed = goals.filter((g) => g.progressPercentage >= 100 || g.isCompleted).length;
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GoalCard goal={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
        ListHeaderComponent={
          <View style={styles.topSection}>
            <Text style={styles.screenTitle}>Metas de Ahorro</Text>
            {goals.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Metas activas</Text>
                    <Text style={styles.summaryValue}>{goals.length - completed}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Completadas</Text>
                    <Text style={[styles.summaryValue, { color: Colors.green }]}>{completed}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total ahorrado</Text>
                    <Text style={[styles.summaryValue, { color: Colors.blue }]}>
                      {fmt(totalSaved)}
                    </Text>
                  </View>
                </View>
                {totalTarget > 0 && (
                  <>
                    <View style={styles.globalBarBg}>
                      <View
                        style={[
                          styles.globalBarFill,
                          { width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={styles.globalPct}>
                      {Math.min(100, ((totalSaved / totalTarget) * 100)).toFixed(1)}% del objetivo total: {fmt(totalTarget)}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="Sin metas registradas"
            subtitle="Creá tus metas de ahorro desde la app web"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 40 },
  topSection: { marginBottom: 16, gap: 14 },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  globalBarBg: {
    height: 6,
    backgroundColor: Colors.cardAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  globalBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.blue,
  },
  globalPct: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  // Goal card
  goalCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 10,
  },
  goalCardComplete: {
    borderColor: Colors.green + '50',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitleBlock: {
    flex: 1,
    gap: 2,
  },
  goalName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  goalDeadline: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  barBg: {
    height: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  amountValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  amountDivider: {
    flex: 1,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.greenBg,
    borderRadius: 8,
    paddingVertical: 8,
  },
  completeText: {
    color: Colors.green,
    fontSize: 13,
    fontWeight: '700',
  },
});
