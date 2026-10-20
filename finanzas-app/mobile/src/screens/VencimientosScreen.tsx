import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { summaryService } from '../services/summary.service';
import { UpcomingBill } from '../types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { parseLocalDate } from '../utils/dates';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, toneInk, toneTint } from '../theme/tokens';
import type { ThemeColors, Tone } from '../theme/tokens';
import { Card, EmptyState, ErrorState, Reveal, Screen, Skeleton } from '../components/ui';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  credit_card: 'card-outline',
  loan: 'business-outline',
  cuota: 'receipt-outline',
};

function urgencyTone(daysUntilDue: number): Tone {
  if (daysUntilDue <= 3) return 'danger';
  if (daysUntilDue <= 7) return 'warn';
  return 'info';
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 32, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 18, paddingRight: 14 },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: { flex: 1, gap: 2 },
    rowName: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    rowDate: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    rowRight: { alignItems: 'flex-end', gap: 2 },
    rowAmount: { fontFamily: fonts.title, color: c.onSurface, fontSize: 14 },
    rowDays: { fontFamily: fonts.semibold, fontSize: 11 },
  });

function BillRow({ bill }: { bill: UpcomingBill }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = urgencyTone(bill.daysUntilDue);
  const ink = toneInk(colors, tone);
  const icon = TYPE_ICON[bill.type] ?? 'calendar-outline';

  return (
    <Card padded={false} accent={ink}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: toneTint(colors, tone) }]}>
          <Ionicons name={icon} size={18} color={ink} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowName} numberOfLines={1}>{bill.name}</Text>
          <Text style={styles.rowDate}>
            Vence {parseLocalDate(bill.dueDate).toLocaleDateString('es-CU', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>{formatMoney(bill.amount)}</Text>
          <Text style={[styles.rowDays, { color: ink }]}>
            {bill.daysUntilDue <= 0 ? 'Hoy' : `${bill.daysUntilDue} días`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  return (
    <View testID="vencimientos-skeleton" style={{ gap: 10 }}>
      <Skeleton height={64} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
    </View>
  );
}

export default function VencimientosScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    data: bills = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['upcoming-bills'],
    queryFn: () => summaryService.getUpcomingBills(),
    staleTime: 0,
    retry: 1,
  });

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError && bills.length === 0) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <Card>
          <ErrorState
            message="No se pudieron cargar los vencimientos. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={bills}
        keyExtractor={(item, index) => `${item.type}-${item.name}-${index}`}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 7)}>
            <BillRow bill={item} />
          </Reveal>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="Sin vencimientos próximos"
              subtitle="No hay pagos programados en los próximos 30 días"
            />
          </Card>
        }
      />
    </Screen>
  );
}
