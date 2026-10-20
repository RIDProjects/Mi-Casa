import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { householdExpensesService } from '../../services/household-expenses.service';
import { HouseholdResumenCategoria } from '../../types';
import { formatMoney } from '../../utils/currency';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { GastosStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Badge, Card, EmptyState, ErrorState, Reveal, Screen, Skeleton } from '../../components/ui';

type Nav = NativeStackNavigationProp<GastosStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Fila normalizada para renderizar tanto "compras de mercado" (agregadas, sin id,
// no editables desde esta pantalla — vienen de la Lista de la Compra, siempre en
// CUP — moneda-menos, fuera de alcance de este cambio) como "salidas" (entradas
// manuales del household-expenses, con id y borrables, ya denominadas en la
// moneda local de la casa vía montoLocal).
interface ExpenseRow {
  key: string;
  id?: string;
  descripcion: string;
  categoria: string;
  fecha: string;
  lugar?: string | null;
  monto: number;
  currency: string;
  deletable: boolean;
}


const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 96, gap: 10 },
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
    monthArrowDisabled: { opacity: 0.4 },
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
    summaryAmount: { fontFamily: fonts.title, color: c.dangerInk, fontSize: 32, letterSpacing: -0.8 },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    summaryRowLabel: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    summaryRowValue: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14, flexShrink: 1 },
    summaryHint: { fontFamily: fonts.regular, color: c.warnInk, fontSize: 12 },
    categoriesCard: { gap: 12 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    catRow: { gap: 6 },
    catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catLabel: { flex: 1, fontFamily: fonts.medium, color: c.onSurface, fontSize: 13 },
    catPercentage: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    catAmount: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 13, marginLeft: 4 },
    catBarBg: { height: 6, backgroundColor: c.ringTrack, borderRadius: 3, overflow: 'hidden' },
    catBarFill: { height: '100%', borderRadius: 3 },
    expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 4 },
    expenseContent: { flex: 1, gap: 6, paddingLeft: 16 },
    expenseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    expenseName: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 14 },
    expenseAmount: { fontFamily: fonts.title, color: c.dangerInk, fontSize: 14 },
    expenseBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    catBadgeText: { fontFamily: fonts.semibold, fontSize: 11 },
    expensePlace: { flexShrink: 1, fontFamily: fonts.regular, color: c.outline, fontSize: 11 },
    expenseDate: { fontFamily: fonts.regular, color: c.outline, fontSize: 11, marginLeft: 'auto' },
    deleteBtn: { padding: 12 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
  });

