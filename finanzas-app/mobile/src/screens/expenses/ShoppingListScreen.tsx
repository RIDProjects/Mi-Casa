import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { purchasesService } from '../../services/purchases.service';
import { PurchaseItem, CreatePurchaseItemDto } from '../../types';
import { formatMoney } from '../../utils/currency';
import { GastosStackParamList } from '../../navigation/types';
import { useManualRefresh } from '../../hooks/useManualRefresh';

type Nav = NativeStackNavigationProp<GastosStackParamList>;

const fmt = (amount: number) => formatMoney(amount, 'CUP');

// Los ítems agregados acá se registran directamente en la lista de compras
// del mes (`purchases` module). Ese mismo dato alimenta automáticamente la
// sección "Compras de Mercado" de Registro de Gastos — no hace falta un paso
// adicional de "registrar como gasto".
export default function ShoppingListScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const listsQKey = ['purchaseLists'];

  const {
    data: lists = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: listsQKey,
    queryFn: () => purchasesService.getLists(),
    staleTime: 0,
  });
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const selectedList = useMemo(
    () => lists.find((l) => l.name === monthStr) ?? null,
    [lists, monthStr],
  );
  const items: PurchaseItem[] = selectedList?.items ?? [];

  // Estado del formulario de entrada rápida — se reusa tanto para agregar
  // como para editar (editingItemId != null cambia el modo del formulario).
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [inputProducto, setInputProducto] = React.useState('');
  const [inputCantidad, setInputCantidad] = React.useState('1');
  const [inputPrecio, setInputPrecio] = React.useState('');
  const [inputTienda, setInputTienda] = React.useState('');

  const precioRef = useRef<TextInput>(null);
  const tiendaRef = useRef<TextInput>(null);

  const total = items.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0,
  );

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
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setInputProducto('');
    setInputCantidad('1');
    setInputPrecio('');
    setInputTienda('');
  };

  const handleAddItem = () => {
    const producto = inputProducto.trim();
    if (!producto) {
      Alert.alert('Falta el producto', 'Ingresá el nombre del producto.');
      return;
    }
    const precio = parseFloat(inputPrecio.replace(',', '.'));
    if (!inputPrecio || isNaN(precio) || precio <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un precio mayor a cero.');
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
          lugar: inputTienda.trim() || undefined,
        },
      });
      return;
    }

    addItemMut.mutate({
      name: producto,
      quantity: cantidad,
      unitPrice: precio,
      currency: 'CUP',
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
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.emptyList}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header con total y botón ver gastos */}
        <View style={styles.header}>
          <View>
            <Text style={styles.totalLabel}>Total de la compra</Text>
            <Text style={styles.totalAmount}>{fmt(total)}</Text>
            <Text style={styles.itemCount}>{items.length} ítem{items.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('ExpenseRegistry')}
            >
              <Ionicons name="bar-chart-outline" size={20} color={Colors.blue} />
              <Text style={styles.headerBtnText}>Ver gastos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de ítems agrupados por lugar */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.blue}
              colors={[Colors.blue]}
            />
          }
        >
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyList}>
              <Ionicons name="cart-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Lista vacía</Text>
              <Text style={styles.emptySubtitle}>
                Agregá ítems usando el formulario de abajo
              </Text>
            </View>
          ) : (
            Object.entries(grouped).map(([lugar, storeItems]) => {
              const storeTot = storeItems.reduce(
                (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
                0,
              );
              return (
                <View key={lugar} style={styles.storeGroup}>
                  <View style={styles.storeHeader}>
                    <Ionicons name="storefront-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.storeTitle}>{lugar}</Text>
                    <Text style={styles.storeTotal}>{fmt(storeTot)}</Text>
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
                          {item.quantity} × {fmt(item.unitPrice)}
                        </Text>
                      </View>
                      <Text style={styles.itemSubtotal}>
                        {fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveItem(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Barra de entrada rápida — cambia a modo edición al tocar un ítem */}
        <View style={styles.inputBar}>
          {editingItemId && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingBannerText}>Editando producto</Text>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBarTop}>
            <TextInput
              style={[styles.quickInput, { flex: 2 }]}
              value={inputProducto}
              onChangeText={setInputProducto}
              placeholder="Producto"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => precioRef.current?.focus()}
            />
            <TextInput
              style={[styles.quickInput, { flex: 0.8 }]}
              value={inputCantidad}
              onChangeText={setInputCantidad}
              placeholder="Cant."
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextInput
              ref={precioRef}
              style={[styles.quickInput, { flex: 1 }]}
              value={inputPrecio}
              onChangeText={setInputPrecio}
              placeholder="Precio CUP"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => tiendaRef.current?.focus()}
            />
          </View>
          <View style={styles.inputBarBottom}>
            <TextInput
              ref={tiendaRef}
              style={[styles.quickInput, { flex: 1 }]}
              value={inputTienda}
              onChangeText={setInputTienda}
              placeholder="Tienda / lugar"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
            />
            <TouchableOpacity
              style={[styles.addItemBtn, (addItemMut.isPending || updateItemMut.isPending) && { opacity: 0.6 }]}
              onPress={handleAddItem}
              activeOpacity={0.8}
              disabled={addItemMut.isPending || updateItemMut.isPending}
            >
              {(addItemMut.isPending || updateItemMut.isPending) ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name={editingItemId ? 'checkmark' : 'add'} size={22} color={Colors.white} />
                  <Text style={styles.addItemText}>{editingItemId ? 'Guardar' : 'Agregar'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  itemCount: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.blueBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  headerBtnText: {
    color: Colors.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  storeGroup: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.cardAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  storeTotal: {
    color: Colors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '80',
    gap: 8,
  },
  itemRowEditing: {
    backgroundColor: Colors.blueBg,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.blueBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editingBannerText: {
    color: Colors.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  itemDetail: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  itemSubtotal: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 2,
  },
  // Barra de entrada rápida
  inputBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  inputBarTop: {
    flexDirection: 'row',
    gap: 8,
  },
  inputBarBottom: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickInput: {
    backgroundColor: Colors.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 42,
  },
  addItemText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
