import React, { useCallback } from 'react';
import { useScreenPolling } from '../../hooks/useScreenPolling';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SectionList,
  SectionListData,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsService } from '../../services/debts.service';
import { Debt } from '../../types';
import { formatMoney } from '../../utils/currency';
import DebtCard from '../../components/debts/DebtCard';
import { DebtsStackParamList } from '../../navigation/types';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius, toneInk } from '../../theme/tokens';
import type { ThemeColors, Tone } from '../../theme/tokens';
import {
  ActionBar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressRing,
  Reveal,
  Screen,
  Skeleton,
} from '../../components/ui';

type Nav = NativeStackNavigationProp<DebtsStackParamList>;

const fmt = formatMoney;

interface Section {
  key: 'owed' | 'owe' | 'paid';
  title: string;
  tone: Tone;
  data: Debt[];
  total: number;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 24 },
    header: { gap: 14, paddingBottom: 14 },
    addHint: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceContainer,
    },
    heroCard: { gap: 14 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroInfo: { flex: 1, gap: 4 },
    heroLabel: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroAmount: { fontFamily: fonts.title, fontSize: 32, letterSpacing: -0.8 },
    heroHint: { fontFamily: fonts.regular, color: c.outline, fontSize: 12 },
    ringValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    ringCaption: { fontFamily: fonts.regular, color: c.outline, fontSize: 9 },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: 16,
    },
    heroStat: { flex: 1, gap: 2 },
    heroStatLabel: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    heroStatValue: { fontFamily: fonts.title, fontSize: 18 },
    heroDivider: { width: 1, height: 32, backgroundColor: c.border },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      marginBottom: 10,
    },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    sectionTotal: { fontFamily: fonts.title, fontSize: 15 },
    itemGap: { marginBottom: 10 },
    emptySection: { paddingVertical: 12, alignItems: 'center' },
    emptySectionText: { fontFamily: fonts.regular, color: c.outline, fontSize: 13 },
    paidRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, opacity: 0.7 },
    paidName: { flex: 1, fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 14 },
    paidAmount: {
      fontFamily: fonts.title,
      color: c.outline,
      fontSize: 14,
      textDecorationLine: 'line-through',
    },
  });

function SkeletonBlocks() {
  return (
    <View testID="debts-skeleton" style={{ gap: 14 }}>
      <Skeleton height={44} radius={radius.md} />
      <Skeleton height={190} radius={radius.lg} />
      <Skeleton height={72} radius={radius.lg} />
      <Skeleton height={72} radius={radius.lg} />
    </View>
  );
}

