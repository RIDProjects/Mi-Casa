import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SectionList,
  SectionListData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';
import { debtsService } from '../../services/debts.service';
import { Debt } from '../../types';
import { formatMoney } from '../../utils/currency';
import DebtCard from '../../components/debts/DebtCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { DebtsStackParamList } from '../../navigation/types';
import { useManualRefresh } from '../../hooks/useManualRefresh';

type Nav = NativeStackNavigationProp<DebtsStackParamList>;

const fmt = formatMoney;

interface Section {
  title: string;
  titleColor: string;
  bgColor: string;
  data: Debt[];
  total: number;
}

export default function DebtsSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const {
    data: debts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['debts'],
    queryFn: debtsService.getAll,
    staleTime: 0,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const {
    data: summary,
    isLoading: loadingSummary,
  } = useQuery({
    queryKey: ['debtsSummary'],
    queryFn: debtsService.getSummary,
    staleTime: 0,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['debts'] });
    qc.invalidateQueries({ queryKey: ['debtsSummary'] });
  }, [qc]);

  const markPaidMut = useMutation({
    mutationFn: (id: string) => debtsService.markAsPaid(id),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => debtsService.delete(id),
    onSuccess: invalidate,
  });

  if (isLoading || loadingSummary) {
    return <LoadingSpinner message="Cargando deudas..." />;
  }

  const theyOweMe = debts.filter((d) => d.type === 'they_owe_me' && !d.isPaid);
  const iOwe = debts.filter((d) => d.type === 'i_owe' && !d.isPaid);
  const paidDebts = debts.filter((d) => d.isPaid);

  const totalTheyOweMe = theyOweMe.reduce((s, d) => s + Number(d.amount), 0);
  const totalIOwe = iOwe.reduce((s, d) => s + Number(d.amount), 0);
  const balance = (summary?.balance ?? totalTheyOweMe - totalIOwe);
  const isPositive = balance >= 0;

  const sections: Section[] = [
    {
      title: 'ME DEBEN',
      titleColor: Colors.blue,
      bgColor: Colors.blueBg,
      data: theyOweMe,
      total: totalTheyOweMe,
    },
    {
      title: 'LES DEBO',
      titleColor: Colors.red,
      bgColor: Colors.redBg,
      data: iOwe,
      total: totalIOwe,
    },
    ...(paidDebts.length > 0
      ? [
          {
            title: `HISTORIAL PAGADAS (${paidDebts.length})`,
            titleColor: Colors.textSecondary,
            bgColor: Colors.cardAlt + '50',
            data: paidDebts,
            total: 0,
          },
        ]
      : []),
  ];

  const renderItem = ({ item }: { item: Debt }) => {
    if (item.isPaid) {
      return (
        <View style={[styles.paidCard, { opacity: 0.6 }]}>
          <Text style={styles.paidName}>{item.personName}</Text>
          <Text style={[styles.paidAmount, { textDecorationLine: 'line-through', color: Colors.textSecondary }]}>
            {fmt(item.amount)}
          </Text>
          <Text style={styles.paidType}>
            {item.type === 'they_owe_me' ? 'Me debía' : 'Le debía'}
          </Text>
        </View>
      );
    }
    return (
      <DebtCard
        debt={item}
        onMarkPaid={(id) => markPaidMut.mutate(id)}
        onDelete={(id) => deleteMut.mutate(id)}
        onEdit={(id) => navigation.navigate('AddDebt', { debtId: id })}
      />
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionListData<Debt, Section> }) => (
    <View style={[styles.sectionHeader, { backgroundColor: section.bgColor }]}>
      <Text style={[styles.sectionTitle, { color: section.titleColor }]}>
        {section.title}
      </Text>
      {section.total > 0 ? (
        <Text style={[styles.sectionTotal, { color: section.titleColor }]}>
          {fmt(section.total)}
        </Text>
      ) : null}
    </View>
  );

  const renderSectionFooter = ({ section }: { section: SectionListData<Debt, Section> }) => {
    if (section.data.length === 0 && section.title !== `HISTORIAL PAGADAS (${paidDebts.length})`) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>
            {section.title === 'ME DEBEN'
              ? 'Nadie te debe dinero'
              : 'No debés dinero a nadie'}
          </Text>
        </View>
      );
    }
    return <View style={styles.sectionSpacer} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header de la pantalla */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Deudas</Text>
          <Text style={styles.screenSubtitle}>Control de deudas bidireccional</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutHint}
          onPress={() => navigation.navigate('AddDebt', {})}
        >
          <Ionicons name="person-circle-outline" size={30} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Saldo neto */}
      <View style={[styles.balanceCard, { borderColor: isPositive ? Colors.green : Colors.red }]}>
        <Text style={styles.balanceLabel}>Saldo neto</Text>
        <Text style={[styles.balanceAmount, { color: isPositive ? Colors.green : Colors.red }]}>
          {isPositive ? '+' : ''}{fmt(balance)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Me deben</Text>
            <Text style={[styles.balanceStatValue, { color: Colors.green }]}>
              +{fmt(summary?.totalTheyOweMe ?? totalTheyOweMe)}
            </Text>
          </View>
          <View style={[styles.balanceDivider]} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Les debo</Text>
            <Text style={[styles.balanceStatValue, { color: Colors.red }]}>
              -{fmt(summary?.totalIOwe ?? totalIOwe)}
            </Text>
          </View>
        </View>
      </View>

      {/* Lista con secciones */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="Sin deudas registradas"
            subtitle="Pulsá el botón + para registrar una nueva deuda"
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDebt', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  screenSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  logoutHint: {
    padding: 4,
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    gap: 8,
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 16,
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  balanceStatLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  balanceStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSpacer: {
    height: 8,
  },
  emptySection: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptySectionText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 100,
  },
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  paidName: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  paidType: {
    color: Colors.textMuted,
    fontSize: 12,
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
