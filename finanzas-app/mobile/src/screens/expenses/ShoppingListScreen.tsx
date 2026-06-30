import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { transactionsService } from '../../services/transactions.service';
import {
  ShoppingItem,
  TransactionCategory,
  PaymentMethod,
  TRANSACTION_CATEGORIES,
} from '../../types';
import { GastosStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<GastosStackParamList>;

let _nextId = 1;
const genId = () => String(_nextId++);

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
  { value: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { value: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
];

export default function ShoppingListScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  // Estado de la lista local
  const [items, setItems] = useState<ShoppingItem[]>([]);

  // Estado del formulario de entrada rápida
  const [inputProducto, setInputProducto] = useState('');
  const [inputCantidad, setInputCantidad] = useState('1');
  const [inputPrecio, setInputPrecio] = useState('');
  const [inputTienda, setInputTienda] = useState('');

  // Estado para el modal de registro
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regConcepto, setRegConcepto] = useState('Compra del mercado');
  const [regCategoria, setRegCategoria] = useState<TransactionCategory>('Comida');
  const [regMetodo, setRegMetodo] = useState<PaymentMethod>('efectivo');

  const precioRef = useRef<TextInput>(null);
  const tiendaRef = useRef<TextInput>(null);

  const total = items.reduce((s, i) => s + i.cantidad * i.precioCUP, 0);

  const handleAddItem = useCallback(() => {
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

    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        producto,
        cantidad,
        precioCUP: precio,
        tienda: inputTienda.trim() || 'Sin tienda',
      },
    ]);

    // Limpiar inputs (conservar tienda para agrupar)
    setInputProducto('');
    setInputCantidad('1');
    setInputPrecio('');
  }, [inputProducto, inputCantidad, inputPrecio, inputTienda]);

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Agrupar ítems por tienda
  const grouped = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.tienda;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const registerMut = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return transactionsService.create({
        tipo: 'gasto',
        concepto: regConcepto.trim() || 'Compra del mercado',
        categoria: regCategoria,
        monto: total,
        metodoPago: regMetodo,
        fecha: today,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      Alert.alert(
        'Registrado',
        `Gasto de ${fmt(total)} CUP registrado correctamente.`,
        [
          {
            text: 'Ver gastos',
            onPress: () => {
              setItems([]);
              setShowRegisterForm(false);
              navigation.navigate('ExpenseRegistry');
            },
          },
          {
            text: 'Nueva lista',
            onPress: () => {
              setItems([]);
              setShowRegisterForm(false);
            },
          },
        ],
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al registrar';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

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
            <Text style={styles.totalAmount}>{fmt(total)} CUP</Text>
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

        {/* Lista de ítems agrupados por tienda */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
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
            Object.entries(grouped).map(([tienda, storeItems]) => {
              const storeTot = storeItems.reduce((s, i) => s + i.cantidad * i.precioCUP, 0);
              return (
                <View key={tienda} style={styles.storeGroup}>
                  <View style={styles.storeHeader}>
                    <Ionicons name="storefront-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.storeTitle}>{tienda}</Text>
                    <Text style={styles.storeTotal}>{fmt(storeTot)} CUP</Text>
                  </View>
                  {storeItems.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.producto}</Text>
                        <Text style={styles.itemDetail}>
                          {item.cantidad} × {fmt(item.precioCUP)} CUP
                        </Text>
                      </View>
                      <Text style={styles.itemSubtotal}>
                        {fmt(item.cantidad * item.precioCUP)} CUP
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveItem(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })
          )}

          {/* Formulario de registro como gasto (se muestra solo cuando hay ítems) */}
          {items.length > 0 && (
            <View style={styles.registerSection}>
              {!showRegisterForm ? (
                <TouchableOpacity
                  style={styles.registerTriggerBtn}
                  onPress={() => setShowRegisterForm(true)}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.green} />
                  <Text style={styles.registerTriggerText}>Registrar como gasto ({fmt(total)} CUP)</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.registerForm}>
                  <Text style={styles.registerTitle}>Registrar gasto</Text>

                  {/* Concepto */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Concepto</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={regConcepto}
                      onChangeText={setRegConcepto}
                      placeholder="Ej: Compra semanal"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Categoría */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Categoría</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.chipRow}>
                        {TRANSACTION_CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.chip,
                              regCategoria === cat && styles.chipActive,
                            ]}
                            onPress={() => setRegCategoria(cat)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                regCategoria === cat && styles.chipTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Método de pago */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Método de pago</Text>
                    <View style={styles.methodRow}>
                      {PAYMENT_METHODS.map(({ value, label, icon }) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.methodBtn,
                            regMetodo === value && styles.methodBtnActive,
                          ]}
                          onPress={() => setRegMetodo(value)}
                        >
                          <Ionicons
                            name={icon as any}
                            size={16}
                            color={regMetodo === value ? Colors.blue : Colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.methodLabel,
                              regMetodo === value && { color: Colors.blue },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Botones */}
                  <View style={styles.regActions}>
                    <TouchableOpacity
                      style={styles.regCancelBtn}
                      onPress={() => setShowRegisterForm(false)}
                    >
                      <Text style={styles.regCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.regSaveBtn, registerMut.isPending && { opacity: 0.6 }]}
                      onPress={() => registerMut.mutate()}
                      disabled={registerMut.isPending}
                    >
                      {registerMut.isPending ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.regSaveText}>Registrar {fmt(total)} CUP</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Barra de entrada rápida */}
        <View style={styles.inputBar}>
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
              style={styles.addItemBtn}
              onPress={handleAddItem}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={styles.addItemText}>Agregar</Text>
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
  registerSection: {
    marginTop: 8,
  },
  registerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.greenBg,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  registerTriggerText: {
    color: Colors.green,
    fontSize: 15,
    fontWeight: '700',
  },
  registerForm: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  registerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: Colors.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.blueBg,
    borderColor: Colors.blue,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.blue,
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodBtnActive: {
    backgroundColor: Colors.blueBg,
    borderColor: Colors.blue,
  },
  methodLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  regActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  regCancelBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  regSaveBtn: {
    flex: 2,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.green,
  },
  regSaveText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
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
