import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { netWorthService } from '../services/netWorth.service';
import { NetWorthAsset, NetWorthHistoryPoint, NetWorthLiability } from '../types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Badge, Card, EmptyState, ErrorState, ProgressBar, Reveal, Screen, Skeleton } from '../components/ui';

const HISTORY_MONTHS = 12;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const signedMoney = (amount: number): string => `${amount < 0 ? '-' : ''}${formatMoney(Math.abs(amount))}`;

// "2026-10-01" -> "Oct 2026" (parsed from the string: no timezone shifts).
const monthLabel = (month: string): string => {
  const [year, monthNumber] = String(month ?? '').split('-');
  const name = MONTHS[Number(monthNumber) - 1];
  return name && year ? `${name} ${year}` : String(month ?? '');
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    heroCard: { gap: 14 },
    label: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroValue: { fontFamily: fonts.title, fontSize: 32 },
    heroRow: { flexDirection: 'row', gap: 12 },
    heroCell: { flex: 1, gap: 2 },
    heroSmall: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    group: { gap: 10 },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowName: { flex: 1, fontFamily: fonts.regular, color: c.onSurface, fontSize: 14 },
    rowAmount: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    divider: { height: 1, backgroundColor: c.border },
    empty: { fontFamily: fonts.regular, color: c.outline, fontSize: 13 },
    historyRow: { gap: 6 },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    historyMonth: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    historyAmount: { fontFamily: fonts.semibold, fontSize: 13 },
    skeleton: { gap: 14 },
  });

function AssetGroup({ title, items }: { title: string; items: NetWorthAsset[] }) {
  const styles = useThemedStyles(createStyles);
  const total = items.reduce((sum, a) => sum + toNumber(a.valorEstimado), 0);
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.rowAmount}>{formatMoney(total)}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{`Sin ${title.toLowerCase()} registrados`}</Text>
      ) : (
        items.map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={1}>{a.nombre}</Text>
            <Text style={styles.rowAmount}>{formatMoney(toNumber(a.valorEstimado))}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function History({ points, isLoading, isError }: { points: NetWorthHistoryPoint[]; isLoading: boolean; isError: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const maxValue = Math.max(0, ...points.map((p) => Math.abs(toNumber(p.netWorth))));

  return (
    <Card>
      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Evolución del patrimonio</Text>
        {isLoading ? (
          <Skeleton height={90} radius={radius.md} />
        ) : isError ? (
          <Text style={styles.empty}>No se pudo cargar el historial</Text>
        ) : points.length === 0 ? (
          <Text style={styles.empty}>Sin historial disponible todavía</Text>
        ) : (
          points.map((p) => {
            const value = toNumber(p.netWorth);
            return (
              <View key={p.month} style={styles.historyRow}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyMonth}>{monthLabel(p.month)}</Text>
                  <Text style={[styles.historyAmount, { color: value >= 0 ? colors.okInk : colors.dangerInk }]}>
                    {signedMoney(value)}
                  </Text>
                </View>
                <ProgressBar value={maxValue > 0 ? Math.abs(value) / maxValue : 0} tone={value >= 0 ? 'ok' : 'danger'} />
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  const styles = useThemedStyles(createStyles);
  return (
    <View testID="patrimonio-skeleton" style={styles.skeleton}>
      <Skeleton height={160} radius={radius.lg} />
      <Skeleton height={220} radius={radius.lg} />
      <Skeleton height={140} radius={radius.lg} />
    </View>
  );
}

export default function PatrimonioScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const overview = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => netWorthService.getOverview(),
    staleTime: 0,
    retry: 1,
  });
  const history = useQuery({
    queryKey: ['net-worth-history', HISTORY_MONTHS],
    queryFn: () => netWorthService.getHistory(HISTORY_MONTHS),
    staleTime: 0,
    retry: false,
  });
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await Promise.all([overview.refetch(), history.refetch()]);
  });

  if (overview.isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (overview.isError && !overview.data) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <Card>
          <ErrorState
            message="No se pudo cargar el patrimonio. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => overview.refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const assets: NetWorthAsset[] = overview.data?.summary?.assets ?? [];
  const liabilities: NetWorthLiability[] = overview.data?.liabilities ?? [];
  const physical = assets.filter((a) => a.assetType === 'physical');
  const cash = assets.filter((a) => a.assetType === 'cash');
  const sum = (items: NetWorthAsset[]) => items.reduce((total, a) => total + toNumber(a.valorEstimado), 0);
  const physicalTotal = sum(physical);
  const cashTotal = sum(cash);
  const totalDebts = liabilities.reduce((total, l) => total + toNumber(l.monto), 0);
  const netWorth = toNumber(overview.data?.summary?.netWorth);
  const isEmpty = assets.length === 0 && liabilities.length === 0;

  return (
    <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      {isEmpty ? (
        <Card>
          <EmptyState
            icon="trending-up-outline"
            title="Sin patrimonio registrado"
            subtitle="Registra tus activos desde la versión web para ver tu patrimonio neto aquí"
          />
        </Card>
      ) : (
        <>
          <Reveal index={0}>
            <Card style={styles.heroCard}>
              <View>
                <Text style={styles.label}>Patrimonio neto</Text>
                <Text
                  style={[styles.heroValue, { color: netWorth >= 0 ? colors.okInk : colors.dangerInk }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {signedMoney(netWorth)}
                </Text>
              </View>
              <View style={styles.heroRow}>
                <View style={styles.heroCell}>
                  <Text style={styles.label}>Activos físicos</Text>
                  <Text style={styles.heroSmall} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(physicalTotal)}</Text>
                </View>
                <View style={styles.heroCell}>
                  <Text style={styles.label}>Efectivo y cuentas</Text>
                  <Text style={styles.heroSmall} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(cashTotal)}</Text>
                </View>
              </View>
              <View style={styles.heroCell}>
                <Text style={styles.label}>Deudas (tarjetas + créditos)</Text>
                <Text style={[styles.heroSmall, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
                  {`-${formatMoney(totalDebts)}`}
                </Text>
              </View>
            </Card>
          </Reveal>

          <Reveal index={1}>
            <Card>
              <View style={styles.group}>
                <Text style={styles.sectionTitle}>Activos</Text>
                <AssetGroup title="Activos físicos" items={physical} />
                <View style={styles.divider} />
                <AssetGroup title="Efectivo y cuentas" items={cash} />
              </View>
            </Card>
          </Reveal>

          <Reveal index={2}>
            <Card>
              <View style={styles.group}>
                <Text style={styles.sectionTitle}>Pasivos</Text>
                {liabilities.length === 0 ? (
                  <Text style={styles.empty}>Sin deudas registradas</Text>
                ) : (
                  liabilities.map((l) => (
                    <View key={`${l.kind}-${l.id}`} style={styles.row}>
                      <Text style={styles.rowName} numberOfLines={1}>{l.nombre}</Text>
                      <Badge label={l.kind === 'card' ? 'Tarjeta' : 'Crédito'} tone="neutral" />
                      <Text style={[styles.rowAmount, { color: colors.dangerInk }]}>{`-${formatMoney(toNumber(l.monto))}`}</Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </Reveal>
        </>
      )}

      <Reveal index={3}>
        <History
          points={history.data ?? []}
          isLoading={history.isLoading}
          isError={history.isError}
        />
      </Reveal>
    </Screen>
  );
}
