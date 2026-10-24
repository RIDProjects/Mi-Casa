import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardsService } from '../services/creditCards.service';
import { CardPaymentType, CreditCard } from '../types';
import { formatMoney } from '../utils/currency';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { RootStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors, Tone } from '../theme/tokens';
import { ActionBar, Badge, Card, EmptyState, ErrorState, ProgressBar, Reveal, Screen, Skeleton } from '../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ADVISORY: Record<CardPaymentType, { label: string; tone: Tone }> = {
  full: { label: 'Pagas saldo completo', tone: 'ok' },
  minimum: { label: 'Pagas mínimo', tone: 'warn' },
  stopped: { label: 'Dejaste de pagar', tone: 'danger' },
  partial: { label: 'Pago parcial', tone: 'info' },
};

const MS_PER_DAY = 86400000;

// Same thresholds as the web page: the badge/bar per card and the global total.
const cardTone = (pct: number): Tone => (pct < 30 ? 'ok' : pct < 60 ? 'warn' : 'danger');
const cardLabel = (pct: number): string => (pct < 30 ? 'Saludable' : pct < 60 ? 'Cuidado' : pct < 90 ? 'Alto' : 'Crítico');
const globalTone = (pct: number): Tone => (pct < 30 ? 'ok' : pct < 50 ? 'warn' : 'danger');

// Days until the next payment day (this month, or next month when it has passed).
const daysUntilPayment = (payDay: number): number | null => {
  if (!payDay) return null;
  const today = new Date();
  const daysThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const next = new Date(today.getFullYear(), today.getMonth(), Math.min(payDay, daysThisMonth));
  if (next <= today) {
    const daysNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
    next.setMonth(next.getMonth() + 1, Math.min(payDay, daysNextMonth));
  }
  return Math.ceil((next.getTime() - today.getTime()) / MS_PER_DAY);
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
    bank: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    cardName: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    deleteBtn: { padding: 8, marginRight: -8 },
    amountsRow: { flexDirection: 'row', gap: 8 },
    amountCell: { flex: 1, gap: 2 },
    amount: { fontFamily: fonts.title, fontSize: 14 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    meta: { fontFamily: fonts.regular, color: c.outline, fontSize: 11 },
    skeleton: { gap: 14 },
  });

function CardRow({
  item,
  onEdit,
  onDelete,
}: {
  item: CreditCard;
  onEdit: (item: CreditCard) => void;
  onDelete: (item: CreditCard) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const saldo = Number(item.saldoActual || 0);
  const limite = Number(item.lineaCredito || 0);
  const util = limite > 0 ? (saldo / limite) * 100 : 0;
  const tone = cardTone(util);
  const daysLeft = daysUntilPayment(Number(item.fechaPago));
  const urgency: Tone = daysLeft === null ? 'neutral' : daysLeft <= 3 ? 'danger' : daysLeft <= 7 ? 'warn' : 'neutral';
  const advisory = ADVISORY[item.tipoPago];
  const dates = [item.fechaCorte && `Corte: día ${item.fechaCorte}`, item.fechaPago && `Pago: día ${item.fechaPago}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padded={false} accent={tone === 'ok' ? colors.okInk : tone === 'warn' ? colors.warnInk : colors.dangerInk} onPress={() => onEdit(item)}>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitles}>
            <Text style={styles.bank} numberOfLines={2}>{item.banco}</Text>
            <Text style={styles.cardName} numberOfLines={2}>{item.nombreTarjeta}</Text>
          </View>
          <Badge label={`${cardLabel(util)} ${util.toFixed(0)}%`} tone={tone} />
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} accessibilityLabel="Eliminar tarjeta">
            <Ionicons name="trash-outline" size={16} color={colors.outline} />
          </TouchableOpacity>
        </View>

        <ProgressBar value={util / 100} tone={tone} />

        <View style={styles.amountsRow}>
          <View style={styles.amountCell}>
            <Text style={styles.label}>Saldo</Text>
            <Text style={[styles.amount, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(saldo)}
            </Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.label}>Disponible</Text>
            <Text style={[styles.amount, { color: colors.okInk }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(Math.max(limite - saldo, 0))}
            </Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.label}>Tasa</Text>
            <Text style={[styles.amount, { color: colors.onSurface }]}>{`${item.tasaAnual}%`}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          {advisory && <Badge label={advisory.label} tone={advisory.tone} />}
          {daysLeft !== null && <Badge label={`Pago en ${daysLeft}d`} tone={urgency} />}
        </View>
        {!!dates && <Text style={styles.meta}>{dates}</Text>}
      </View>
    </Card>
  );
}

function SkeletonBlocks() {
  const styles = useThemedStyles(createStyles);
  return (
    <View testID="tarjetas-skeleton" style={styles.skeleton}>
      <Skeleton height={130} radius={radius.lg} />
      <Skeleton height={170} radius={radius.lg} />
      <Skeleton height={170} radius={radius.lg} />
    </View>
  );
}

export default function TarjetasScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => creditCardsService.getAll(),
    staleTime: 0,
    retry: 1,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const cards = data ?? [];

  const { totalDeuda, totalLimite, totalUtil } = useMemo(() => {
    const debt = cards.reduce((sum, c) => sum + Number(c.saldoActual || 0), 0);
    const limit = cards.reduce((sum, c) => sum + Number(c.lineaCredito || 0), 0);
    return { totalDeuda: debt, totalLimite: limit, totalUtil: limit > 0 ? (debt / limit) * 100 : 0 };
  }, [cards]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => creditCardsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-cards'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo eliminar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const confirmDelete = (item: CreditCard) => {
    Alert.alert('Eliminar tarjeta', `¿Eliminar "${item.banco} ${item.nombreTarjeta}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMut.mutate(item.id) },
    ]);
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
            message="No se pudieron cargar las tarjetas. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const utilInk = globalTone(totalUtil) === 'ok' ? colors.okInk : globalTone(totalUtil) === 'warn' ? colors.warnInk : colors.dangerInk;

  const ListHeader =
    cards.length > 0 ? (
      <View style={styles.header}>
        <Reveal index={0}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.label}>Deuda total</Text>
                <Text style={[styles.summaryValue, { color: colors.dangerInk }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(totalDeuda)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.label}>Límite total</Text>
                <Text style={[styles.summaryValue, { color: colors.onSurface }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(totalLimite)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryInline}>
              <Text style={styles.label}>Utilización</Text>
              <Text style={[styles.summaryValue, { color: utilInk }]}>{`${totalUtil.toFixed(1)}%`}</Text>
            </View>
            {totalLimite > 0 && <ProgressBar value={totalUtil / 100} tone={globalTone(totalUtil)} />}
          </Card>
        </Reveal>
        <Text style={styles.sectionTitle}>Tus tarjetas</Text>
      </View>
    ) : null;

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 6) + 1}>
            <CardRow
              item={item}
              onEdit={(card) => navigation.navigate('TarjetaForm', { card })}
              onDelete={confirmDelete}
            />
          </Reveal>
        )}
        ListHeaderComponent={ListHeader ?? undefined}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="card-outline"
              title="No hay tarjetas registradas"
              subtitle="Agrega tu primera tarjeta para empezar a hacer seguimiento"
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
      <ActionBar label="Nueva tarjeta" onPress={() => navigation.navigate('TarjetaForm', undefined)} />
    </Screen>
  );
}
