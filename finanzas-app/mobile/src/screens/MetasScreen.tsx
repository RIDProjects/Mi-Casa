import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { savingsService } from '../services/savings.service';
import { SavingsGoal } from '../types';
import { MetasStackParamList } from '../navigation/types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, Tone, toneInk, toneTint } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { ActionBar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, ProgressBar, ProgressRing, Reveal, Screen, Skeleton, TextField } from '../components/ui';

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
    flex: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
    promptCard: { gap: 14 },
    promptTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 18 },
    promptSubtitle: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    promptActions: { flexDirection: 'row', gap: 12 },
    promptButton: { flex: 1 },
  });

const errorMessage = (err: any): string => {
  const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

function GoalCard({ goal, onEdit, onContribute }: { goal: SavingsGoal; onEdit: () => void; onContribute: () => void }) {
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
    <Card accent={isComplete ? ink : undefined} style={styles.goalCard} onPress={onEdit}>
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

      <Button
        label="Aportar"
        icon="add-circle-outline"
        variant="secondary"
        small
        onPress={onContribute}
      />
    </Card>
  );
}

function ContributionPrompt({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ id, total }: { id: string; total: number }) =>
      savingsService.update(id, { ahorrosActuales: total }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      setAmount('');
      onClose();
    },
    onError: (err: any) => Alert.alert('Error', errorMessage(err)),
  });

  const close = () => {
    setAmount('');
    setError(null);
    onClose();
  };

  const submit = () => {
    const value = amount.trim() === '' ? NaN : Number(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }
    setError(null);
    mutation.mutate({ id: goal!.id, total: Number(goal!.ahorrosActuales) + value });
  };

  return (
    <Modal visible={!!goal} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.overlay}>
          <Card style={styles.promptCard}>
            <View>
              <Text style={styles.promptTitle}>Aportar a la meta</Text>
              <Text style={styles.promptSubtitle}>
                {goal?.emoji ? `${goal.emoji} ` : ''}{goal?.nombre} · ahorrado {fmt(Number(goal?.ahorrosActuales ?? 0))}
              </Text>
            </View>
            <TextField
              label="Monto del aporte"
              accessibilityLabel="Monto del aporte"
              icon="cash-outline"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={error}
              editable={!mutation.isPending}
              autoFocus
            />
            <View style={styles.promptActions}>
              <Button label="Cancelar" variant="secondary" onPress={close} disabled={mutation.isPending} style={styles.promptButton} />
              <Button label="Guardar aporte" icon="checkmark-outline" onPress={submit} loading={mutation.isPending} style={styles.promptButton} />
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  const navigation = useNavigation<NativeStackNavigationProp<MetasStackParamList>>();
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);
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
    <Screen scroll={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
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
              subtitle="Usa el botón de abajo para crear tu primera meta de ahorro"
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
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => navigation.navigate('GoalForm', { goalId: goal.id })}
                  onContribute={() => setContributing(goal)}
                />
              ))}
            </View>
          </Reveal>
        </>
      )}
      </ScrollView>

      <ActionBar label="Nueva meta" onPress={() => navigation.navigate('GoalForm', {})} />
      <ContributionPrompt goal={contributing} onClose={() => setContributing(null)} />
    </Screen>
  );
}
