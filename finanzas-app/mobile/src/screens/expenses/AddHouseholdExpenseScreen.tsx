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
import { householdExpensesService } from '../../services/household-expenses.service';
import { HouseholdExpense, TransactionCategory, TRANSACTION_CATEGORIES } from '../../types';
import { GastosStackParamList } from '../../navigation/types';

type RouteT = RouteProp<GastosStackParamList, 'AddHouseholdExpense'>;

export default function AddHouseholdExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();

  const expenseId = route.params?.expenseId;
  const isEditing = !!expenseId;
  const existingExpense = isEditing
    ? qc.getQueriesData<{ salidas: HouseholdExpense[] }>({ queryKey: ['household-expenses'] })
        .flatMap(([, data]) => data?.salidas ?? [])
        .find((s) => s.id === expenseId)
    : undefined;

  const now = new Date();
  const monthStr = existingExpense?.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [descripcion, setDescripcion] = useState(existingExpense?.descripcion ?? '');
  const [monto, setMonto] = useState(existingExpense ? String(existingExpense.montoCUP) : '');
  const [categoria, setCategoria] = useState<TransactionCategory>(existingExpense?.categoria ?? 'Otros');
  const [lugar, setLugar] = useState(existingExpense?.lugar ?? '');
  const [fecha] = useState(existingExpense?.fecha ?? now.toISOString().split('T')[0]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['household-expenses'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      householdExpensesService.create({
        fecha,
        descripcion: descripcion.trim(),
        categoria,
        montoCUP: parseFloat(monto.replace(',', '.')),
        lugar: lugar.trim() || undefined,
        mes: monthStr,
      }),
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
    mutationFn: () =>
      householdExpensesService.update(expenseId!, {
        fecha,
        descripcion: descripcion.trim(),
        categoria,
        montoCUP: parseFloat(monto.replace(',', '.')),
        lugar: lugar.trim() || undefined,
        mes: monthStr,
      }),
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
    if (!descripcion.trim()) {
      Alert.alert('Falta la descripción', 'Ingresá una descripción del gasto.');
      return;
    }
    const parsedMonto = parseFloat(monto.replace(',', '.'));
    if (!monto || isNaN(parsedMonto) || parsedMonto <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.');
      return;
    }

    if (isEditing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descripción</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Ej: Cena afuera, Uber..."
              placeholderTextColor={Colors.textMuted}
              editable={!isPending}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Monto (CUP)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="cash-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={monto}
              onChangeText={setMonto}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              editable={!isPending}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Lugar (opcional)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={lugar}
              onChangeText={setLugar}
              placeholder="Ej: Restaurante X"
              placeholderTextColor={Colors.textMuted}
              editable={!isPending}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.catRow}>
            {TRANSACTION_CATEGORIES.map((c) => {
              const active = categoria === c;
              const color = Colors.categories[c] ?? Colors.blue;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.catChip,
                    active && { backgroundColor: color + '30', borderColor: color },
                  ]}
                  onPress={() => setCategoria(c)}
                >
                  <Text style={[styles.catChipText, active && { color }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={isPending}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isPending && styles.disabled]}
            onPress={handleSubmit}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Registrar gasto'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  fieldGroup: { gap: 6 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
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
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  cancelBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    backgroundColor: Colors.blue,
  },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
