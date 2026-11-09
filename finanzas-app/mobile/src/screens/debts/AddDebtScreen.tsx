import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsService } from '../../services/debts.service';
import { CreateDebtDto, Debt, DebtPriority, DebtType } from '../../types';
import { DebtsStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius, toneInk, toneTint } from '../../theme/tokens';
import type { ThemeColors, Tone } from '../../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../../components/ui';

type RouteT = RouteProp<DebtsStackParamList, 'AddDebt'>;

const TYPES: { value: DebtType; label: string; icon: string; tone: Tone }[] = [
  { value: 'they_owe_me', label: 'ME DEBEN', icon: '💙', tone: 'info' },
  { value: 'i_owe', label: 'LES DEBO', icon: '❤️', tone: 'danger' },
];

const PRIORITIES: { value: DebtPriority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
    typeToggle: { flexDirection: 'row', gap: 10 },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    typeIcon: { fontSize: 18 },
    priorityBlock: { gap: 8 },
    priorityLabel: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 13 },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityChip: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    priorityChipText: { fontFamily: fonts.semibold, color: c.onSurfaceVariant, fontSize: 13 },
    priorityHint: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    typeLabel: { fontFamily: fonts.bold, color: c.onSurfaceVariant, fontSize: 13, letterSpacing: 0.5 },
    hint: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
    hintText: { fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancel: { flex: 1 },
    save: { flex: 2 },
  });

export default function AddDebtScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const debtId = route.params?.debtId;
  const isEditing = !!debtId;
  const existingDebt = isEditing
    ? qc.getQueryData<Debt[]>(['debts'])?.find((d) => d.id === debtId)
    : undefined;

  const [debtType, setDebtType] = useState<DebtType>(
    existingDebt?.type ?? route.params?.debtType ?? 'they_owe_me',
  );
  const [personName, setPersonName] = useState(existingDebt?.personName ?? '');
  const [amount, setAmount] = useState(existingDebt ? String(existingDebt.amount) : '');
  const [note, setNote] = useState(existingDebt?.note ?? '');
  const [priority, setPriority] = useState<DebtPriority>(existingDebt?.priority ?? 'media');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['debts'] });
    qc.invalidateQueries({ queryKey: ['debtsSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (data: CreateDebtDto) => debtsService.create(data),
    onSuccess: () => {
      invalidate();
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<CreateDebtDto>) => debtsService.update(debtId!, data),
    onSuccess: () => {
      invalidate();
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!personName.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre de la persona.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }

    const payload: CreateDebtDto = {
      personName: personName.trim(),
      amount: parsedAmount,
      note: note.trim() || undefined,
      type: debtType,
      // The priority only orders the debts I owe; what is owed to me never needs one.
      ...(debtType === 'i_owe' ? { priority } : {}),
    };

    if (isEditing) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const isTheyOweMe = debtType === 'they_owe_me';
  const accentTone: Tone = isTheyOweMe ? 'info' : 'danger';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen edges={['bottom']} underTabBar={false}>
        <Reveal index={0}>
          <Card style={styles.form}>
            {/* Toggle de tipo */}
            <View style={styles.typeToggle}>
              {TYPES.map(({ value, label, icon, tone }) => {
                const active = debtType === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.typeBtn,
                      active && { backgroundColor: toneTint(colors, tone), borderColor: toneInk(colors, tone) },
                    ]}
                    onPress={() => setDebtType(value)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.typeIcon}>{icon}</Text>
                    <Text style={[styles.typeLabel, active && { color: toneInk(colors, tone) }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Resumen de lo que significa */}
            <View style={[styles.hint, { backgroundColor: toneTint(colors, accentTone) }]}>
              <Text style={[styles.hintText, { color: toneInk(colors, accentTone) }]}>
                {isTheyOweMe
                  ? 'Alguien te debe dinero a ti'
                  : 'Tú le debes dinero a alguien'}
              </Text>
            </View>

            {/* Campos */}
            {debtType === 'i_owe' && (
              <View style={styles.priorityBlock}>
                <Text style={styles.priorityLabel}>Prioridad</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map(({ value, label }) => {
                    const active = priority === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.priorityChip, active && { backgroundColor: toneTint(colors, 'danger'), borderColor: toneInk(colors, 'danger') }]}
                        onPress={() => setPriority(value)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        disabled={isPending}
                      >
                        <Text style={[styles.priorityChipText, active && { color: toneInk(colors, 'danger') }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.priorityHint}>Las de prioridad alta se cubren primero con lo que te deben; las bajas se presupuestan para después.</Text>
              </View>
            )}

            <TextField
              label="Nombre de la persona"
              icon="person-outline"
              value={personName}
              onChangeText={setPersonName}
              placeholder="Ej: Juan, Papá, Empresa X..."
              editable={!isPending}
              returnKeyType="next"
            />
            <TextField
              label="Monto"
              icon="cash-outline"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!isPending}
              returnKeyType="next"
            />
            <TextField
              label="Nota (opcional)"
              icon="document-text-outline"
              value={note}
              onChangeText={setNote}
              placeholder="Descripción adicional..."
              multiline
              numberOfLines={3}
              editable={!isPending}
            />

            {/* Botones */}
            <View style={styles.actions}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={isPending}
                style={styles.cancel}
              />
              <Button
                label={isEditing ? 'Guardar cambios' : 'Registrar deuda'}
                icon="checkmark-outline"
                onPress={handleSubmit}
                loading={isPending}
                style={styles.save}
              />
            </View>
          </Card>
        </Reveal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
