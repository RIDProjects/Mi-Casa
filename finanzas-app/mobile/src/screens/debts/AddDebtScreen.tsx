import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { debtsService } from '../../services/debts.service';
import { CreateDebtDto, Debt, DebtType } from '../../types';
import { DebtsStackParamList } from '../../navigation/types';

type RouteT = RouteProp<DebtsStackParamList, 'AddDebt'>;

const TYPES: { value: DebtType; label: string; icon: string }[] = [
  { value: 'they_owe_me', label: 'ME DEBEN', icon: '💙' },
  { value: 'i_owe', label: 'LES DEBO', icon: '❤️' },
];

export default function AddDebtScreen() {
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
      Alert.alert('Falta el nombre', 'Ingresá el nombre de la persona.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.');
      return;
    }

    const payload = {
      personName: personName.trim(),
      amount: parsedAmount,
      note: note.trim() || undefined,
      type: debtType,
    };

    if (isEditing) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const isTheyOweMe = debtType === 'they_owe_me';
  const accentColor = isTheyOweMe ? Colors.blue : Colors.red;
  const accentBg = isTheyOweMe ? Colors.blueBg : Colors.redBg;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toggle de tipo */}
        <View style={styles.typeToggle}>
          {TYPES.map(({ value, label, icon }) => {
            const active = debtType === value;
            const color = value === 'they_owe_me' ? Colors.blue : Colors.red;
            const bg = value === 'they_owe_me' ? Colors.blueBg : Colors.redBg;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.typeBtn,
                  active && { backgroundColor: bg, borderColor: color },
                ]}
                onPress={() => setDebtType(value)}
                activeOpacity={0.8}
              >
                <Text style={styles.typeIcon}>{icon}</Text>
                <Text style={[styles.typeLabel, active && { color }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resumen de lo que significa */}
        <View style={[styles.hint, { backgroundColor: accentBg, borderColor: accentColor }]}>
          <Text style={[styles.hintText, { color: accentColor }]}>
            {isTheyOweMe
              ? 'Alguien te debe dinero a vos'
              : 'Vos le debés dinero a alguien'}
          </Text>
        </View>

        {/* Campos */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre de la persona</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={personName}
              onChangeText={setPersonName}
              placeholder="Ej: Juan, Papá, Empresa X..."
              placeholderTextColor={Colors.textMuted}
              editable={!isPending}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Monto</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="cash-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              editable={!isPending}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nota (opcional)</Text>
          <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={note}
              onChangeText={setNote}
              placeholder="Descripción adicional..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              editable={!isPending}
            />
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={isPending}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accentColor }, isPending && styles.disabled]}
            onPress={handleSubmit}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Registrar deuda'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  typeIcon: {
    fontSize: 18,
  },
  typeLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
