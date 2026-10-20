import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { savingsService } from '../services/savings.service';
import { SavingsGoal } from '../types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, Tone, toneInk, toneTint } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Badge, Card, EmptyState, ErrorState, PageHeader, ProgressBar, ProgressRing, Reveal, Screen, Skeleton } from '../components/ui';

const fmt = formatMoney;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroText: { flex: 1, gap: 4 },
    eyebrow: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroAmount: { fontFamily: fonts.title, fontSize: 30, letterSpacing: -0.8 },
    heroMeta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    ringValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 18 },
    ringCaption: { fontFamily: fonts.medium, color: c.outline, fontSize: 10 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, gap: 4 },
    statLabel: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 10.5,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    statValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 21, letterSpacing: -0.5 },
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    list: { gap: 10 },
    goalCard: { gap: 12 },
    goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    goalIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    goalTitleBlock: { flex: 1, gap: 2 },
    goalName: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    goalDeadline: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    goalPct: { fontFamily: fonts.title, fontSize: 17 },
    goalAmounts: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    amountBlock: { flexShrink: 1 },
    amountBlockEnd: { flexShrink: 1, alignItems: 'flex-end' },
    amountLabel: { fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 12, marginBottom: 2 },
    amountValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 16 },
  });

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pct = goal.progress ?? (
    goal.montoMeta > 0
      ? Math.min(100, (goal.ahorrosActuales / goal.montoMeta) * 100)
      : 0
  );
  const isComplete = pct >= 100;
  const tone: Tone = isComplete ? 'ok' : 'info';
  const ink = toneInk(colors, tone);

  return (
    <Card accent={isComplete ? ink : undefined} style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconWrap, { backgroundColor: toneTint(colors, tone) }]}>
          <Ionicons
            name={isComplete ? 'checkmark-circle-outline' : 'trophy-outline'}
            size={19}
            color={ink}
          />
        </View>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.goalName} numberOfLines={1}>
            {goal.emoji ? `${goal.emoji} ` : ''}{goal.nombre}
          </Text>
          {goal.mesesParaAhorrarla > 0 && (
            <Text style={styles.goalDeadline}>
              {goal.mesesParaAhorrarla} {goal.mesesParaAhorrarla === 1 ? 'mes' : 'meses'} para lograrla
            </Text>
          )}
        </View>
        <Text style={[styles.goalPct, { color: ink }]}>{pct.toFixed(0)}%</Text>
      </View>

      <ProgressBar value={pct / 100} tone={tone} />

      <View style={styles.goalAmounts}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Ahorrado</Text>
          <Text style={[styles.amountValue, { color: toneInk(colors, 'ok') }]} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(goal.ahorrosActuales)}
          </Text>
        </View>
        <View style={styles.amountBlockEnd}>
          <Text style={styles.amountLabel}>Objetivo</Text>
          <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(goal.montoMeta)}</Text>
        </View>
      </View>

      {isComplete && <Badge label="Meta alcanzada" tone="ok" />}
    </Card>
  );
}

function SkeletonBlocks() {
  return (
    <View testID="metas-skeleton" style={{ gap: 14 }}>
      <Skeleton height={190} radius={radius.lg} />
      <Skeleton height={130} radius={radius.lg} />
      <Skeleton height={130} radius={radius.lg} />
    </View>
  );
}

export default function MetasScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    data: goals = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: savingsService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const completed = goals.filter((g) => g.progress >= 100).length;
  const totalTarget = goals.reduce((s, g) => s + Number(g.montoMeta), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.ahorrosActuales), 0);
  const globalRatio = totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Reveal index={0}>
        <PageHeader title="Metas de Ahorro" />
      </Reveal>

      {isLoading && <SkeletonBlocks />}

      {!isLoading && isError && (
        <Reveal index={1}>
          <Card>
            <ErrorState
              message="No se pudieron cargar tus metas. Revisa tu conexión e inténtalo de nuevo."
              onRetry={() => refetch()}
            />
          </Card>
        </Reveal>
      )}

      {!isLoading && !isError && goals.length === 0 && (
        <Reveal index={1}>
          <Card>
            <EmptyState
              icon="trophy-outline"
              title="Sin metas registradas"
              subtitle="Crea tus metas de ahorro desde la app web"
            />
          </Card>
        </Reveal>
      )}

      {!isLoading && !isError && goals.length > 0 && (
        <>
          <Reveal index={1}>
            <Card accent={toneInk(colors, 'info')}>
              <View style={styles.heroRow}>
                <View style={styles.heroText}>
                  <Text style={styles.eyebrow}>Total ahorrado</Text>
                  <Text style={[styles.heroAmount, { color: toneInk(colors, 'info') }]} numberOfLines={1} adjustsFontSizeToFit>
                    {fmt(totalSaved)}
                  </Text>
                  {totalTarget > 0 && (
                    <Text style={styles.heroMeta}>
                      {Math.min(100, (totalSaved / totalTarget) * 100).toFixed(1)}% del objetivo total: {fmt(totalTarget)}
                    </Text>
                  )}
                </View>
                {totalTarget > 0 && (
                  <ProgressRing value={globalRatio} size={84} thickness={9} color={toneInk(colors, 'info')}>
                    <Text style={styles.ringValue}>{Math.round(globalRatio * 100)}%</Text>
                    <Text style={styles.ringCaption}>del objetivo</Text>
                  </ProgressRing>
                )}
              </View>
            </Card>
          </Reveal>

          <Reveal index={2}>
            <View style={styles.statsRow}>
              <Card style={styles.statBox}>
                <Text style={styles.statLabel}>Metas activas</Text>
                <Text style={styles.statValue}>{goals.length - completed}</Text>
              </Card>
              <Card style={styles.statBox}>
                <Text style={styles.statLabel}>Completadas</Text>
                <Text style={[styles.statValue, { color: toneInk(colors, 'ok') }]}>{completed}</Text>
              </Card>
            </View>
          </Reveal>

          <Reveal index={3} style={styles.section}>
            <Text style={styles.sectionTitle}>Tus metas</Text>
            <View style={styles.list}>
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </View>
          </Reveal>
        </>
      )}
    </Screen>
  );
}
