import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../theme/colors';
import { summaryService } from '../services/summary.service';
import { UpcomingBill } from '../types';
import { formatMoney } from '../utils/currency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  credit_card: 'card-outline',
  loan: 'business-outline',
  cuota: 'receipt-outline',
};

function urgencyColor(daysUntilDue: number): string {
  if (daysUntilDue <= 3) return Colors.red;
  if (daysUntilDue <= 7) return '#f59e0b';
  return Colors.blue;
}

function BillRow({ bill }: { bill: UpcomingBill }) {
  const color = urgencyColor(bill.daysUntilDue);
  const icon = TYPE_ICON[bill.type] ?? 'calendar-outline';

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>{bill.name}</Text>
        <Text style={styles.rowDate}>
          Vence {new Date(bill.dueDate).toLocaleDateString('es-CU', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatMoney(bill.amount)}</Text>
        <Text style={[styles.rowDays, { color }]}>
          {bill.daysUntilDue <= 0 ? 'Hoy' : `${bill.daysUntilDue} días`}
        </Text>
      </View>
    </View>
  );
}

export default function VencimientosScreen() {
  const {
    data: bills = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['upcoming-bills'],
    queryFn: () => summaryService.getUpcomingBills(),
    staleTime: 0,
    retry: 1,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner message="Cargando vencimientos..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="light" />
      <FlatList
        data={bills}
        keyExtractor={(item, index) => `${item.type}-${item.name}-${index}`}
        renderItem={({ item }) => <BillRow bill={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Sin vencimientos próximos"
            subtitle="No hay pagos programados en los próximos 30 días"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 32, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  rowDate: { color: Colors.textSecondary, fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  rowDays: { fontSize: 11, fontWeight: '600' },
});
