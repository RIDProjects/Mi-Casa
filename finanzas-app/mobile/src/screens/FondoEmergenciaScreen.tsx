import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { emergencyFundService } from '../services/emergencyFund.service';
import { EmergencyCoverageStatus, EmergencyFund, EmergencyFundCalculations, EmergencyFundCoverage } from '../types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors, Tone } from '../theme/tokens';
import { Badge, Card, EmptyState, ErrorState, ProgressBar, ProgressRing, Reveal, Screen, Skeleton } from '../components/ui';

const STATUS: Record<EmergencyCoverageStatus, { label: string; tone: Tone }> = {
  safe: { label: 'Cobertura segura', tone: 'ok' },
  low: { label: 'Cobertura baja', tone: 'warn' },
  critical: { label: 'Cobertura crítica', tone: 'danger' },
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// The backend sends the calculations; fall back to the same formulas when absent.
const getCalculations = (fund: EmergencyFund): EmergencyFundCalculations => {
  if (fund.calculations) return fund.calculations;
  const totalMonthlyExpenses = (fund.categories ?? []).reduce((sum, c) => sum + toNumber(c.monthlyAmount), 0);
  const optimalFund = totalMonthlyExpenses * toNumber(fund.targetMonths);
  const minimumFund = totalMonthlyExpenses * toNumber(fund.minimumMonths);
  const monthlySavingsRequired = fund.savingPeriodMonths > 0 ? minimumFund / fund.savingPeriodMonths : 0;
  return { totalMonthlyExpenses, optimalFund, minimumFund, monthlySavingsRequired, monthsToOptimal: 0 };
};

/** "1 mes" / "3 meses" (the coverage figures can be fractional). */
export const monthsLabel = (n: number) => `${n} ${n === 1 ? 'mes' : 'meses'}`;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    coverageInfo: { flex: 1, gap: 6 },
    ringValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 22 },
    ringUnit: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 11 },
    meta: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    fundBody: { gap: 12 },
    fundTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    label: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
    bigValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 22 },
    pct: { fontFamily: fonts.title, color: c.onSurfaceVariant, fontSize: 14 },
    figures: { gap: 8 },
    figureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    figureLabel: { flex: 1, fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    figureValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15 },
    divider: { height: 1, backgroundColor: c.border },
    catRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    catName: { flex: 1, fontFamily: fonts.regular, color: c.onSurface, fontSize: 13 },
    catAmount: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 13 },
    catEmpty: { fontFamily: fonts.regular, color: c.outline, fontSize: 13 },
    totalLabel: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 13, textTransform: 'uppercase' },
    skeleton: { gap: 14 },
  });

const toneInk = (c: ThemeColors, tone: Tone): string =>
  tone === 'ok' ? c.okInk : tone === 'warn' ? c.warnInk : tone === 'danger' ? c.dangerInk : c.brand;

function CoverageCard({ coverage }: { coverage: EmergencyFundCoverage }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const status = STATUS[coverage.status] ?? STATUS.critical;
  const months = toNumber(coverage.monthsCovered);
  const target = toNumber(coverage.targetMonths) || 6;
  const ink = toneInk(colors, status.tone);

  return (
    <Card>
      <View style={styles.coverageRow}>
        <ProgressRing value={months / target} size={96} color={ink}>
          <Text style={styles.ringValue}>{months.toFixed(1)}</Text>
          <Text style={styles.ringUnit}>meses</Text>
        </ProgressRing>
        <View style={styles.coverageInfo}>
          <Text style={styles.label}>Cobertura actual</Text>
          <View>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <Text style={styles.meta}>{`Meta: ${monthsLabel(target)}`}</Text>
          <Text style={styles.meta}>{`Gastos promedio: ${formatMoney(toNumber(coverage.monthlyExpenses))}/mes`}</Text>
        </View>
      </View>
    </Card>
  );
}