export default function DebtsSummaryScreen() {
  const pollInterval = useScreenPolling();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const {
    data: debts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['debts'],
    refetchInterval: pollInterval,
    queryFn: debtsService.getAll,
    staleTime: 0,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const {
    data: summary,
    isLoading: loadingSummary,
  } = useQuery({
    queryKey: ['debtsSummary'],
    refetchInterval: pollInterval,
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
    onError: () => Alert.alert('Error', 'No se pudo marcar la deuda como pagada'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => debtsService.delete(id),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'No se pudo eliminar la deuda'),
  });

  if (isLoading || loadingSummary) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError && debts.length === 0) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <PageHeader title="Deudas" subtitle="Control de deudas bidireccional" />
        <Card>
          <ErrorState
            message="No se pudieron cargar las deudas. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const theyOweMe = debts.filter((d) => d.type === 'they_owe_me' && !d.isPaid);
  const iOwe = debts.filter((d) => d.type === 'i_owe' && !d.isPaid);
  const paidDebts = debts.filter((d) => d.isPaid);

  const totalTheyOweMe = theyOweMe.reduce((s, d) => s + Number(d.amount), 0);
  const totalIOwe = iOwe.reduce((s, d) => s + Number(d.amount), 0);
  const balance = (summary?.balance ?? totalTheyOweMe - totalIOwe);
  const isPositive = balance >= 0;
  const balanceTone: Tone = isPositive ? 'ok' : 'danger';

  const totalPaid = paidDebts.reduce((s, d) => s + Number(d.amount), 0);
  const totalAll = totalPaid + totalTheyOweMe + totalIOwe;
  const paidShare = totalAll > 0 ? totalPaid / totalAll : 0;

  const sections: Section[] = debts.length === 0
    ? []
    : [
        { key: 'owed', title: 'Me deben', tone: 'info', data: theyOweMe, total: totalTheyOweMe },
        { key: 'owe', title: 'Les debo', tone: 'danger', data: iOwe, total: totalIOwe },
        ...(paidDebts.length > 0
          ? [{ key: 'paid' as const, title: `Historial pagadas (${paidDebts.length})`, tone: 'neutral' as Tone, data: paidDebts, total: 0 }]
          : []),
      ];

  const renderItem = ({ item, index }: { item: Debt; index: number }) => {
    if (item.isPaid) {
      return (
        <Reveal index={Math.min(index, 6) + 2} style={styles.itemGap}>
          <Card padded={false}>
            <View style={styles.paidRow}>
              <Text style={styles.paidName} numberOfLines={1}>{item.personName}</Text>
              <Text style={styles.paidAmount}>{fmt(item.amount)}</Text>
              <Badge
                label={item.type === 'they_owe_me' ? 'Me debía' : 'Le debía'}
                tone={item.type === 'they_owe_me' ? 'ok' : 'danger'}
              />
            </View>
          </Card>
        </Reveal>
      );
    }
    return (
      <Reveal index={Math.min(index, 6) + 2} style={styles.itemGap}>
        <DebtCard
          debt={item}
          onMarkPaid={(id) => markPaidMut.mutate(id)}
          onDelete={(id) => deleteMut.mutate(id)}
          onEdit={(id) => navigation.navigate('AddDebt', { debtId: id })}
        />
      </Reveal>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionListData<Debt, Section> }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.total > 0 ? (
        <Text style={[styles.sectionTotal, { color: toneInk(colors, section.tone) }]}>
          {fmt(section.total)}
        </Text>
      ) : null}
    </View>
  );

  const renderSectionFooter = ({ section }: { section: SectionListData<Debt, Section> }) => {
    if (section.data.length === 0 && section.key !== 'paid') {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>
            {section.key === 'owed' ? 'Nadie te debe dinero' : 'No debes dinero a nadie'}
          </Text>
        </View>
      );
    }
    return null;
  };

  const ListHeader = (
    <View style={styles.header}>
      <Reveal index={0}>
        <PageHeader
          title="Deudas"
          subtitle="Control de deudas bidireccional"
          right={
            <TouchableOpacity
              style={styles.addHint}
              onPress={() => navigation.navigate('AddDebt', {})}
              accessibilityLabel="Agregar persona"
            >
              <Ionicons name="person-add-outline" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          }
        />
      </Reveal>

      <Reveal index={1}>
        <Card style={styles.heroCard} accent={toneInk(colors, balanceTone)}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroLabel}>Saldo neto</Text>
              <Text
                style={[styles.heroAmount, { color: toneInk(colors, balanceTone) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {isPositive ? '+' : ''}{fmt(balance)}
              </Text>
              {totalPaid > 0 ? <Text style={styles.heroHint}>Pagado {fmt(totalPaid)}</Text> : null}
            </View>
            {totalAll > 0 ? (
              <ProgressRing value={paidShare} size={84} thickness={9} color={colors.okInk}>
                <Text style={styles.ringValue}>{Math.round(paidShare * 100)}%</Text>
                <Text style={styles.ringCaption}>pagado</Text>
              </ProgressRing>
            ) : null}
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Me deben</Text>
              <Text style={[styles.heroStatValue, { color: colors.okInk }]} numberOfLines={1} adjustsFontSizeToFit>
                +{fmt(summary?.totalTheyOweMe ?? totalTheyOweMe)}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Les debo</Text>
              <Text style={[styles.heroStatValue, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
                -{fmt(summary?.totalIOwe ?? totalIOwe)}
              </Text>
            </View>
          </View>
        </Card>
      </Reveal>
    </View>
  );

  return (
    <Screen edges={['bottom']} scroll={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={ListHeader}
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
              icon="wallet-outline"
              title="Sin deudas registradas"
              subtitle="Usa el botón de abajo para registrar una nueva deuda"
            />
          </Card>
        }
      />

      <ActionBar label="Registrar deuda" onPress={() => navigation.navigate('AddDebt', {})} />
    </Screen>
  );
}
