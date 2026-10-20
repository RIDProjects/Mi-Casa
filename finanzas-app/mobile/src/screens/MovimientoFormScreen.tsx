import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsService } from '../services/transactions.service';
import { PaymentMethod, TransactionPayload, TransactionType } from '../types';
import { RootStackParamList } from '../navigation/types';
import { parseLocalDate, todayLocalISO } from '../utils/dates';
import { useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../components/ui';

type RouteT = RouteProp<RootStackParamList, 'MovimientoForm'>;

export const CATEGORIES = [
  'Casa', 'Comida', 'Familia', 'Transporte', 'Viajes',
  'Deudas', 'Salud', 'Suscripciones', 'Cuidado Personal', 'Otros',
];

export const TIPO_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'ingreso_fijo', label: 'Ingreso fijo' },
  { value: 'ingreso_variable', label: 'Ingreso variable' },
  { value: 'gasto', label: 'Gasto' },
];

export const METODO_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

interface FormErrors {
  concepto?: string;
  monto?: string;
  categoria?: string;
  fecha?: string;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
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
    errorText: { fontFamily: fonts.medium, fontSize: 12, color: c.dangerInk, marginTop: 6 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancel: { flex: 1 },
    save: { flex: 2 },
  });

const toNumber = (value: string): number => (value.trim() === '' ? NaN : Number(value.replace(',', '.')));

// Strict YYYY-MM-DD that also exists on the calendar (rejects 2026-02-31),
// checked against the local-time Date so no UTC shift is involved.
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

function Chips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MovimientoFormScreen() {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const existing = route.params?.transaction;
  const isEditing = !!existing;

  const [tipo, setTipo] = useState<TransactionType>(existing?.tipo ?? 'gasto');
  const [concepto, setConcepto] = useState(existing?.concepto ?? '');
  const [monto, setMonto] = useState(existing ? String(Number(existing.monto)) : '');
  const [categoria, setCategoria] = useState(existing?.categoria ?? '');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>(existing?.metodoPago ?? 'efectivo');
  const [nombreTarjeta, setNombreTarjeta] = useState(existing?.nombreTarjeta ?? '');
  const [fecha, setFecha] = useState(existing?.fecha ? existing.fecha.split('T')[0] : todayLocalISO());
  const [notas, setNotas] = useState(existing?.notas ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const isExpense = tipo === 'gasto';

  const saveMut = useMutation({
    mutationFn: (data: TransactionPayload) =>
      isEditing ? transactionsService.update(existing!.id, data) : transactionsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
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
    const amount = toNumber(monto);

    if (!concepto.trim()) next.concepto = 'Ingresa el concepto.';
    if (isNaN(amount) || amount <= 0) next.monto = 'El monto debe ser mayor a cero.';
    if (isExpense && !categoria) next.categoria = 'Selecciona una categoría.';
    if (!isValidDateOnly(fecha.trim())) next.fecha = 'Ingresa una fecha válida (AAAA-MM-DD).';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    saveMut.mutate({
      tipo,
      concepto: concepto.trim(),
      categoria: isExpense ? categoria : '',
      monto: amount,
      metodoPago,
      nombreTarjeta: metodoPago === 'tarjeta' ? nombreTarjeta.trim() : '',
      fecha: fecha.trim(),
      notas: notas.trim(),
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen edges={['bottom']}>
        <Reveal index={0}>
          <Card style={styles.form}>
            <View>
              <Text style={styles.label}>Tipo</Text>
              <Chips
                options={TIPO_OPTIONS}
                value={tipo}
                onChange={(value) => {
                  setTipo(value);
                  setCategoria('');
                }}
                disabled={isPending}
              />
            </View>

            <TextField
              label="Concepto"
              accessibilityLabel="Concepto"
              icon="create-outline"
              value={concepto}
              onChangeText={setConcepto}
              placeholder="Descripción de la transacción"
              error={errors.concepto}
              editable={!isPending}
              returnKeyType="next"
            />

            <TextField
              label="Monto"
              accessibilityLabel="Monto"
              icon="cash-outline"
              value={monto}
              onChangeText={setMonto}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.monto}
              editable={!isPending}
            />

            {isExpense && (
              <View>
                <Text style={styles.label}>Categoría</Text>
                <Chips
                  options={CATEGORIES.map((value) => ({ value, label: value }))}
                  value={categoria}
                  onChange={setCategoria}
                  disabled={isPending}
                />
                {!!errors.categoria && <Text style={styles.errorText}>{errors.categoria}</Text>}
              </View>
            )}

            <View>
              <Text style={styles.label}>Método de pago</Text>
              <Chips
                options={METODO_OPTIONS}
                value={metodoPago}
                onChange={(value) => {
                  setMetodoPago(value);
                  setNombreTarjeta('');
                }}
                disabled={isPending}
              />
            </View>

            {metodoPago === 'tarjeta' && (
              <TextField
                label="Nombre de la tarjeta"
                accessibilityLabel="Nombre de la tarjeta"
                icon="card-outline"
                value={nombreTarjeta}
                onChangeText={setNombreTarjeta}
                placeholder="Ej: Visa Santander"
                editable={!isPending}
              />
            )}

            <TextField
              label="Fecha"
              accessibilityLabel="Fecha"
              icon="calendar-outline"
              value={fecha}
              onChangeText={setFecha}
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.fecha}
              editable={!isPending}
            />

            <TextField
              label="Notas (opcional)"
              accessibilityLabel="Notas (opcional)"
              icon="document-text-outline"
              value={notas}
              onChangeText={setNotas}
              placeholder="Detalles adicionales"
              multiline
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
                label={isEditing ? 'Guardar cambios' : 'Registrar movimiento'}
                icon="checkmark-outline"
                onPress={handleSubmit}
                loading={saveMut.isPending}
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
