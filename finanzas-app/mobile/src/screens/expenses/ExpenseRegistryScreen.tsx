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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { transactionsService } from '../../services/transactions.service';
import { Transaction, TransactionCategory, CategoryTotal } from '../../types';
import { formatMoney } from '../../utils/currency';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmt = formatMoney;

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

function TransactionItem({
  item,
  onDelete,
}: {
  item: Transaction;
  onDelete: (id: string) => void;
}) {
  const isGasto = item.tipo === 'gasto';
  const color = isGasto ? Colors.red : Colors.green;
  const catColor = Colors.categories[item.categoria] ?? Colors.textSecondary;

  const handleDelete = () => {
    Alert.alert('Eliminar transacción', `¿Eliminar "${item.concepto}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <View style={txStyles.card}>
      <View style={[txStyles.catIndicator, { backgroundColor: catColor }]} />
      <View style={txStyles.content}>
        <View style={txStyles.topRow}>
          <Text style={txStyles.concepto} numberOfLines={1}>{item.concepto}</Text>
          <Text style={[txStyles.monto, { color }]}>
            {isGasto ? '-' : '+'}{fmt(item.monto)}
          </Text>
        </View>
        <View style={txStyles.bottomRow}>
          <View style={[txStyles.catBadge, { backgroundColor: catColor + '30' }]}>
            <Text style={[txStyles.catLabel, { color: catColor }]}>{item.categoria}</Text>
          </View>
          <Text style={txStyles.metodo}>{item.metodoPago}</Text>
          <Text style={txStyles.fecha}>{item.fecha}</Text>
        </View>
      </View>
      <TouchableOpacity style={txStyles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
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
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const {
    data: transactions = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => transactionsService.getByMonth(year, month),
    staleTime: 0,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => transactionsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', year, month] });
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

  // Calcular totales
  const gastos = useMemo(
    () => transactions.filter((t) => t.tipo === 'gasto'),
    [transactions],
  );
  const ingresos = useMemo(
    () => transactions.filter((t) => t.tipo !== 'gasto'),
    [transactions],
  );
  const totalGastos = useMemo(
    () => gastos.reduce((s, t) => s + Number(t.monto), 0),
    [gastos],
  );
  const totalIngresos = useMemo(
    () => ingresos.reduce((s, t) => s + Number(t.monto), 0),
    [ingresos],
  );

  // Breakdown por categoría (solo gastos)
  const categoryTotals = useMemo((): CategoryTotal[] => {
    const map: Record<string, number> = {};
    gastos.forEach((t) => {
      map[t.categoria] = (map[t.categoria] ?? 0) + Number(t.monto);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({
        category: category as TransactionCategory,
        total,
        percentage: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
      }));
  }, [gastos, totalGastos]);

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
            -{fmt(totalGastos)}
          </Text>
        </View>
        {totalIngresos > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Ingresos registrados</Text>
            <Text style={[styles.summaryRowValue, { color: Colors.green }]}>
              +{fmt(totalIngresos)}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Transacciones</Text>
          <Text style={styles.summaryRowValue}>{transactions.length}</Text>
        </View>
      </View>

      {/* Breakdown por categoría */}
      {categoryTotals.length > 0 && (
        <View style={styles.categoriesCard}>
          <Text style={styles.sectionTitle}>Gastos por categoría</Text>
          {categoryTotals.map((ct) => (
            <CategoryBar
              key={ct.category}
              label={ct.category}
              total={ct.total}
              percentage={ct.percentage}
            />
          ))}
        </View>
      )}

      {/* Título de la lista */}
      {transactions.length > 0 && (
        <Text style={styles.sectionTitle}>Transacciones del mes</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Sin transacciones"
            subtitle={`No hay registros para ${MONTH_NAMES[month - 1]} ${year}`}
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
      />
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
});
