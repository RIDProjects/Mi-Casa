import React from 'react';
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
import { notificationsService } from '../services/notifications.service';
import { creditCardsService } from '../services/creditCards.service';
import { cuotasService } from '../services/cuotas.service';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { RootStackParamList } from '../navigation/types';
import { formatMoney } from '../utils/currency';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmt = formatMoney;

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

  const totalIngresos = summary?.totalIngresos ?? 0;
  const totalGastos = summary?.totalGastos ?? 0;
  const balance = summary?.balance ?? (totalIngresos - totalGastos);
  const emergencyFund = summary?.emergencyFund ?? 0;

  const isBalancePositive = balance >= 0;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeCuotas = cuotas.filter((c) => c.paidInstallments < c.totalInstallments);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
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
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notificaciones')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance principal */}
        <View style={[styles.balanceCard, { borderColor: isBalancePositive ? Colors.green + '60' : Colors.red + '60' }]}>
          <Text style={styles.balanceLabel}>Disponible del mes</Text>
          <Text style={[styles.balanceAmount, { color: isBalancePositive ? Colors.green : Colors.red }]}>
            {isBalancePositive ? '+' : ''}{fmt(balance)}
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
                value={fmt(totalIngresos)}
                icon="trending-up-outline"
                color={Colors.green}
              />
              <StatCard
                title="Gastos"
                value={fmt(totalGastos)}
                icon="trending-down-outline"
                color={Colors.red}
              />
            </View>
            <View style={styles.row}>
              <StatCard
                title="Disponible"
                value={fmt(balance)}
                icon="wallet-outline"
                color={isBalancePositive ? Colors.blue : Colors.red}
              />
              <StatCard
                title="Fondo Emergencia"
                value={emergencyFund > 0 ? fmt(emergencyFund) : '—'}
                icon="shield-checkmark-outline"
                color="#f59e0b"
              />
            </View>
          </>
        )}

        {/* Acceso rápido a Vencimientos */}
        <TouchableOpacity
          style={styles.quickAccess}
          onPress={() => navigation.navigate('Vencimientos')}
          activeOpacity={0.8}
        >
          <View style={styles.quickAccessLeft}>
            <View style={[styles.quickAccessIcon, { backgroundColor: Colors.blueBg }]}>
              <Ionicons name="calendar-outline" size={18} color={Colors.blue} />
            </View>
            <View>
              <Text style={styles.quickAccessTitle}>Vencimientos</Text>
              <Text style={styles.quickAccessSubtitle}>Próximos pagos del hogar</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Tarjetas de crédito */}
        {creditCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarjetas de crédito</Text>
            <View style={styles.sectionList}>
              {creditCards.map((card) => {
                const available = card.lineaCredito - card.saldoActual;
                const utilization = card.utilizationPercent ?? (
                  card.lineaCredito > 0
                    ? Math.min(100, (card.saldoActual / card.lineaCredito) * 100)
                    : 0
                );
                const utilColor = utilization > 80 ? Colors.red : utilization > 50 ? '#f59e0b' : Colors.green;
                return (
                  <View key={card.id} style={styles.miniCard}>
                    <View style={styles.miniCardHeader}>
                      <View>
                        <Text style={styles.miniCardTitle}>{card.nombreTarjeta}</Text>
                        <Text style={styles.miniCardSubtitle}>{card.banco}</Text>
                      </View>
                      <Text style={[styles.miniCardPct, { color: utilColor }]}>
                        {utilization.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.miniBarBg}>
                      <View
                        style={[
                          styles.miniBarFill,
                          { width: `${utilization}%` as any, backgroundColor: utilColor },
                        ]}
                      />
                    </View>
                    <View style={styles.miniCardFooter}>
                      <Text style={styles.miniCardFooterText}>
                        Disponible: {fmt(available)}
                      </Text>
                      <Text style={styles.miniCardFooterText}>
                        Límite: {fmt(card.lineaCredito)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Cuotas activas */}
        {activeCuotas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuotas activas</Text>
            <View style={styles.sectionList}>
              {activeCuotas.map((cuota) => {
                const pct = cuota.totalInstallments > 0
                  ? Math.min(100, (cuota.paidInstallments / cuota.totalInstallments) * 100)
                  : 0;
                return (
                  <View key={cuota.id} style={styles.miniCard}>
                    <View style={styles.miniCardHeader}>
                      <Text style={styles.miniCardTitle} numberOfLines={1}>{cuota.description}</Text>
                      <Text style={styles.miniCardPct}>
                        {cuota.paidInstallments}/{cuota.totalInstallments}
                      </Text>
                    </View>
                    <View style={styles.miniBarBg}>
                      <View
                        style={[
                          styles.miniBarFill,
                          { width: `${pct}%` as any, backgroundColor: Colors.blue },
                        ]}
                      />
                    </View>
                    <Text style={styles.miniCardFooterText}>
                      Cuota mensual: {fmt(cuota.installmentAmount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                <Text style={styles.legendText}>Ingresos: {fmt(totalIngresos)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
                <Text style={styles.legendText}>Gastos: {fmt(totalGastos)}</Text>
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
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  bellBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
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
    fontSize: 32,
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
  quickAccess: {
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
  quickAccessLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickAccessIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  quickAccessSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionList: {
    gap: 8,
  },
  miniCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  miniCardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  miniCardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  miniCardPct: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  miniBarBg: {
    height: 6,
    backgroundColor: Colors.cardAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniCardFooterText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
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
