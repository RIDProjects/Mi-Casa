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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { householdExpensesService } from '../../services/household-expenses.service';
import { HouseholdResumenCategoria } from '../../types';
import { formatMoney } from '../../utils/currency';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { GastosStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<GastosStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmt = (amount: number) => formatMoney(amount, 'CUP');

// Fila normalizada para renderizar tanto "compras de mercado" (agregadas, sin id,
// no editables desde esta pantalla — vienen de la Lista de la Compra) como
// "salidas" (entradas manuales del household-expenses, con id y borrables).
interface ExpenseRow {
  key: string;
  id?: string;
  descripcion: string;
  categoria: string;
  fecha: string;
  lugar?: string | null;
  monto: number;
  deletable: boolean;
}

function CategoryBar({
  label,
  total,
  percentage,
}: {
  label: string;
  total: number;
  percentage: number;
}) {
  const color = Colors.categories[label] ?? Colors.textSecondary;
  return (
    <View style={catStyles.row}>
      <View style={catStyles.labelRow}>
        <View style={[catStyles.dot, { backgroundColor: color }]} />
        <Text style={catStyles.label}>{label}</Text>
        <Text style={catStyles.percentage}>{percentage.toFixed(0)}%</Text>
        <Text style={catStyles.amount}>{fmt(total)}</Text>
      </View>
      <View style={catStyles.barBg}>
        <View
          style={[
            catStyles.barFill,
            { width: `${Math.max(percentage, 2)}%` as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: { gap: 4, marginBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '500' },
  percentage: { color: Colors.textSecondary, fontSize: 12 },
  amount: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  barBg: {
    height: 6,
    backgroundColor: Colors.cardAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
});

function ExpenseRowItem({
  item,
  onDelete,
  onEdit,
}: {
  item: ExpenseRow;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const catColor = Colors.categories[item.categoria] ?? Colors.textSecondary;

  const handleDelete = () => {
    if (!item.id) return;
    Alert.alert('Eliminar gasto', `¿Eliminar "${item.descripcion}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id!) },
    ]);
  };

  return (
    <TouchableOpacity
      style={txStyles.card}
      activeOpacity={item.deletable ? 0.7 : 1}
      disabled={!item.deletable}
      onPress={() => item.id && onEdit(item.id)}
    >
      <View style={[txStyles.catIndicator, { backgroundColor: catColor }]} />
      <View style={txStyles.content}>
        <View style={txStyles.topRow}>
          <Text style={txStyles.concepto} numberOfLines={1}>{item.descripcion}</Text>
          <Text style={[txStyles.monto, { color: Colors.red }]}>-{fmt(item.monto)}</Text>
        </View>
        <View style={txStyles.bottomRow}>
          <View style={[txStyles.catBadge, { backgroundColor: catColor + '30' }]}>
            <Text style={[txStyles.catLabel, { color: catColor }]}>{item.categoria}</Text>
          </View>
          {!!item.lugar && <Text style={txStyles.metodo}>{item.lugar}</Text>}
          <Text style={txStyles.fecha}>{item.fecha}</Text>
        </View>
      </View>
      {item.deletable && (
        <TouchableOpacity style={txStyles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const txStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catIndicator: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  concepto: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  monto: { fontSize: 14, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catLabel: { fontSize: 11, fontWeight: '600' },
  metodo: { color: Colors.textMuted, fontSize: 11 },
  fecha: { color: Colors.textMuted, fontSize: 11, marginLeft: 'auto' },
  deleteBtn: { padding: 12 },
});

export default function ExpenseRegistryScreen() {
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
    refetch,
  } = useQuery({
    queryKey: qKey,
    queryFn: () => householdExpensesService.getMonth(monthStr),
    staleTime: 0,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const comprasMercado = data?.comprasMercado ?? [];
  const salidas = data?.salidas ?? [];
  const resumenCategoria = data?.resumenCategoria ?? [];
  const totalCompras = data?.totalCompras ?? 0;
  const totalSalidas = data?.totalSalidas ?? 0;
  const total = data?.total ?? 0;

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
      monto: c.totalCUP,
      deletable: false,
    }));
    const salidaRows: ExpenseRow[] = salidas.map((s) => ({
      key: s.id,
      id: s.id,
      descripcion: s.descripcion,
      categoria: s.categoria,
      fecha: s.fecha,
      lugar: s.lugar,
      monto: s.montoCUP,
      deletable: true,
    }));
    return [...salidaRows, ...compraRows];
  }, [comprasMercado, salidas]);

  const categoryTotals = useMemo((): HouseholdResumenCategoria[] => {
    return [...resumenCategoria].sort((a, b) => b.totalCUP - a.totalCUP);
  }, [resumenCategoria]);

  if (isLoading) return <LoadingSpinner message="Cargando gastos..." />;

  const ListHeader = (
    <>
      {/* Selector de mes */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthName}>{MONTH_NAMES[month - 1]}</Text>
          <Text style={styles.monthYear}>{year}</Text>
        </View>
        <TouchableOpacity
          style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          onPress={nextMonth}
          disabled={isCurrentMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isCurrentMonth ? Colors.textMuted : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Resumen del mes */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryLabel}>Total gastos del mes</Text>
          <Text style={[styles.summaryAmount, { color: Colors.red }]}>
            -{fmt(total)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Compras de mercado</Text>
          <Text style={styles.summaryRowValue}>{fmt(totalCompras)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Salidas y otros gastos</Text>
          <Text style={styles.summaryRowValue}>{fmt(totalSalidas)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Registros</Text>
          <Text style={styles.summaryRowValue}>{rows.length}</Text>
        </View>
      </View>

      {/* Breakdown por categoría */}
      {categoryTotals.length > 0 && (
        <View style={styles.categoriesCard}>
          <Text style={styles.sectionTitle}>Gastos por categoría</Text>
          {categoryTotals.map((ct) => (
            <CategoryBar
              key={ct.categoria}
              label={ct.categoria}
              total={ct.totalCUP}
              percentage={total > 0 ? (ct.totalCUP / total) * 100 : 0}
            />
          ))}
        </View>
      )}

      {/* Título de la lista */}
      {rows.length > 0 && (
        <Text style={styles.sectionTitle}>Gastos del mes</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <ExpenseRowItem
            item={item}
            onDelete={(id) => deleteMut.mutate(id)}
            onEdit={(id) => navigation.navigate('AddHouseholdExpense', { expenseId: id })}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Sin gastos"
            subtitle={`No hay registros para ${MONTH_NAMES[month - 1]} ${year}`}
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddHouseholdExpense', undefined)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, gap: 0, paddingBottom: 32 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthArrow: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.cardAlt,
  },
  monthArrowDisabled: { opacity: 0.4 },
  monthCenter: { alignItems: 'center' },
  monthName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  monthYear: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryMain: { gap: 4 },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryRowLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryRowValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  categoriesCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
