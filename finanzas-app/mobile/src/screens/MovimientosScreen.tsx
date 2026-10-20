import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsService } from '../services/transactions.service';
import { Transaction } from '../types';
import { formatMoney } from '../utils/currency';
import { parseLocalDate } from '../utils/dates';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { ActionBar, Badge, Card, EmptyState, ErrorState, Reveal, Screen, Skeleton } from '../components/ui';
import { METODO_OPTIONS, TIPO_OPTIONS } from './MovimientoFormScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const labelOf = (options: { value: string; label: string }[], value?: string | null): string =>
  options.find((option) => option.value === value)?.label ?? value ?? '';

const formatDay = (fecha: string): string => {
  if (!fecha) return '—';
  const date = parseLocalDate(fecha.split('T')[0]);
  return `${String(date.getDate()).padStart(2, '0')} ${SHORT_MONTHS[date.getMonth()]}`;
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 24, gap: 10 },
    header: { gap: 14, marginBottom: 4 },
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
    monthArrow: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: c.surfaceContainer,
    },
    monthCenter: { alignItems: 'center' },
    monthName: { fontFamily: fonts.title, color: c.onSurface, fontSize: 19 },
    monthYear: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    summaryCard: { gap: 10 },
    summaryLabel: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    summaryAmount: { fontFamily: fonts.title, fontSize: 32, letterSpacing: -0.8 },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    summaryRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryRowText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    summaryRowValue: { fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 4 },
    itemContent: { flex: 1, gap: 6, paddingLeft: 16 },
    itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemName: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    itemAmount: { fontFamily: fonts.title, fontSize: 14 },
    itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemMeta: { flexShrink: 1, fontFamily: fonts.regular, color: c.outline, fontSize: 11 },
    itemDate: { fontFamily: fonts.regular, color: c.outline, fontSize: 11, marginLeft: 'auto' },
    deleteBtn: { padding: 12 },
    skeleton: { gap: 14 },
  });

function TransactionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Transaction;
  onEdit: (item: Transaction) => void;
  onDelete: (item: Transaction) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isIncome = item.tipo !== 'gasto';
  const ink = isIncome ? colors.okInk : colors.dangerInk;
  const meta = [item.categoria, labelOf(METODO_OPTIONS, item.metodoPago), item.nombreTarjeta]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padded={false} accent={ink} onPress={() => onEdit(item)}>
      <View style={styles.itemRow}>
        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={styles.itemName} numberOfLines={1}>{item.concepto}</Text>
            <Text style={[styles.itemAmount, { color: ink }]}>
              {isIncome ? '+' : '-'}{formatMoney(Number(item.monto))}
            </Text>
          </View>
          <View style={styles.itemBottom}>
            <Badge label={labelOf(TIPO_OPTIONS, item.tipo)} tone={isIncome ? 'ok' : 'danger'} />
            {!!meta && <Text style={styles.itemMeta} numberOfLines={1}>{meta}</Text>}
            <Text style={styles.itemDate}>{formatDay(item.fecha)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} accessibilityLabel="Eliminar movimiento">
          <Ionicons name="trash-outline" size={16} color={colors.outline} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  const styles = useThemedStyles(createStyles);
  return (
    <View testID="movimientos-skeleton" style={styles.skeleton}>
      <Skeleton height={72} radius={radius.lg} />
      <Skeleton height={170} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
    </View>
  );
}

export default function MovimientosScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => transactionsService.getByMonth(year, month),
    staleTime: 0,
    retry: 1,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const transactions = data ?? [];

  // Same rule as the web page: everything that is not a "gasto" is income.
  const { ingresos, gastos } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    (data ?? []).forEach((t) => {
      if (t.tipo === 'gasto') expenses += Number(t.monto);
      else income += Number(t.monto);
    });
    return { ingresos: income, gastos: expenses };
  }, [data]);
  const balance = ingresos - gastos;

  const deleteMut = useMutation({
    mutationFn: (id: string) => transactionsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo eliminar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const confirmDelete = (item: Transaction) => {
    Alert.alert('Eliminar movimiento', `¿Eliminar "${item.concepto}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMut.mutate(item.id) },
    ]);
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const monthSelector = (
    <Reveal index={0}>
      <Card padded={false} style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={prevMonth} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthName}>{MONTH_NAMES[month - 1]}</Text>
          <Text style={styles.monthYear}>{year}</Text>
        </View>
        <TouchableOpacity style={styles.monthArrow} onPress={nextMonth} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </Card>
    </Reveal>
  );

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        {monthSelector}
        <Card>
          <ErrorState
            message="No se pudieron cargar los movimientos. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const ListHeader = (
    <View style={styles.header}>
      {monthSelector}

      <Reveal index={1}>
        <Card style={styles.summaryCard} accent={balance < 0 ? colors.dangerInk : colors.okInk}>
          <Text style={styles.summaryLabel}>Balance del mes</Text>
          <Text
            style={[styles.summaryAmount, { color: balance < 0 ? colors.dangerInk : colors.onSurface }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {balance < 0 ? '-' : ''}{formatMoney(Math.abs(balance))}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLabel}>
              <Ionicons name="arrow-up-circle-outline" size={16} color={colors.okInk} />
              <Text style={styles.summaryRowText}>Ingresos</Text>
            </View>
            <Text style={[styles.summaryRowValue, { color: colors.okInk }]}>{formatMoney(ingresos)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLabel}>
              <Ionicons name="arrow-down-circle-outline" size={16} color={colors.dangerInk} />
              <Text style={styles.summaryRowText}>Gastos</Text>
            </View>
            <Text style={[styles.summaryRowValue, { color: colors.dangerInk }]}>{formatMoney(gastos)}</Text>
          </View>
        </Card>
      </Reveal>

      {transactions.length > 0 && <Text style={styles.sectionTitle}>Movimientos del mes</Text>}
    </View>
  );

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 6) + 2}>
            <TransactionRow
              item={item}
              onEdit={(tx) => navigation.navigate('MovimientoForm', { transaction: tx })}
              onDelete={confirmDelete}
            />
          </Reveal>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="swap-vertical-outline"
              title="Sin movimientos"
              subtitle={`No hay transacciones en ${MONTH_NAMES[month - 1]} ${year}`}
            />
          </Card>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      />
      <ActionBar label="Registrar movimiento" onPress={() => navigation.navigate('MovimientoForm', undefined)} />
    </Screen>
  );
}
