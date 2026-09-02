import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/auth.store';
import { purchasesAPI } from '../services/api';
import { useCurrencyStore } from '../store/currency.store';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, ShoppingCart, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

import { fmt, MONTH_NAMES } from '../lib/format';

const defaultItemForm = { name: '', quantity: 1, unitPrice: 0, currency: '', lugar: '' };
const defaultConfigForm = { budget: 0 };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { currencies, rates } = useCurrencyStore();
  const baseCurrency = currencies.find(c => c.isBase);
  const canCreate = hasPermission('purchases', 'create');
  const canDelete = hasPermission('purchases', 'delete');

  const now = new Date();
  const [year, setYear]                       = useState(now.getFullYear());
  const [month, setMonth]                     = useState(now.getMonth() + 1);
  const [showItemModal, setShowItemModal]     = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editItem, setEditItem]               = useState<any>(null);
  const [itemForm, setItemForm]               = useState<any>(defaultItemForm);
  const [configForm, setConfigForm]           = useState(defaultConfigForm);
  const [deleteItemId, setDeleteItemId]       = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data: lists = [], isLoading, isError, refetch } = useQuery(
    'purchaseLists',
    () => purchasesAPI.getLists().then(r => r.data),
  );

  const selectedList = (lists as any[]).find((l: any) => l.name === monthStr) ?? null;
  const items: any[] = selectedList?.items ?? [];
  const budget = selectedList?.budget ?? configForm.budget;

  const toBase = (amount: number, currencyCode: string | null | undefined): number => {
    if (!currencyCode || currencyCode === baseCurrency?.currencyCode) return amount;
    const rate = rates[currencyCode];
    return rate ? amount * rate : amount;
  };

  const totalInBase = items.reduce((s, i) => {
    return s + toBase(Number(i.quantity || 0) * Number(i.unitPrice || 0), i.currency);
  }, 0);

  const remaining = budget > 0 ? budget - totalInBase : null;

  const porLugar = (() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const l = i.lugar?.trim() || 'Sin especificar';
      map[l] = (map[l] ?? 0) + toBase(Number(i.quantity || 0) * Number(i.unitPrice || 0), i.currency);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([lugar, total]) => ({
        lugar,
        total,
        pct: totalInBase > 0 ? Math.round((total / totalInBase) * 1000) / 10 : 0,
      }));
  })();

  const createListMut = useMutation((d: any) => purchasesAPI.createList(d), {
    onSuccess: () => qc.invalidateQueries('purchaseLists'),
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });
  const updateListMut = useMutation(({ id, d }: any) => purchasesAPI.updateList(id, d), {
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });
  const addItemMut = useMutation(({ listId, d }: any) => purchasesAPI.addItem(listId, d), {
    onSuccess: () => { toast.success('Producto agregado'); setShowItemModal(false); setItemForm(defaultItemForm); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });
  const updateItemMut = useMutation(({ id, d }: any) => purchasesAPI.updateItem(id, d), {
    onSuccess: () => { toast.success('Producto actualizado'); setShowItemModal(false); setEditItem(null); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });
  const deleteItemMut = useMutation((id: string) => purchasesAPI.deleteItem(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteItemId(null); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleOpenAdd = () => {
    setItemForm({ ...defaultItemForm, currency: baseCurrency?.currencyCode ?? '' });
    setEditItem(null);
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim())   { toast.error('Ingresá el nombre del producto'); return; }
    if (itemForm.unitPrice <= 0) { toast.error('Ingresá un precio válido'); return; }

    if (!selectedList) {
      createListMut.mutate({
        name: monthStr,
        budget: configForm.budget,
        baseCurrencyCode: baseCurrency?.currencyCode ?? null,
      });
      toast('Lista del mes creada. Agregá tu producto.');
      setShowItemModal(false);
      return;
    }

    const dto = {
      name:      itemForm.name,
      quantity:  itemForm.quantity,
      unitPrice: itemForm.unitPrice,
      currency:  itemForm.currency || baseCurrency?.currencyCode || null,
      lugar:     itemForm.lugar || null,
    };

    if (editItem) {
      updateItemMut.mutate({ id: editItem.id, d: dto });
    } else {
      addItemMut.mutate({ listId: selectedList.id, d: dto });
    }
  };

  const handleEditItem = (item: any) => {
    setItemForm({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      currency: item.currency || baseCurrency?.currencyCode || '',
      lugar: item.lugar || '',
    });
    setEditItem(item);
    setShowItemModal(true);
  };

  const handleSaveConfig = () => {
    const payload = { budget: configForm.budget, baseCurrencyCode: baseCurrency?.currencyCode ?? null };
    if (!selectedList) {
      createListMut.mutate({ name: monthStr, ...payload });
    } else {
      updateListMut.mutate({ id: selectedList.id, d: payload });
    }
    setShowConfigModal(false);
  };

  const getCurrencySymbol = (code: string | null | undefined): string => {
    if (!code) return baseCurrency?.symbol ?? '$';
    return currencies.find(c => c.currencyCode === code)?.symbol ?? code;
  };

  const baseSymbol = baseCurrency?.symbol ?? '$';

  if (isLoading) return (
    <Layout>
      <div className="space-y-4">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    </Layout>
  );

  if (isError) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={40} className="text-danger" />
        <p className="text-on-surface-variant">Error al cargar la lista</p>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface flex items-center gap-2">
            <ShoppingCart size={24} /> Lista de la Compra
          </h1>
          <p className="text-on-surface-variant mt-1">Control de compras del mercado por mes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setConfigForm({ budget: selectedList?.budget ?? 0 }); setShowConfigModal(true); }}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings size={16} /> Configurar mes
          </button>
          {canCreate && (
            <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Agregar producto
            </button>
          )}
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-variant transition-colors">
          <ChevronLeft size={20} className="text-on-surface-variant" />
        </button>
        <span className="text-lg font-semibold text-on-surface min-w-[180px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-variant transition-colors">
          <ChevronRight size={20} className="text-on-surface-variant" />
        </button>
      </div>

      {!selectedList && (
        <div className="text-center py-16 mb-4">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-on-surface">Sin lista para este mes</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            No hay lista de compras creada para {MONTH_NAMES[month - 1]} {year}
          </p>
          {canCreate && (
            <button onClick={handleOpenAdd} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
              Agregar producto
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main table */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface">
              {MONTH_NAMES[month - 1]} {year} — {items.length} producto{items.length !== 1 ? 's' : ''}
            </h2>
            {totalInBase > 0 && (
              <span className="text-sm font-bold text-on-surface">
                Total: {baseSymbol}{fmt(totalInBase)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low font-label-upper text-label-upper text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">Precio Unit.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Lugar</th>
                  <th className="px-3 py-2 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-outline text-xs">
                      Sin productos este mes — usá el botón &quot;Agregar producto&quot;
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                    const sym = getCurrencySymbol(item.currency);
                    const baseTotalLine = toBase(lineTotal, item.currency);
                    const showConverted = item.currency && item.currency !== baseCurrency?.currencyCode;
                    return (
                      <tr key={item.id} className="hover:bg-surface-gray">
                        <td className="px-3 py-2 font-medium text-on-surface">{item.name}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">
                          {sym}{fmt(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">
                          <div>{sym}{fmt(lineTotal)}</div>
                          {showConverted && (
                            <div className="text-[10px] text-outline font-normal">≈ {baseSymbol}{fmt(baseTotalLine)}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-on-surface-variant text-xs">{item.lugar || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleEditItem(item)} className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Edit2 size={13} />
                            </button>
                            {canDelete && (
                              <button onClick={() => setDeleteItemId(item.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-surface-container-low border-t border-outline-variant">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-on-surface-variant">TOTAL</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-on-surface">
                      {baseSymbol}{fmt(totalInBase)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Por lugar */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
              <h2 className="text-sm font-semibold text-on-surface">📍 Total por lugar</h2>
            </div>
            <div className="p-4">
              {porLugar.length === 0 ? (
                <p className="text-xs text-outline text-center py-4">Sin datos todavía</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex font-label-upper text-label-upper text-on-surface-variant pb-1 border-b border-outline-variant">
                    <span className="flex-1">Lugar</span>
                    <span className="w-28 text-right">Total</span>
                    <span className="w-12 text-right">%</span>
                  </div>
                  {porLugar.map(({ lugar, total, pct }) => (
                    <div key={lugar} className="flex items-center text-sm">
                      <span className="flex-1 text-on-surface-variant truncate text-xs">{lugar}</span>
                      <span className="w-28 text-right font-medium text-on-surface text-xs">{baseSymbol}{fmt(total)}</span>
                      <span className="w-12 text-right text-outline text-xs">{pct}%</span>
                    </div>
                  ))}
                  <div className="flex items-center text-sm font-bold border-t border-outline-variant pt-2 mt-1">
                    <span className="flex-1 text-on-surface text-xs">TOTAL</span>
                    <span className="w-28 text-right text-on-surface text-xs">{baseSymbol}{fmt(totalInBase)}</span>
                    <span className="w-12 text-right text-outline text-xs">100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Presupuesto */}
          {budget > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-4 space-y-3">
              <h3 className="text-sm font-semibold text-on-surface">💰 Presupuesto del mes</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-on-surface-variant">Asignado</p>
                  <p className="text-sm font-bold text-on-surface">{baseSymbol}{fmt(budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Gastado</p>
                  <p className="text-sm font-bold text-on-surface">{baseSymbol}{fmt(totalInBase)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Restante</p>
                  <p className={`text-sm font-bold ${remaining !== null && remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                    {remaining !== null ? `${remaining >= 0 ? '+' : ''}${baseSymbol}${fmt(remaining)}` : '—'}
                  </p>
                </div>
              </div>
              {budget > 0 && totalInBase > 0 && (
                <div className="w-full bg-surface-container rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${totalInBase / budget > 1 ? 'bg-red-500' : totalInBase / budget > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((totalInBase / budget) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: agregar / editar producto */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-on-surface">
              {editItem ? 'Editar producto' : 'Agregar producto'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre del producto</label>
                <input
                  className="input"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Arroz, Leche, Carne..."
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cantidad</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemForm.quantity}
                    onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <select
                    className="input"
                    value={itemForm.currency || baseCurrency?.currencyCode || ''}
                    onChange={e => setItemForm({ ...itemForm, currency: e.target.value })}
                  >
                    {currencies.filter(c => c.isActive).map(c => (
                      <option key={c.currencyCode} value={c.currencyCode}>
                        {c.symbol} {c.currencyCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">
                  Precio unitario ({getCurrencySymbol(itemForm.currency || baseCurrency?.currencyCode)})
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.unitPrice}
                  onChange={e => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Total</label>
                <div className="input bg-surface-container-low text-on-surface font-semibold">
                  {getCurrencySymbol(itemForm.currency || baseCurrency?.currencyCode)}{fmt(Number(itemForm.quantity) * Number(itemForm.unitPrice))}
                  {itemForm.currency && itemForm.currency !== baseCurrency?.currencyCode && (
                    <span className="ml-2 text-xs text-outline font-normal">
                      ≈ {baseSymbol}{fmt(toBase(Number(itemForm.quantity) * Number(itemForm.unitPrice), itemForm.currency))}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Dónde se compró <span className="text-outline font-normal">(opcional)</span></label>
                <input
                  className="input"
                  value={itemForm.lugar}
                  onChange={e => setItemForm({ ...itemForm, lugar: e.target.value })}
                  placeholder="Supermercado, Feria, Mercado..."
                  list="lugares-list"
                />
                <datalist id="lugares-list">
                  {Array.from(new Set(items.map((i: any) => i.lugar).filter(Boolean))).map((l: string) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowItemModal(false); setEditItem(null); }} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveItem} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => deleteItemMut.mutate(deleteItemId!)}
        title="¿Eliminar producto?"
        message="Se eliminará este producto de la lista. Esta acción no se puede deshacer."
        loading={deleteItemMut.isLoading}
      />

      {/* Modal: configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-on-surface">⚙️ Configuración del mes</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Presupuesto ({baseCurrency?.symbol ?? '$'}{baseCurrency?.currencyCode ?? ''})</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={configForm.budget}
                  onChange={e => setConfigForm({ budget: Number(e.target.value) })}
                  placeholder="0 = sin límite"
                />
                <p className="text-xs text-outline mt-1">Los precios en otras monedas se convierten automáticamente usando las tasas configuradas.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowConfigModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveConfig} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
