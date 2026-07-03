import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { summaryService } from '../services/summary.service';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function SkeletonCard() {
  return (
    <View style={[skStyles.card]}>
      <View style={skStyles.iconBlock} />
      <View style={skStyles.lineShort} />
      <View style={skStyles.lineLong} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flex: 1,
    margin: 5,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBlock: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cardAlt,
  },
  lineShort: {
    height: 10,
    width: '60%',
    borderRadius: 5,
    backgroundColor: Colors.cardAlt,
  },
  lineLong: {
    height: 20,
    width: '80%',
    borderRadius: 5,
    backgroundColor: Colors.cardAlt,
  },
});

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];

  const {
    data: summary,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['summary'],
    queryFn: summaryService.get,
    staleTime: 0,
    retry: 1,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const totalIngresos = summary?.totalIngresos ?? 0;
  const totalGastos = summary?.totalGastos ?? 0;
  const balance = summary?.balance ?? (totalIngresos - totalGastos);
  const emergencyFund = summary?.emergencyFund ?? 0;

  const isBalancePositive = balance >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'usuario'}
            </Text>
            <Text style={styles.subheading}>{monthName} {now.getFullYear()}</Text>
          </View>
        </View>

        {/* Balance principal */}
        <View style={[styles.balanceCard, { borderColor: isBalancePositive ? Colors.green + '60' : Colors.red + '60' }]}>
          <Text style={styles.balanceLabel}>Disponible del mes</Text>
          <Text style={[styles.balanceAmount, { color: isBalancePositive ? Colors.green : Colors.red }]}>
            {isBalancePositive ? '+' : ''}$ {fmt(balance)}
          </Text>
          {summary?.savingsRate != null && (
            <View style={styles.savingsRateRow}>
              <Text style={styles.savingsRateLabel}>Tasa de ahorro</Text>
              <Text style={[styles.savingsRateValue, { color: summary.savingsRate >= 0 ? Colors.green : Colors.red }]}>
                {summary.savingsRate.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Stat Cards 2×2 */}
        {isLoading ? (
          <>
            <View style={styles.row}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
            <View style={styles.row}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <StatCard
                title="Ingresos"
                value={`$ ${fmt(totalIngresos)}`}
                icon="trending-up-outline"
                color={Colors.green}
              />
              <StatCard
                title="Gastos"
                value={`$ ${fmt(totalGastos)}`}
                icon="trending-down-outline"
                color={Colors.red}
              />
            </View>
            <View style={styles.row}>
              <StatCard
                title="Disponible"
                value={`$ ${fmt(balance)}`}
                icon="wallet-outline"
                color={isBalancePositive ? Colors.blue : Colors.red}
              />
              <StatCard
                title="Fondo Emergencia"
                value={emergencyFund > 0 ? `$ ${fmt(emergencyFund)}` : '—'}
                icon="shield-checkmark-outline"
                color="#f59e0b"
              />
            </View>
          </>
        )}

        {/* Acceso rápido a Deudas */}
        <TouchableOpacity
          style={styles.debtQuickAccess}
          onPress={() => navigation.navigate('DebtsSummary')}
          activeOpacity={0.8}
        >
          <View style={styles.debtQuickLeft}>
            <View style={[styles.debtIcon, { backgroundColor: Colors.blueBg }]}>
              <Ionicons name="wallet-outline" size={18} color={Colors.blue} />
            </View>
            <View>
              <Text style={styles.debtTitle}>Deudas</Text>
              <Text style={styles.debtSubtitle}>Control de deudas bidireccional</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Barra de progreso ingresos vs gastos */}
        {!isLoading && totalIngresos > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Ingresos vs Gastos</Text>
              <Text style={styles.progressPercent}>
                {Math.min(100, Math.round((totalGastos / totalIngresos) * 100))}% usado
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (totalGastos / totalIngresos) * 100)}%` as any,
                    backgroundColor: totalGastos > totalIngresos ? Colors.red : Colors.blue,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
                <Text style={styles.legendText}>Ingresos: $ {fmt(totalIngresos)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
                <Text style={styles.legendText}>Gastos: $ {fmt(totalGastos)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subheading: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 4,
    gap: 6,
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  savingsRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  savingsRateLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  savingsRateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  debtQuickAccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  debtQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  debtIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  debtSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  progressPercent: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
