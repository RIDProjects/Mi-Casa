import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cuotasService } from '../services/cuotas.service';
import { Cuota } from '../types';
import { formatMoney } from '../utils/currency';
import { parseLocalDate } from '../utils/dates';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { ActionBar, Badge, Button, Card, EmptyState, ErrorState, ProgressBar, Reveal, Screen, Skeleton } from '../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatDate = (value: string): string =>
  parseLocalDate(value.slice(0, 10)).toLocaleDateString('es-CU', { day: '2-digit', month: 'short', year: 'numeric' });

const errorMessage = (err: any, fallback: string): string => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 24, gap: 10 },
    header: { gap: 14, marginBottom: 4 },
    summaryCard: { gap: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    summaryCell: { flex: 1, gap: 2 },
    summaryInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
    label: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    summaryValue: { fontFamily: fonts.title, fontSize: 18 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 17 },
    cardBody: { padding: 16, paddingLeft: 20, gap: 10 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitles: { flex: 1, gap: 2 },
    title: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    store: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    deleteBtn: { padding: 8, marginRight: -8 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    progressText: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    amountsRow: { flexDirection: 'row', gap: 8 },
    amountCell: { flex: 1, gap: 2 },
    amount: { fontFamily: fonts.title, fontSize: 14 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    meta: { flex: 1, fontFamily: fonts.regular, color: c.outline, fontSize: 11 },
    skeleton: { gap: 14 },
  });

function CuotaRow({
  item,
  onEdit,
  onDelete,
  onPay,
  paying,
}: {
  item: Cuota;
  onEdit: (item: Cuota) => void;
  onDelete: (item: Cuota) => void;
  onPay: (item: Cuota) => void;
  paying: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const paid = Number(item.paidInstallments || 0);
  const total = Number(item.totalInstallments || 1);
  const monthly = Number(item.installmentAmount || 0);
  const remaining = total - paid;
  const pct = Math.min((paid / total) * 100, 100);
  const completed = remaining <= 0 || !!item.isCompleted;
  const meta = [
    item.nextPaymentDate && !completed && `Próximo vencimiento: ${formatDate(item.nextPaymentDate)}`,
    item.cardLast4 && `**** ${item.cardLast4}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padded={false} accent={completed ? colors.okInk : colors.brand} onPress={() => onEdit(item)}>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitles}>
            <Text style={styles.title} numberOfLines={2}>{item.description}</Text>
            {!!item.store && <Text style={styles.store} numberOfLines={1}>{item.store}</Text>}
          </View>
          <Badge label={completed ? 'Completada' : 'En curso'} tone={completed ? 'ok' : 'info'} />
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} accessibilityLabel="Eliminar cuota">
            <Ionicons name="trash-outline" size={16} color={colors.outline} />
          </TouchableOpacity>
        </View>

        <ProgressBar value={pct / 100} tone={completed ? 'ok' : 'info'} />
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{`${paid} de ${total} cuotas pagadas`}</Text>
          <Text style={styles.progressText}>{`${Math.round(pct)}%`}</Text>
        </View>

        <View style={styles.amountsRow}>
          <View style={styles.amountCell}>
            <Text style={styles.label}>Cuota mensual</Text>
            <Text style={[styles.amount, { color: colors.onSurface }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(monthly)}
            </Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.label}>Restante</Text>
            <Text style={[styles.amount, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(Math.max(remaining, 0) * monthly)}
            </Text>
          </View>
        </View>

        {item.withInterest && (
          <View style={styles.badges}>
            <Badge label={`Con interés${Number(item.interestRate) ? ` ${Number(item.interestRate)}%` : ''}`} tone="warn" />
          </View>
        )}

        {(!!meta || !completed) && (
          <View style={styles.footer}>
            <Text style={styles.meta}>{meta}</Text>
            {!completed && <Button label="Pagar cuota" small disabled={paying} onPress={() => onPay(item)} />}
          </View>
        )}
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  const styles = useThemedStyles(createStyles);
  return (
    <View testID="cuotas-skeleton" style={styles.skeleton}>
      <Skeleton height={100} radius={radius.lg} />
      <Skeleton height={190} radius={radius.lg} />
      <Skeleton height={190} radius={radius.lg} />
    </View>
  );
}

export default function CuotasScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cuotas'],
    queryFn: () => cuotasService.getAll(),
    staleTime: 0,
    retry: 1,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const cuotas = data ?? [];

  const { monthly, activeCount, remainingDebt } = useMemo(() => {
    const active = cuotas.filter((c) => Number(c.totalInstallments) - Number(c.paidInstallments) > 0 && !c.isCompleted);
    return {
      monthly: active.reduce((sum, c) => sum + Number(c.installmentAmount || 0), 0),
      activeCount: active.length,
      remainingDebt: active.reduce(
        (sum, c) => sum + (Number(c.totalInstallments) - Number(c.paidInstallments)) * Number(c.installmentAmount || 0),
        0,
      ),
    };
  }, [cuotas]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cuotas'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => cuotasService.remove(id),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', errorMessage(err, 'No se pudo eliminar')),
  });

  const payMut = useMutation({
    mutationFn: (id: string) => cuotasService.pay(id),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', errorMessage(err, 'No se pudo registrar el pago')),
  });

  const confirmDelete = (item: Cuota) => {
    Alert.alert('Eliminar cuota', `¿Eliminar "${item.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMut.mutate(item.id) },
    ]);
  };

  const confirmPay = (item: Cuota) => {
    Alert.alert(
      'Pagar cuota',
      `¿Registrar el pago de la cuota ${Number(item.paidInstallments) + 1} de ${item.totalInstallments} de "${item.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pagar', onPress: () => payMut.mutate(item.id) },
      ],
    );
  };

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
        <Card>
          <ErrorState
            message="No se pudieron cargar las cuotas. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const ListHeader =
    cuotas.length > 0 ? (
      <View style={styles.header}>
        <Reveal index={0}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.label}>Compromiso mensual</Text>
                <Text style={[styles.summaryValue, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(monthly)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.label}>Deuda total restante</Text>
                <Text style={[styles.summaryValue, { color: colors.warnInk }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(remainingDebt)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryInline}>
              <Text style={styles.label}>Cuotas activas</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{String(activeCount)}</Text>
            </View>
          </Card>
        </Reveal>
        <Text style={styles.sectionTitle}>Tus cuotas</Text>
      </View>
    ) : null;

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={cuotas}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 6) + 1}>
            <CuotaRow
              item={item}
              onEdit={(cuota) => navigation.navigate('CuotaForm', { cuota })}
              onDelete={confirmDelete}
              onPay={confirmPay}
              paying={payMut.isPending}
            />
          </Reveal>
        )}
        ListHeaderComponent={ListHeader ?? undefined}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="layers-outline"
              title="Sin cuotas registradas"
              subtitle="Registra tus compras en cuotas para hacer un seguimiento"
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
      <ActionBar label="Nueva cuota" onPress={() => navigation.navigate('CuotaForm', undefined)} />
    </Screen>
  );
}