function FundCard({ fund }: { fund: EmergencyFund }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const calc = getCalculations(fund);
  const saved = toNumber(fund.currentBalance);
  const optimal = toNumber(calc.optimalFund);
  const progress = optimal > 0 ? saved / optimal : 0;
  const tone: Tone = progress >= 1 ? 'ok' : progress >= 0.5 ? 'warn' : 'danger';
  const categories = fund.categories ?? [];

  return (
    <Card>
      <View style={styles.fundBody}>
        <Text style={styles.fundTitle}>{fund.name}</Text>

        <View style={styles.savedRow}>
          <View>
            <Text style={styles.label}>Ahorrado</Text>
            <Text style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(saved)}
            </Text>
          </View>
          <Text style={styles.pct}>{`${Math.round(progress * 100)}%`}</Text>
        </View>
        <ProgressBar value={progress} tone={tone} />

        <View style={styles.figures}>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>{`Monto óptimo (${monthsLabel(fund.targetMonths)})`}</Text>
            <Text style={[styles.figureValue, { color: colors.okInk }]}>{formatMoney(optimal)}</Text>
          </View>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>{`Monto mínimo (${monthsLabel(fund.minimumMonths)})`}</Text>
            <Text style={[styles.figureValue, { color: colors.warnInk }]}>{formatMoney(toNumber(calc.minimumFund))}</Text>
          </View>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>
              {fund.savingPeriodMonths > 0 ? `Ahorro mensual mínimo (${fund.savingPeriodMonths} meses)` : 'Ahorro mensual mínimo'}
            </Text>
            <Text style={styles.figureValue}>
              {fund.savingPeriodMonths > 0 ? formatMoney(toNumber(calc.monthlySavingsRequired)) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.label}>Tus gastos mensuales por categoría</Text>
        {categories.length === 0 ? (
          <Text style={styles.catEmpty}>Sin categorías</Text>
        ) : (
          categories.map((cat, idx) => (
            <View key={cat.id ?? `${cat.name}-${idx}`} style={styles.catRow}>
              <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
              <Text style={styles.catAmount}>{toNumber(cat.monthlyAmount) > 0 ? formatMoney(toNumber(cat.monthlyAmount)) : '-'}</Text>
            </View>
          ))
        )}
        <View style={styles.divider} />
        <View style={styles.catRow}>
          <Text style={styles.totalLabel}>Total gastos mensuales</Text>
          <Text style={styles.figureValue}>{formatMoney(toNumber(calc.totalMonthlyExpenses))}</Text>
        </View>
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  const styles = useThemedStyles(createStyles);
  return (
    <View testID="fondo-skeleton" style={styles.skeleton}>
      <Skeleton height={130} radius={radius.lg} />
      <Skeleton height={320} radius={radius.lg} />
    </View>
  );
}

export default function FondoEmergenciaScreen() {
  const funds = useQuery({
    queryKey: ['emergency-fund'],
    queryFn: () => emergencyFundService.getAll(),
    staleTime: 0,
    retry: 1,
  });
  // Coverage is a bonus on top of the funds (the web page also tolerates its failure).
  const coverage = useQuery({
    queryKey: ['emergency-fund-coverage'],
    queryFn: () => emergencyFundService.getCoverage(),
    staleTime: 0,
    retry: false,
  });
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await Promise.all([funds.refetch(), coverage.refetch()]);
  });

  if (funds.isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (funds.isError && !funds.data) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <Card>
          <ErrorState
            message="No se pudo cargar el fondo de emergencia. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => funds.refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const list = funds.data ?? [];

  return (
    <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon="shield-checkmark-outline"
            title="Sin calculadoras aún"
            subtitle="Crea tu calculadora de fondo de emergencia desde la versión web para verla aquí"
          />
        </Card>
      ) : (
        <>
          {coverage.data && (
            <Reveal index={0}>
              <CoverageCard coverage={coverage.data} />
            </Reveal>
          )}
          {list.map((fund, index) => (
            <Reveal key={fund.id} index={Math.min(index, 6) + 1}>
              <FundCard fund={fund} />
            </Reveal>
          ))}
        </>
      )}
    </Screen>
  );
}
