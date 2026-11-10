import React, { useRef, useMemo } from 'react';
import { useScreenPolling } from '../../hooks/useScreenPolling';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesService } from '../../services/purchases.service';
import { householdExpensesService } from '../../services/household-expenses.service';
import { PurchaseItem, CreatePurchaseItemDto, HouseholdExpensesMonth } from '../../types';
import { formatMoney, formatCurrencyTotals } from '../../utils/currency';
import { GastosStackParamList } from '../../navigation/types';
import { useManualRefresh } from '../../hooks/useManualRefresh';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import ChipSelector from '../budget/ChipSelector';
import { Button, Card, EmptyState, ErrorState, ProgressBar, Reveal, Screen, Skeleton, TextField } from '../../components/ui';

type Nav = NativeStackNavigationProp<GastosStackParamList>;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    summary: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    summaryText: { flex: 1, gap: 2 },
    totalLabel: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    totalAmount: { fontFamily: fonts.title, color: c.onSurface, fontSize: 26, letterSpacing: -0.6 },
    budgetCard: { gap: 8 },
    budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    budgetLabel: { fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 13 },
    budgetValue: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15, flexShrink: 1 },
    budgetHint: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    itemCount: { fontFamily: fonts.regular, color: c.outline, fontSize: 12 },
    listContent: { padding: 16, paddingBottom: 24, gap: 12 },
    storeGroup: { overflow: 'hidden' },
    storeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.surfaceContainer,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    storeTitle: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 13 },
    storeTotal: { fontFamily: fonts.title, color: c.primary, fontSize: 13, flexShrink: 1, textAlign: 'right' },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 8,
    },
    itemRowEditing: { backgroundColor: c.infoTint },
    itemInfo: { flex: 1, gap: 2 },
    itemName: { fontFamily: fonts.medium, color: c.onSurface, fontSize: 14 },
    itemDetail: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    itemSubtotal: { fontFamily: fonts.title, color: c.onSurface, fontSize: 13 },
    removeBtn: { padding: 2 },
    inputBar: {
      backgroundColor: c.panel,
      borderTopWidth: 1,
      borderTopColor: c.border,
      padding: 12,
      gap: 8,
    },
    editingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.infoTint,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editingBannerText: { fontFamily: fonts.semibold, color: c.primary, fontSize: 12 },
    inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  });

function SkeletonBlocks() {
  return (
    <View testID="shopping-skeleton" style={{ gap: 14, padding: 16 }}>
      <Skeleton height={84} radius={radius.lg} />
      <Skeleton height={150} radius={radius.lg} />
      <Skeleton height={110} radius={radius.lg} />
    </View>
  );
}

