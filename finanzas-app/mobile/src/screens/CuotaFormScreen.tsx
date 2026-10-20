import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cuotasService } from '../services/cuotas.service';
import { CuotaPayload } from '../types';
import { RootStackParamList } from '../navigation/types';
import { parseLocalDate, todayLocalISO } from '../utils/dates';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../components/ui';

type RouteT = RouteProp<RootStackParamList, 'CuotaForm'>;

const MAX_INSTALLMENTS = 48;

interface FormErrors {
  description?: string;
  totalAmount?: string;
  totalInstallments?: string;
  installmentAmount?: string;
  startDate?: string;
  interestRate?: string;
  cardLastFour?: string;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
    row: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    toggleActive: { borderColor: c.brand, backgroundColor: c.panel },
    toggleText: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurfaceVariant },
    toggleTextActive: { color: c.onSurface, fontFamily: fonts.semibold },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancel: { flex: 1 },
    save: { flex: 2 },
  });

const toNumber = (value: string): number => (value.trim() === '' ? NaN : Number(value.replace(',', '.')));

const round2 = (value: number): number => Math.round(value * 100) / 100;

// Date-only input (AAAA-MM-DD), checked against the local-time Date so no UTC shift is involved.
const isValidDateOnly = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = parseLocalDate(value);
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
};

