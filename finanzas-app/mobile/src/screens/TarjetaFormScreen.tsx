import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardsService } from '../services/creditCards.service';
import { CardPaymentType, CreditCardPayload } from '../types';
import { RootStackParamList } from '../navigation/types';
import { useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../components/ui';

type RouteT = RouteProp<RootStackParamList, 'TarjetaForm'>;

export const TIPO_PAGO_OPTIONS: { value: CardPaymentType; label: string }[] = [
  { value: 'full', label: 'Pago todo el saldo' },
  { value: 'minimum', label: 'Pago mínimo' },
  { value: 'stopped', label: 'Dejé de pagar' },
  { value: 'partial', label: 'Pago parcial' },
];

interface FormErrors {
  banco?: string;
  nombreTarjeta?: string;
  saldoActual?: string;
  lineaCredito?: string;
  tasaAnual?: string;
  fechaCorte?: string;
  fechaPago?: string;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
    row: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },
    label: { fontFamily: fonts.semibold, fontSize: 12, color: c.onSurfaceVariant, marginBottom: 6, letterSpacing: 0.3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    chipActive: { borderColor: c.brand, backgroundColor: c.panel },
    chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurfaceVariant },
    chipTextActive: { color: c.onSurface, fontFamily: fonts.semibold },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancel: { flex: 1 },
    save: { flex: 2 },
  });

const toNumber = (value: string): number => (value.trim() === '' ? NaN : Number(value.replace(',', '.')));

// Optional day-of-month field: empty is fine, otherwise an integer 1..31.
const isInvalidDay = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const day = Number(trimmed);
  return !Number.isInteger(day) || day < 1 || day > 31;
};

const DAY_ERROR = 'Ingresa un día entre 1 y 31.';

export default function TarjetaFormScreen() {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const existing = route.params?.card;
  const isEditing = !!existing;

  const [banco, setBanco] = useState(existing?.banco ?? '');
  const [nombreTarjeta, setNombreTarjeta] = useState(existing?.nombreTarjeta ?? '');
  const [saldoActual, setSaldoActual] = useState(existing ? String(Number(existing.saldoActual)) : '');
  const [lineaCredito, setLineaCredito] = useState(existing ? String(Number(existing.lineaCredito)) : '');
  const [tasaAnual, setTasaAnual] = useState(existing ? String(Number(existing.tasaAnual)) : '');
  const [fechaCorte, setFechaCorte] = useState(existing?.fechaCorte ?? '');
  const [fechaPago, setFechaPago] = useState(existing?.fechaPago ?? '');
  const [tipoPago, setTipoPago] = useState<CardPaymentType>(existing?.tipoPago ?? 'full');
  const [errors, setErrors] = useState<FormErrors>({});

  const saveMut = useMutation({
    mutationFn: (data: CreditCardPayload) =>
      isEditing ? creditCardsService.update(existing!.id, data) : creditCardsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-cards'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isPending = saveMut.isPending;

  const handleSubmit = () => {
    const next: FormErrors = {};
    const saldo = toNumber(saldoActual);
    const limite = toNumber(lineaCredito);
    const tasa = toNumber(tasaAnual);

    if (!banco.trim()) next.banco = 'Ingresa el banco.';
    if (!nombreTarjeta.trim()) next.nombreTarjeta = 'Ingresa el nombre de la tarjeta.';
    if (isNaN(saldo) || saldo < 0) next.saldoActual = 'El saldo actual no puede ser negativo.';
    if (isNaN(limite) || limite <= 0) next.lineaCredito = 'La línea de crédito debe ser mayor a cero.';
    if (isNaN(tasa) || tasa < 0 || tasa > 100) next.tasaAnual = 'La tasa anual debe estar entre 0 y 100 (%)';
    if (isInvalidDay(fechaCorte)) next.fechaCorte = DAY_ERROR;
    if (isInvalidDay(fechaPago)) next.fechaPago = DAY_ERROR;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: CreditCardPayload = {
      banco: banco.trim(),
      nombreTarjeta: nombreTarjeta.trim(),
      tasaAnual: tasa,
      saldoActual: saldo,
      lineaCredito: limite,
      tipoPago,
    };
    if (fechaCorte.trim()) payload.fechaCorte = fechaCorte.trim();
    if (fechaPago.trim()) payload.fechaPago = fechaPago.trim();
    saveMut.mutate(payload);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen edges={['bottom']}>
        <Reveal index={0}>
          <Card style={styles.form}>
            <TextField
              label="Banco"
              accessibilityLabel="Banco"
              icon="business-outline"
              value={banco}
              onChangeText={setBanco}
              placeholder="Ej: Santander"
              error={errors.banco}
              editable={!isPending}
              returnKeyType="next"
            />

            <TextField
              label="Nombre de la tarjeta"
              accessibilityLabel="Nombre de la tarjeta"
              icon="card-outline"
              value={nombreTarjeta}
              onChangeText={setNombreTarjeta}
              placeholder="Ej: Visa Oro"
              error={errors.nombreTarjeta}
              editable={!isPending}
              returnKeyType="next"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label="Saldo actual"
                  accessibilityLabel="Saldo actual"
                  value={saldoActual}
                  onChangeText={setSaldoActual}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.saldoActual}
                  editable={!isPending}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Línea de crédito"
                  accessibilityLabel="Línea de crédito"
                  value={lineaCredito}
                  onChangeText={setLineaCredito}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.lineaCredito}
                  editable={!isPending}
                />
              </View>
            </View>

            <TextField
              label="Tasa anual %"
              accessibilityLabel="Tasa anual %"
              icon="trending-up-outline"
              value={tasaAnual}
              onChangeText={setTasaAnual}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.tasaAnual}
              editable={!isPending}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label="Fecha de corte (día)"
                  accessibilityLabel="Fecha de corte (día)"
                  value={fechaCorte}
                  onChangeText={setFechaCorte}
                  placeholder="15"
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors.fechaCorte}
                  editable={!isPending}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Fecha de pago (día)"
                  accessibilityLabel="Fecha de pago (día)"
                  value={fechaPago}
                  onChangeText={setFechaPago}
                  placeholder="5"
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors.fechaPago}
                  editable={!isPending}
                />
              </View>
            </View>

            <View>
              <Text style={styles.label}>Tipo de pago</Text>
              <View style={styles.chipRow}>
                {TIPO_PAGO_OPTIONS.map((option) => {
                  const active = tipoPago === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTipoPago(option.value)}
                      disabled={isPending}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={isPending}
                style={styles.cancel}
              />
              <Button
                label={isEditing ? 'Guardar cambios' : 'Registrar tarjeta'}
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
