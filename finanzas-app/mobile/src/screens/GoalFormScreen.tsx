import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsService, SavingsGoalPayload } from '../services/savings.service';
import { SavingsGoal } from '../types';
import { MetasStackParamList } from '../navigation/types';
import { useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../components/ui';

type RouteT = RouteProp<MetasStackParamList, 'GoalForm'>;

const EMOJI_OPTIONS = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰', '🏋️', '🎸'];

interface FormErrors {
  nombre?: string;
  montoMeta?: string;
  ahorrosActuales?: string;
  mesesParaAhorrarla?: string;
  tasaInteres?: string;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
    label: { fontFamily: fonts.semibold, fontSize: 12, color: c.onSurfaceVariant, marginBottom: 6, letterSpacing: 0.3 },
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    emojiBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    emojiBtnActive: { borderColor: c.brand, backgroundColor: c.panel },
    emoji: { fontSize: 22 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancel: { flex: 1 },
    save: { flex: 2 },
  });

const toNumber = (value: string): number => (value.trim() === '' ? NaN : Number(value.replace(',', '.')));

export default function GoalFormScreen() {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const goalId = route.params?.goalId;
  const isEditing = !!goalId;
  const existing = isEditing
    ? qc.getQueryData<SavingsGoal[]>(['savings-goals'])?.find((g) => g.id === goalId)
    : undefined;

  const [nombre, setNombre] = useState(existing?.nombre ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [montoMeta, setMontoMeta] = useState(existing ? String(existing.montoMeta) : '');
  const [ahorrosActuales, setAhorrosActuales] = useState(existing ? String(existing.ahorrosActuales) : '');
  const [meses, setMeses] = useState(existing ? String(existing.mesesParaAhorrarla) : '');
  const [tasa, setTasa] = useState(existing?.tasaInteres ? String(existing.tasaInteres) : '');
  const [errors, setErrors] = useState<FormErrors>({});

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['savings-goals'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };

  const onError = (err: any) => {
    const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
    Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
  };

  const onSuccess = () => {
    invalidate();
    navigation.goBack();
  };

  const saveMut = useMutation({
    mutationFn: (data: SavingsGoalPayload) =>
      isEditing ? savingsService.update(goalId!, data) : savingsService.create(data),
    onSuccess,
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: () => savingsService.remove(goalId!),
    onSuccess,
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo eliminar la meta';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isPending = saveMut.isPending || deleteMut.isPending;

  const handleSubmit = () => {
    const next: FormErrors = {};
    const meta = toNumber(montoMeta);
    const ahorros = ahorrosActuales.trim() === '' ? 0 : toNumber(ahorrosActuales);
    const plazo = toNumber(meses);
    const tasaValue = tasa.trim() === '' ? 0 : toNumber(tasa);

    if (!nombre.trim()) next.nombre = 'Ingresa el nombre de la meta.';
    if (isNaN(meta) || meta <= 0) next.montoMeta = 'El monto meta debe ser mayor a cero.';
    if (isNaN(ahorros) || ahorros < 0) next.ahorrosActuales = 'Los ahorros actuales no pueden ser negativos.';
    if (isNaN(plazo) || !Number.isInteger(plazo) || plazo < 1) {
      next.mesesParaAhorrarla = 'Los meses deben ser un entero mayor o igual a 1.';
    }
    if (isNaN(tasaValue) || tasaValue < 0 || tasaValue > 100) {
      next.tasaInteres = 'La tasa de interés anual debe estar entre 0 y 100 (%)';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    saveMut.mutate({
      nombre: nombre.trim(),
      emoji,
      montoMeta: meta,
      ahorrosActuales: ahorros,
      mesesParaAhorrarla: plazo,
      tasaInteres: tasaValue,
    });
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar meta', `¿Eliminar "${nombre.trim() || existing?.nombre}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMut.mutate() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen edges={['bottom']}>
        <Reveal index={0}>
          <Card style={styles.form}>
            <TextField
              label="Nombre"
              accessibilityLabel="Nombre"
              icon="trophy-outline"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Viaje a Europa"
              error={errors.nombre}
              editable={!isPending}
              returnKeyType="next"
            />

            <View>
              <Text style={styles.label}>Emoji</Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map((option) => {
                  const active = emoji === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.emojiBtn, active && styles.emojiBtnActive]}
                      onPress={() => setEmoji(option)}
                      disabled={isPending}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={styles.emoji}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Monto meta"
              accessibilityLabel="Monto meta"
              icon="flag-outline"
              value={montoMeta}
              onChangeText={setMontoMeta}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.montoMeta}
              editable={!isPending}
            />
            <TextField
              label="Ahorros actuales"
              accessibilityLabel="Ahorros actuales"
              icon="cash-outline"
              value={ahorrosActuales}
              onChangeText={setAhorrosActuales}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.ahorrosActuales}
              editable={!isPending}
            />
            <TextField
              label="Meses para ahorrarla"
              accessibilityLabel="Meses para ahorrarla"
              icon="calendar-outline"
              value={meses}
              onChangeText={setMeses}
              placeholder="12"
              keyboardType="number-pad"
              error={errors.mesesParaAhorrarla}
              editable={!isPending}
            />
            <TextField
              label="Tasa de interés anual % (opcional)"
              accessibilityLabel="Tasa de interés anual % (opcional)"
              icon="trending-up-outline"
              value={tasa}
              onChangeText={setTasa}
              placeholder="0"
              keyboardType="decimal-pad"
              error={errors.tasaInteres}
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
                label={isEditing ? 'Guardar cambios' : 'Crear meta'}
                icon="checkmark-outline"
                onPress={handleSubmit}
                loading={saveMut.isPending}
                disabled={isPending}
                style={styles.save}
              />
            </View>

            {isEditing && (
              <Button
                label="Eliminar meta"
                icon="trash-outline"
                variant="danger"
                onPress={confirmDelete}
                loading={deleteMut.isPending}
                disabled={isPending}
              />
            )}
          </Card>
        </Reveal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