export default function CuotaFormScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const existing = route.params?.cuota;
  const isEditing = !!existing;

  const [description, setDescription] = useState(existing?.description ?? '');
  const [store, setStore] = useState(existing?.store ?? '');
  const [totalAmount, setTotalAmount] = useState(existing ? String(Number(existing.totalAmount)) : '');
  const [totalInstallments, setTotalInstallments] = useState(existing ? String(Number(existing.totalInstallments)) : '');
  const [installmentAmount, setInstallmentAmount] = useState(existing ? String(Number(existing.installmentAmount)) : '');
  const [startDate, setStartDate] = useState(existing?.startDate ? existing.startDate.slice(0, 10) : todayLocalISO());
  const [withInterest, setWithInterest] = useState(!!existing?.withInterest);
  const [interestRate, setInterestRate] = useState(existing?.interestRate ? String(Number(existing.interestRate)) : '');
  const [cardLastFour, setCardLastFour] = useState(existing?.cardLast4 ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const saveMut = useMutation({
    mutationFn: (data: CuotaPayload) =>
      isEditing ? cuotasService.update(existing!.id, data) : cuotasService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuotas'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isPending = saveMut.isPending;

  // Installment amount defaults to total / installments while the field is empty.
  const totalValue = toNumber(totalAmount);
  const countValue = toNumber(totalInstallments);
  const autoInstallment =
    !installmentAmount.trim() && totalValue > 0 && countValue >= 1 ? round2(totalValue / countValue) : null;

  const handleSubmit = () => {
    const next: FormErrors = {};
    const installment = installmentAmount.trim() ? toNumber(installmentAmount) : autoInstallment;
    const rate = withInterest ? toNumber(interestRate) : 0;

    if (!description.trim()) next.description = 'Ingresa una descripción.';
    if (isNaN(totalValue) || totalValue <= 0) next.totalAmount = 'El monto total debe ser mayor a cero.';
    if (!Number.isInteger(countValue) || countValue < 1 || countValue > MAX_INSTALLMENTS) {
      next.totalInstallments = `Ingresa entre 1 y ${MAX_INSTALLMENTS} cuotas.`;
    }
    if (installment !== null && (isNaN(installment) || installment <= 0)) {
      next.installmentAmount = 'El monto por cuota debe ser mayor a cero.';
    }
    if (!isValidDateOnly(startDate.trim())) next.startDate = 'Ingresa una fecha válida (AAAA-MM-DD).';
    if (withInterest && (isNaN(rate) || rate < 0 || rate > 100)) {
      next.interestRate = 'La tasa de interés debe estar entre 0 y 100 (%)';
    }
    if (cardLastFour.trim() && !/^\d{4}$/.test(cardLastFour.trim())) {
      next.cardLastFour = 'Ingresa los 4 últimos dígitos.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: CuotaPayload = {
      description: description.trim(),
      totalAmount: totalValue,
      totalInstallments: countValue,
      installmentAmount: installment as number,
      startDate: startDate.trim(),
      withInterest,
      interestRate: rate,
    };
    // When editing, empty strings clear the stored values.
    if (store.trim() || isEditing) payload.store = store.trim();
    if (cardLastFour.trim() || isEditing) payload.cardLastFour = cardLastFour.trim();
    saveMut.mutate(payload);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen edges={['bottom']}>
        <Reveal index={0}>
          <Card style={styles.form}>
            <TextField
              label="Descripción"
              accessibilityLabel="Descripción"
              icon="pricetag-outline"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Heladera Samsung"
              error={errors.description}
              editable={!isPending}
              returnKeyType="next"
            />

            <TextField
              label="Comercio (opcional)"
              accessibilityLabel="Comercio (opcional)"
              icon="storefront-outline"
              value={store}
              onChangeText={setStore}
              placeholder="Ej: Frávega, Garbarino..."
              editable={!isPending}
              returnKeyType="next"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label="Monto total"
                  accessibilityLabel="Monto total"
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.totalAmount}
                  editable={!isPending}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Cantidad de cuotas"
                  accessibilityLabel="Cantidad de cuotas"
                  value={totalInstallments}
                  onChangeText={setTotalInstallments}
                  placeholder="12"
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors.totalInstallments}
                  editable={!isPending}
                />
              </View>
            </View>

            <TextField
              label={autoInstallment !== null ? `Monto por cuota (calculado: ${autoInstallment.toFixed(2)})` : 'Monto por cuota'}
              accessibilityLabel="Monto por cuota"
              value={installmentAmount}
              onChangeText={setInstallmentAmount}
              placeholder={autoInstallment !== null ? autoInstallment.toFixed(2) : '0.00'}
              keyboardType="decimal-pad"
              error={errors.installmentAmount}
              editable={!isPending}
            />

            <TextField
              label="Fecha de inicio"
              accessibilityLabel="Fecha de inicio"
              icon="calendar-outline"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.startDate}
              editable={!isPending}
            />

            <TouchableOpacity
              style={[styles.toggle, withInterest && styles.toggleActive]}
              onPress={() => setWithInterest((value) => !value)}
              disabled={isPending}
              accessibilityRole="checkbox"
              accessibilityLabel="Con interés"
              accessibilityState={{ checked: withInterest }}
            >
              <Ionicons
                name={withInterest ? 'checkbox' : 'square-outline'}
                size={20}
                color={withInterest ? colors.brand : colors.outline}
              />
              <Text style={[styles.toggleText, withInterest && styles.toggleTextActive]}>Con interés</Text>
            </TouchableOpacity>

            {withInterest && (
              <TextField
                label="Tasa de interés (%)"
                accessibilityLabel="Tasa de interés (%)"
                icon="trending-up-outline"
                value={interestRate}
                onChangeText={setInterestRate}
                placeholder="0.00"
                keyboardType="decimal-pad"
                error={errors.interestRate}
                editable={!isPending}
              />
            )}

            <TextField
              label="Últimos 4 dígitos de tarjeta (opcional)"
              accessibilityLabel="Últimos 4 dígitos de tarjeta (opcional)"
              icon="card-outline"
              value={cardLastFour}
              onChangeText={setCardLastFour}
              placeholder="1234"
              keyboardType="number-pad"
              maxLength={4}
              error={errors.cardLastFour}
              editable={!isPending}
            />

            <View style={styles.actions}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={isPending}
                style={styles.cancel}
              />
              <Button
                label={isEditing ? 'Guardar cambios' : 'Registrar cuota'}
                icon="checkmark-outline"
                onPress={handleSubmit}
                loading={isPending}
                disabled={isPending}
                style={styles.save}
              />
            </View>
          </Card>
        </Reveal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