// Los ítems agregados acá se registran directamente en la lista de compras
// del mes (`purchases` module). Ese mismo dato alimenta automáticamente la
// sección "Compras de Mercado" de Registro de Gastos — no hace falta un paso
// adicional de "registrar como gasto".
export default function ShoppingListScreen() {
  const pollInterval = useScreenPolling();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const { ref: layoutRef, inset: keyboardInset } = useKeyboardInset();

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const listsQKey = ['purchaseLists'];

  const {
    data: lists = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: listsQKey,
    refetchInterval: pollInterval,
    queryFn: () => purchasesService.getLists(),
    staleTime: 0,
    retry: 1,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const selectedList = useMemo(
    () => lists.find((l) => l.name === monthStr) ?? null,
    [lists, monthStr],
  );
  const items: PurchaseItem[] = selectedList?.items ?? [];

  // The house's local currency comes from the month's household-expenses data
  // (same query/key the expense screens use); the list's own code is a fallback.
  const { data: monthData } = useQuery<HouseholdExpensesMonth>({
    queryKey: ['household-expenses', monthStr],
    refetchInterval: pollInterval,
    queryFn: () => householdExpensesService.getMonth(monthStr),
  });
  const monedaLocal = monthData?.monedaLocal ?? selectedList?.localCurrencyCode ?? '';
  const fmt = (amount: number, currency?: string | null) =>
    formatMoney(amount, currency || monedaLocal);

  // Estado del formulario de entrada rápida — se reusa tanto para agregar
  // como para editar (editingItemId != null cambia el modo del formulario).
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [inputProducto, setInputProducto] = React.useState('');
  const [inputCantidad, setInputCantidad] = React.useState('1');
  const [inputPrecio, setInputPrecio] = React.useState('');
  const [inputTienda, setInputTienda] = React.useState('');
  const [inputMoneda, setInputMoneda] = React.useState('');
  const monedaItem = inputMoneda || monedaLocal;
  // House currencies, plus whatever the items already use, so the picker never depends on a single source.
  const monedaCodes = Array.from(
    new Set([monedaLocal, ...(monthData?.monedas ?? []).map((m) => m.code), ...items.map((i) => i.currency)].filter(Boolean) as string[]),
  );
  const monedaOptions = monedaCodes.map((code) => ({ value: code, label: code }));

  const precioRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const tiendaRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Items can be in different currencies and mobile has no rates: show
  // per-currency subtotals rather than one mislabeled total.
  const totalText = formatCurrencyTotals(items, monedaLocal);

  const addItemMut = useMutation({
    mutationFn: async (dto: CreatePurchaseItemDto) => {
      const listId = selectedList
        ? selectedList.id
        : (await purchasesService.createList({ name: monthStr })).id;
      return purchasesService.addItem(listId, dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listsQKey });
      setInputProducto('');
      setInputCantidad('1');
      setInputPrecio('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al agregar el producto';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: string) => purchasesService.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listsQKey });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'No se pudo eliminar');
    },
  });

  const updateItemMut = useMutation({
    mutationFn: (vars: { id: string; dto: Partial<CreatePurchaseItemDto> }) =>
      purchasesService.updateItem(vars.id, vars.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listsQKey });
      setEditingItemId(null);
      setInputProducto('');
      setInputCantidad('1');
      setInputPrecio('');
      setInputTienda('');
      setInputMoneda('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar los cambios';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleStartEdit = (item: PurchaseItem) => {
    setEditingItemId(item.id);
    setInputProducto(item.name);
    setInputCantidad(String(item.quantity));
    setInputPrecio(String(item.unitPrice));
    setInputTienda(item.lugar ?? '');
    setInputMoneda(item.currency ?? '');
  };

  const handleCancelEdit = () => {
    setInputMoneda('');
    setEditingItemId(null);
    setInputProducto('');
    setInputCantidad('1');
    setInputPrecio('');
    setInputTienda('');
  };

  const handleAddItem = () => {
    const producto = inputProducto.trim();
    if (!producto) {
      Alert.alert('Falta el producto', 'Ingresa el nombre del producto.');
      return;
    }
    const precio = parseFloat(inputPrecio.replace(',', '.'));
    if (!inputPrecio || isNaN(precio) || precio <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio mayor a cero.');
      return;
    }
    const cantidad = parseInt(inputCantidad, 10) || 1;

    if (editingItemId) {
      updateItemMut.mutate({
        id: editingItemId,
        dto: {
          name: producto,
          quantity: cantidad,
          unitPrice: precio,
          ...(monedaItem ? { currency: monedaItem } : {}),
          lugar: inputTienda.trim() || undefined,
        },
      });
      return;
    }

    addItemMut.mutate({
      name: producto,
      quantity: cantidad,
      unitPrice: precio,
      currency: monedaItem || undefined,
      lugar: inputTienda.trim() || undefined,
    });
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert('Eliminar producto', '¿Eliminar este producto de la lista?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteItemMut.mutate(id) },
    ]);
  };

  // Agrupar ítems por lugar (misma convención que el backend usa para
  // calcular "Compras de Mercado" en Registro de Gastos)
  const grouped = items.reduce<Record<string, PurchaseItem[]>>((acc, item) => {
    const key = item.lugar?.trim() || 'Sin especificar';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Screen scroll={false} edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError && lists.length === 0) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <Card>
          <ErrorState
            message="No se pudo cargar la lista de compras. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  // The budget is owned by the Budget module ("Presupuesto compra" in Comida); read-only here.
  const monthBudget = Number(selectedList?.summary?.budget ?? selectedList?.budget ?? 0);
  const monthTotal = Number(selectedList?.summary?.total ?? 0);
  const monthRemaining = Number(selectedList?.summary?.remaining ?? monthBudget - monthTotal);
  const missingRates = selectedList?.summary?.missingRates ?? [];
  const budgetRatio = monthBudget > 0 ? Math.min(1, monthTotal / monthBudget) : 0;

  const saving = addItemMut.isPending || updateItemMut.isPending;
  // TextField forwards unknown props to its TextInput; React 19 passes `ref` as a prop.
  const refProps = (ref: React.RefObject<React.ComponentRef<typeof TextInput> | null>) => ({ ref } as object);

  return (
    // The tab bar already covers the bottom safe area, so no bottom edge here (it left a gap under the form).
    <Screen scroll={false} edges={[]}>
      <View ref={layoutRef} style={styles.flex}>
        <View style={[styles.flex, { paddingBottom: keyboardInset }]}>
        {/* Lista de ítems agrupados por lugar */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        >
          {/* Header con total y botón ver gastos */}
          <Reveal index={0}>
            <Card style={styles.summary} accent={colors.brand}>
              <View style={styles.summaryText}>
                <Text style={styles.totalLabel}>Total de la compra</Text>
                <Text style={styles.totalAmount} numberOfLines={2} adjustsFontSizeToFit>{totalText}</Text>
                <Text style={styles.itemCount}>{items.length} ítem{items.length !== 1 ? 's' : ''}</Text>
              </View>
              <Button
                label="Ver gastos"
                icon="bar-chart-outline"
                variant="secondary"
                small
                onPress={() => navigation.navigate('ExpenseRegistry')}
              />
            </Card>
          </Reveal>

          <Card style={styles.budgetCard}>
            {monthBudget > 0 ? (
              <>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Presupuesto</Text>
                  <Text style={styles.budgetValue} numberOfLines={1}>{fmt(monthBudget)}</Text>
                </View>
                <ProgressBar value={budgetRatio} tone={monthRemaining < 0 ? 'danger' : 'info'} height={6} />
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Restante</Text>
                  <Text style={styles.budgetValue} numberOfLines={1}>{fmt(monthRemaining)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.budgetHint}>Define «Presupuesto compra» en Presupuesto → Comida.</Text>
            )}
            {missingRates.length > 0 && (
              <Text style={styles.budgetHint}>
                Sin tasa de cambio para {missingRates.join(', ')}: esos productos no se suman al total.
              </Text>
            )}
          </Card>
          {Object.keys(grouped).length === 0 ? (
            <Card>
              <EmptyState
                icon="cart-outline"
                title="Lista vacía"
                subtitle="Agrega ítems usando el formulario de abajo"
              />
            </Card>
          ) : (
            Object.entries(grouped).map(([lugar, storeItems], index) => {
              const storeTotText = formatCurrencyTotals(storeItems, monedaLocal);
              return (
                <Reveal key={lugar} index={index + 1}>
                  <Card padded={false} style={styles.storeGroup}>
                    <View style={styles.storeHeader}>
                      <Ionicons name="storefront-outline" size={15} color={colors.onSurfaceVariant} />
                      <Text style={styles.storeTitle}>{lugar}</Text>
                      <Text style={styles.storeTotal}>{storeTotText}</Text>
                    </View>
                    {storeItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemRow, editingItemId === item.id && styles.itemRowEditing]}
                        activeOpacity={0.7}
                        onPress={() => handleStartEdit(item)}
                      >
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemDetail}>
                            {item.quantity} × {fmt(item.unitPrice, item.currency)}
                          </Text>
                        </View>
                        <Text style={styles.itemSubtotal}>
                          {fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0), item.currency)}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleRemoveItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Eliminar producto"
                        >
                          <Ionicons name="close-circle" size={20} color={colors.outline} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </Card>
                </Reveal>
              );
            })
          )}
        </ScrollView>

        {/* Barra de entrada rápida — cambia a modo edición al tocar un ítem */}
        <View style={styles.inputBar}>
          {editingItemId && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingBannerText}>Editando producto</Text>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Cancelar edición">
                <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          )}
          {monedaOptions.length > 1 && (
            <ChipSelector label="Moneda" options={monedaOptions} value={monedaItem} onChange={setInputMoneda} disabled={saving} />
          )}
          <View style={styles.inputRow}>
            <TextField
              containerStyle={{ flex: 2 }}
              value={inputProducto}
              onChangeText={setInputProducto}
              placeholder="Producto"
              returnKeyType="next"
              onSubmitEditing={() => precioRef.current?.focus()}
            />
            <TextField
              containerStyle={{ flex: 0.8 }}
              value={inputCantidad}
              onChangeText={setInputCantidad}
              placeholder="Cant."
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextField
              containerStyle={{ flex: 1.1 }}
              {...refProps(precioRef)}
              value={inputPrecio}
              onChangeText={setInputPrecio}
              placeholder={monedaItem ? `Precio ${monedaItem}` : 'Precio'}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => tiendaRef.current?.focus()}
            />
          </View>
          <View style={styles.inputRow}>
            <TextField
              containerStyle={{ flex: 1 }}
              {...refProps(tiendaRef)}
              value={inputTienda}
              onChangeText={setInputTienda}
              placeholder="Tienda / lugar"
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
            />
            <Button
              label={editingItemId ? 'Guardar' : 'Agregar'}
              icon={editingItemId ? 'checkmark' : 'add'}
              onPress={handleAddItem}
              loading={saving}
            />
          </View>
        </View>
        </View>
      </View>
    </Screen>
  );
}
