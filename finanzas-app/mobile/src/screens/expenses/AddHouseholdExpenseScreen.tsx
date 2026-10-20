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
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { householdExpensesService } from '../../services/household-expenses.service';
import {
  HouseholdExpense,
  HouseholdExpensesMonth,
  TransactionCategory,
  TRANSACTION_CATEGORIES,
} from '../../types';
import { GastosStackParamList } from '../../navigation/types';
import { currentMonthLocal, todayLocalISO } from '../../utils/dates';
import { resolveCurrency } from '../../utils/currency';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Button, Card, Reveal, Screen, TextField } from '../../components/ui';

type RouteT = RouteProp<GastosStackParamList, 'AddHouseholdExpense'>;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    form: { gap: 16 },
    fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, color: c.onSurfaceVariant, marginBottom: 8, letterSpacing: 0.3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    chipText: { fontFamily: fonts.semibold, color: c.onSurfaceVariant, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 12 },
  });

export default function AddHouseholdExpenseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
  const monthStr = existingExpense?.mes ?? currentMonthLocal();

  // The month query already carries this house's currency picker options
  // (monedaLocal/monedas) — mobile has no direct houseId to call
  // /houses/:houseId/currencies, see design.md "Currency options on mobile".
  const { data: monthData } = useQuery<HouseholdExpensesMonth>({
    queryKey: ['household-expenses', monthStr],
    queryFn: () => householdExpensesService.getMonth(monthStr),
  });
  const monedaLocal = monthData?.monedaLocal ?? '';
  const monedas = monthData?.monedas ?? [];

  const [descripcion, setDescripcion] = useState(existingExpense?.descripcion ?? '');
  const [monto, setMonto] = useState(
    existingExpense ? String(existingExpense.monto ?? existingExpense.montoCUP) : '',
  );
  const [moneda, setMoneda] = useState(existingExpense?.moneda ?? '');
  const [categoria, setCategoria] = useState<TransactionCategory>(existingExpense?.categoria ?? 'Otros');
  const [lugar, setLugar] = useState(existingExpense?.lugar ?? '');
  const [fecha] = useState(existingExpense?.fecha ?? todayLocalISO());

  // The picked currency wins; until the user picks one, the house's local
  // currency applies (resolved once the month data loads).
  const effectiveMoneda = resolveCurrency(moneda, monedaLocal);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['household-expenses'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      householdExpensesService.create({
        fecha,
        descripcion: descripcion.trim(),
        categoria,
        monto: parseFloat(monto.replace(',', '.')),
        moneda: effectiveMoneda,
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
        monto: parseFloat(monto.replace(',', '.')),
        moneda: effectiveMoneda,
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
    if (!effectiveMoneda) {
      Alert.alert('Moneda no disponible', 'Espera a que cargue la moneda de la casa.');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Falta la descripción', 'Ingresa una descripción del gasto.');
      return;
    }
    const parsedMonto = parseFloat(monto.replace(',', '.'));
    if (!monto || isNaN(parsedMonto) || parsedMonto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }

    if (isEditing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  };

  const isDisabled = isPending || !effectiveMoneda;
  const currencyCodes = monedas.length > 0 ? monedas.map((m) => m.code) : monedaLocal ? [monedaLocal] : [];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen edges={['bottom']} contentStyle={{ padding: 20 }}>
        <Reveal index={0}>
          <Card style={styles.form}>
            <TextField
              label="Descripción"
              icon="document-text-outline"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Ej: Cena afuera, Uber..."
              editable={!isPending}
              returnKeyType="next"
            />

            <TextField
              label="Monto"
              icon="cash-outline"
              value={monto}
              onChangeText={setMonto}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!isPending}
              returnKeyType="next"
            />

            <View>
              <Text style={styles.fieldLabel}>Moneda</Text>
              <View style={styles.chipRow}>
                {currencyCodes.map((code) => {
                  const active = effectiveMoneda === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      style={[styles.chip, active && { backgroundColor: colors.infoTint, borderColor: colors.brand }]}
                      onPress={() => setMoneda(code)}
                      disabled={isPending}
                    >
                      <Text style={[styles.chipText, active && { color: colors.primary }]}>{code}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Lugar (opcional)"
              icon="location-outline"
              value={lugar}
              onChangeText={setLugar}
              placeholder="Ej: Restaurante X"
              editable={!isPending}
            />

            <View>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <View style={styles.chipRow}>
                {TRANSACTION_CATEGORIES.map((c) => {
                  const active = categoria === c;
                  const color = Colors.categories[c] ?? colors.brand;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, active && { backgroundColor: color + '26', borderColor: color }]}
                      onPress={() => setCategoria(c)}
                    >
                      <Text style={[styles.chipText, active && { color: colors.onSurface }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>
        </Reveal>

        <Reveal index={1} style={styles.actions}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={isPending}
            style={{ flex: 1 }}
          />
          <Button
            label={isEditing ? 'Guardar cambios' : 'Registrar gasto'}
            icon="checkmark-outline"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isDisabled}
            style={{ flex: 2 }}
          />
        </Reveal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