function CategoryBar({
  label,
  total,
  percentage,
  currency,
}: {
  label: string;
  total: number;
  percentage: number;
  currency: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = Colors.categories[label] ?? colors.outline;
  return (
    <View style={styles.catRow}>
      <View style={styles.catLabelRow}>
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <Text style={styles.catLabel}>{label}</Text>
        <Text style={styles.catPercentage}>{percentage.toFixed(0)}%</Text>
        <Text style={styles.catAmount}>{formatMoney(total, currency)}</Text>
      </View>
      <View style={styles.catBarBg}>
        <View style={[styles.catBarFill, { width: `${Math.max(percentage, 2)}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ExpenseRowItem({
  item,
  onDelete,
  onEdit,
}: {
  item: ExpenseRow;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const catColor = Colors.categories[item.categoria] ?? colors.outline;

  const handleDelete = () => {
    if (!item.id) return;
    Alert.alert('Eliminar gasto', `¿Eliminar "${item.descripcion}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id!) },
    ]);
  };

  return (
    <Card padded={false} accent={catColor} onPress={item.deletable ? () => item.id && onEdit(item.id) : undefined}>
      <View style={styles.expenseRow}>
        <View style={styles.expenseContent}>
          <View style={styles.expenseTop}>
            <Text style={styles.expenseName} numberOfLines={1}>{item.descripcion}</Text>
            <Text style={styles.expenseAmount}>-{formatMoney(item.monto, item.currency)}</Text>
          </View>
          <View style={styles.expenseBottom}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '26' }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{item.categoria}</Text>
            </View>
            {!item.deletable && <Badge label="Mercado" tone="info" />}
            {!!item.lugar && <Text style={styles.expensePlace} numberOfLines={1}>{item.lugar}</Text>}
            <Text style={styles.expenseDate}>{item.fecha}</Text>
          </View>
        </View>
        {item.deletable && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityLabel="Eliminar gasto">
            <Ionicons name="trash-outline" size={16} color={colors.outline} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  return (
    <View testID="expenses-skeleton" style={{ gap: 14 }}>
      <Skeleton height={72} radius={radius.lg} />
      <Skeleton height={190} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
      <Skeleton height={64} radius={radius.lg} />
    </View>
  );
}

export default function ExpenseRegistryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const qKey = ['household-expenses', monthStr];

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: qKey,
    queryFn: () => householdExpensesService.getMonth(monthStr),
    staleTime: 0,
    retry: 1,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const comprasMercado = data?.comprasMercado ?? [];
  const salidas = data?.salidas ?? [];
  const resumenCategoria = data?.resumenCategoria ?? [];
  const totalCompras = data?.totalCompras ?? 0;
  const totalSalidas = data?.totalSalidas ?? 0;
  const total = data?.total ?? 0;
  const unconvertedItems = data?.unconvertedItems ?? 0;
  // House base currency — salidas (manual expenses) are already snapshotted
  // in this currency at write time. Market purchases (comprasMercado /
  // totalCompras) are converted to it by the backend (`totalLocal`, legacy `totalCUP`).
  const monedaLocal = data?.monedaLocal ?? '';

  const deleteMut = useMutation({
    mutationFn: (id: string) => householdExpensesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'No se pudo eliminar');
    },
  });

  // Navegar entre meses
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Compras de mercado (agregadas por lugar, vienen de Lista de la Compra — no editables acá)
  // + salidas (entradas manuales, editables/borrables) combinadas para la lista.
  const rows: ExpenseRow[] = useMemo(() => {
    const compraRows: ExpenseRow[] = comprasMercado.map((c, i) => ({
      key: `compra-${c.lugar}-${i}`,
      descripcion: c.descripcion,
      categoria: c.categoria,
      fecha: c.fecha,
      lugar: c.lugar,
      monto: c.totalLocal ?? c.totalCUP,
      currency: monedaLocal,
      deletable: false,
    }));
    const salidaRows: ExpenseRow[] = salidas.map((s) => ({
      key: s.id,
      id: s.id,
      descripcion: s.descripcion,
      categoria: s.categoria,
      fecha: s.fecha,
      lugar: s.lugar,
      monto: s.montoLocal ?? s.montoCUP,
      currency: monedaLocal,
      deletable: true,
    }));
    return [...salidaRows, ...compraRows];
  }, [comprasMercado, salidas, monedaLocal]);

  const categoryTotals = useMemo((): HouseholdResumenCategoria[] => {
    return [...resumenCategoria].sort((a, b) => b.totalCUP - a.totalCUP);
  }, [resumenCategoria]);

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
        <TouchableOpacity
          style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          onPress={nextMonth}
          disabled={isCurrentMonth}
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={22} color={isCurrentMonth ? colors.outline : colors.onSurface} />
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
            message="No se pudieron cargar los gastos. Revisa tu conexión e inténtalo de nuevo."
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
        <Card style={styles.summaryCard} accent={colors.dangerInk}>
          <Text style={styles.summaryLabel}>Total gastos del mes</Text>
          <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
            -{formatMoney(total, monedaLocal)}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Compras de mercado</Text>
            <Text style={styles.summaryRowValue}>{formatMoney(totalCompras, monedaLocal)}</Text>
          </View>
          {unconvertedItems > 0 && (
            <Text style={styles.summaryHint}>
              Algunos artículos no tienen tasa de cambio y no se incluyen en el total
            </Text>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Salidas y otros gastos</Text>
            <Text style={styles.summaryRowValue}>{formatMoney(totalSalidas, monedaLocal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Registros</Text>
            <Text style={styles.summaryRowValue}>{rows.length}</Text>
          </View>
        </Card>
      </Reveal>

      {categoryTotals.length > 0 && (
        <Reveal index={2}>
          <Card style={styles.categoriesCard}>
            <Text style={styles.sectionTitle}>Gastos por categoría</Text>
            {categoryTotals.map((ct) => (
              <CategoryBar
                key={ct.categoria}
                label={ct.categoria}
                total={ct.totalCUP}
                percentage={total > 0 ? (ct.totalCUP / total) * 100 : 0}
                currency={monedaLocal}
              />
            ))}
          </Card>
        </Reveal>
      )}

      {rows.length > 0 && <Text style={styles.sectionTitle}>Gastos del mes</Text>}
    </View>
  );

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 6) + 3}>
            <ExpenseRowItem
              item={item}
              onDelete={(id) => deleteMut.mutate(id)}
              onEdit={(id) => navigation.navigate('AddHouseholdExpense', { expenseId: id })}
            />
          </Reveal>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="receipt-outline"
              title="Sin gastos"
              subtitle={`No hay registros para ${MONTH_NAMES[month - 1]} ${year}`}
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddHouseholdExpense', undefined)}
        activeOpacity={0.85}
        accessibilityLabel="Registrar gasto"
      >
        <Ionicons name="add" size={28} color={colors.onBrand} />
      </TouchableOpacity>
    </Screen>
  );
}
