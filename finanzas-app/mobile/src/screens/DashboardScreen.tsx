import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { summaryService } from '../services/summary.service';
import { notificationsService } from '../services/notifications.service';
import { creditCardsService } from '../services/creditCards.service';
import { cuotasService } from '../services/cuotas.service';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, Tone, toneInk, toneTint } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import { formatMoney } from '../utils/currency';
import { Card, ErrorState, ProgressBar, ProgressRing, Reveal, Screen, Skeleton } from '../components/ui';
import { StatCard } from '../components/common/StatCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    headerText: { flex: 1 },
    greeting: { fontFamily: fonts.title, color: c.onSurface, fontSize: 24, letterSpacing: -0.5 },
    subheading: { fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 14, marginTop: 2 },
    bellBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.panel,
      borderWidth: 1,
      borderColor: c.border,
    },
    bellBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: c.dangerInk,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.surface,
    },
    bellBadgeText: { fontFamily: fonts.bold, color: c.surface, fontSize: 10 },
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
    advisory: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    advisoryText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 12 },
    quickAccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    quickAccessLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    quickAccessIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    quickAccessTitle: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    quickAccessSubtitle: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12, marginTop: 1 },
    section: { gap: 10 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    sectionList: { gap: 10 },
    miniCard: { gap: 10 },
    miniCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    miniCardHeaderText: { flex: 1 },
    miniCardTitle: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    miniCardSubtitle: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12, marginTop: 1 },
    miniCardPct: { fontFamily: fonts.title, color: c.onSurfaceVariant, fontSize: 15 },
    miniCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    miniCardFooterText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12, flexShrink: 1 },
    progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    progressLabel: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    progressPercent: { fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 13 },
    progressLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12, flexShrink: 1 },
  });

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function SkeletonBlocks() {
  return (
    <View testID="dashboard-skeleton" style={{ gap: 14 }}>
      <Skeleton height={132} radius={radius.lg} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton height={104} radius={radius.lg} style={{ flex: 1 }} />
        <Skeleton height={104} radius={radius.lg} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton height={104} radius={radius.lg} style={{ flex: 1 }} />
        <Skeleton height={104} radius={radius.lg} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['summary'],
    queryFn: summaryService.get,
    staleTime: 0,
    retry: 1,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: creditCardsService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const { data: cuotas = [] } = useQuery({
    queryKey: ['cuotas'],
    queryFn: cuotasService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const currency = summary?.currency;
  const fmt = (amount: number) => formatMoney(amount, currency);
  const totalIngresos = summary?.totalIngresos ?? 0;
  const totalGastos = summary?.totalGastos ?? 0;
  const balance = summary?.balance ?? (totalIngresos - totalGastos);
  const emergencyFund = summary?.emergencyFund ?? 0;

  const isBalancePositive = balance >= 0;
  const balanceTone: Tone = isBalancePositive ? 'ok' : 'danger';
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeCuotas = cuotas.filter((c) => c.paidInstallments < c.totalInstallments);

  const usedRatio = totalIngresos > 0 ? totalGastos / totalIngresos : 0;
  const usedPct = Math.min(100, Math.round(usedRatio * 100));
  const ringTone: Tone = totalGastos > totalIngresos ? 'danger' : usedRatio > 0.8 ? 'warn' : 'ok';

  let advisoryTone: Tone = 'ok';
  let advisoryIcon: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
  let advisoryText = 'Vas por buen camino: tus gastos están bajo control este mes.';
  if (totalIngresos <= 0 && totalGastos <= 0) {
    advisoryTone = 'info';
    advisoryIcon = 'information-circle-outline';
    advisoryText = 'Aún no hay movimientos este mes. Registra tus ingresos y gastos para ver tu panorama.';
  } else if (balance < 0) {
    advisoryTone = 'danger';
    advisoryIcon = 'alert-circle-outline';
    advisoryText = 'Estás gastando más de lo que ingresas este mes.';
  } else if (usedRatio > 0.8) {
    advisoryTone = 'warn';
    advisoryIcon = 'warning-outline';
    advisoryText = 'Ya usaste más del 80% de tus ingresos del mes.';
  }

  const showSummary = !isLoading && !isError;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Reveal index={0}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'usuario'}
            </Text>
            <Text style={styles.subheading}>{monthName} {now.getFullYear()}</Text>
          </View>
          <Pressable
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notificaciones')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Reveal>

      {isLoading && <SkeletonBlocks />}

      {isError && (
        <Reveal index={1}>
          <Card>
            <ErrorState
              message="No se pudieron cargar tus datos. Revisa tu conexión e inténtalo de nuevo."
              onRetry={() => refetch()}
            />
          </Card>
        </Reveal>
      )}

      {showSummary && (
        <>
          <Reveal index={1}>
            <Card accent={toneInk(colors, balanceTone)}>
              <View style={styles.heroRow}>
                <View style={styles.heroText}>
                  <Text style={styles.eyebrow}>Disponible del mes</Text>
                  <Text
                    style={[styles.heroAmount, { color: toneInk(colors, balanceTone) }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {isBalancePositive ? '+' : ''}{fmt(balance)}
                  </Text>
                  {summary?.savingsRate != null && (
                    <Text style={styles.heroMeta}>
                      Tasa de ahorro{' '}
                      <Text style={{ fontFamily: fonts.bold, color: toneInk(colors, summary.savingsRate >= 0 ? 'ok' : 'danger') }}>
                        {summary.savingsRate.toFixed(1)}%
                      </Text>
                    </Text>
                  )}
                </View>
                <ProgressRing value={usedRatio} size={84} thickness={9} color={toneInk(colors, ringTone)}>
                  <Text style={styles.ringValue}>{usedPct}%</Text>
                  <Text style={styles.ringCaption}>usado</Text>
                </ProgressRing>
              </View>
            </Card>
          </Reveal>

          <Reveal index={2}>
            <View
              style={[
                styles.advisory,
                { backgroundColor: toneTint(colors, advisoryTone), borderColor: toneInk(colors, advisoryTone) + '40' },
              ]}
            >
              <Ionicons name={advisoryIcon} size={20} color={toneInk(colors, advisoryTone)} />
              <Text style={[styles.advisoryText, { color: toneInk(colors, advisoryTone) }]}>{advisoryText}</Text>
            </View>
          </Reveal>

          <Reveal index={3} style={{ gap: 12 }}>
            <View style={styles.row}>
              <StatCard title="Ingresos" value={fmt(totalIngresos)} icon="trending-up-outline" tone="ok" />
              <StatCard title="Gastos" value={fmt(totalGastos)} icon="trending-down-outline" tone="danger" />
            </View>
            <View style={styles.row}>
              <StatCard title="Disponible" value={fmt(balance)} icon="wallet-outline" tone={isBalancePositive ? 'info' : 'danger'} />
              <StatCard
                title="Fondo Emergencia"
                value={emergencyFund > 0 ? fmt(emergencyFund) : '—'}
                icon="shield-checkmark-outline"
                tone="warn"
              />
            </View>
          </Reveal>
        </>
      )}

      <Reveal index={4}>
        <Card onPress={() => navigation.navigate('Vencimientos')}>
          <View style={styles.quickAccess}>
            <View style={styles.quickAccessLeft}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.infoTint }]}>
                <Ionicons name="calendar-outline" size={19} color={colors.infoInk} />
              </View>
              <View>
                <Text style={styles.quickAccessTitle}>Vencimientos</Text>
                <Text style={styles.quickAccessSubtitle}>Próximos pagos del hogar</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </View>
        </Card>
      </Reveal>

      {creditCards.length > 0 && (
        <Reveal index={5} style={styles.section}>
          <Text style={styles.sectionTitle}>Tarjetas de crédito</Text>
          <View style={styles.sectionList}>
            {creditCards.map((card) => {
              const available = card.lineaCredito - card.saldoActual;
              const utilization = card.utilizationPercent ?? (
                card.lineaCredito > 0
                  ? Math.min(100, (card.saldoActual / card.lineaCredito) * 100)
                  : 0
              );
              const utilTone: Tone = utilization > 80 ? 'danger' : utilization > 50 ? 'warn' : 'ok';
              return (
                <Card key={card.id} style={styles.miniCard}>
                  <View style={styles.miniCardHeader}>
                    <View style={styles.miniCardHeaderText}>
                      <Text style={styles.miniCardTitle} numberOfLines={1}>{card.nombreTarjeta}</Text>
                      <Text style={styles.miniCardSubtitle} numberOfLines={1}>{card.banco}</Text>
                    </View>
                    <Text style={[styles.miniCardPct, { color: toneInk(colors, utilTone) }]}>
                      {utilization.toFixed(0)}%
                    </Text>
                  </View>
                  <ProgressBar value={utilization / 100} tone={utilTone} height={6} />
                  <View style={styles.miniCardFooter}>
                    <Text style={styles.miniCardFooterText}>Disponible: {fmt(available)}</Text>
                    <Text style={styles.miniCardFooterText}>Límite: {fmt(card.lineaCredito)}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </Reveal>
      )}

      {activeCuotas.length > 0 && (
        <Reveal index={6} style={styles.section}>
          <Text style={styles.sectionTitle}>Cuotas activas</Text>
          <View style={styles.sectionList}>
            {activeCuotas.map((cuota) => {
              const pct = cuota.totalInstallments > 0
                ? Math.min(100, (cuota.paidInstallments / cuota.totalInstallments) * 100)
                : 0;
              return (
                <Card key={cuota.id} style={styles.miniCard}>
                  <View style={styles.miniCardHeader}>
                    <Text style={[styles.miniCardTitle, { flex: 1 }]} numberOfLines={1}>{cuota.description}</Text>
                    <Text style={styles.miniCardPct}>
                      {cuota.paidInstallments}/{cuota.totalInstallments}
                    </Text>
                  </View>
                  <ProgressBar value={pct / 100} tone="info" height={6} />
                  <Text style={styles.miniCardFooterText}>
                    Cuota mensual: {fmt(cuota.installmentAmount)}
                  </Text>
                </Card>
              );
            })}
          </View>
        </Reveal>
      )}

      {showSummary && totalIngresos > 0 && (
        <Reveal index={7}>
          <Card>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Ingresos vs Gastos</Text>
              <Text style={styles.progressPercent}>{usedPct}% usado</Text>
            </View>
            <ProgressBar value={usedRatio} tone={totalGastos > totalIngresos ? 'danger' : 'info'} />
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.okInk }]} />
                <Text style={styles.legendText}>Ingresos: {fmt(totalIngresos)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.dangerInk }]} />
                <Text style={styles.legendText}>Gastos: {fmt(totalGastos)}</Text>
              </View>
            </View>
          </Card>
        </Reveal>
      )}
    </Screen>
  );
}
