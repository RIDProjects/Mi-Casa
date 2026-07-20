import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/auth.store';
import { purchasesAPI } from '../services/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, ShoppingCart, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const defaultForm = { name: '', quantity: 1, unitPrice: 0, lugar: '' };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('purchases', 'create');
  const canDelete = hasPermission('purchases', 'delete');

  const now = new Date();
  const [year, setYear]               = useState(now.getFullYear());
  const [month, setMonth]             = useState(now.getMonth() + 1);
  const [showItemModal, setShowItemModal]     = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editItem, setEditItem]       = useState<any>(null);
  const [itemForm, setItemForm]       = useState<any>(defaultForm);
  const [configForm, setConfigForm]   = useState({ budgetCUP: 0, exchangeRate: 515 });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data: lists = [], isLoading, isError, refetch } = useQuery(
    'purchaseLists',
    () => purchasesAPI.getLists().then(r => r.data),
  );

  const selectedList = (lists as any[]).find((l: any) => l.name === monthStr) ?? null;
  const items: any[] = selectedList?.items ?? [];
  const exchangeRate = selectedList?.exchangeRate ?? configForm.exchangeRate;
  const budgetCUP    = selectedList?.budgetCUP    ?? configForm.budgetCUP;

  // Totales
  const totalCUP = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const restante  = budgetCUP > 0 ? budgetCUP - totalCUP : null;

  // Resumen por lugar (como Excel columnas G-I)
  const porLugar = (() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const l = (i.lugar?.trim()) || 'Sin especificar';
      map[l] = (map[l] ?? 0) + Number(i.quantity || 0) * Number(i.unitPrice || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([lugar, total]) => ({
        lugar,
        total,
        pct: totalCUP > 0 ? Math.round((total / totalCUP) * 1000) / 10 : 0,
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
    onSuccess: () => { toast.success('Producto agregado'); setShowItemModal(false); setItemForm(defaultForm); qc.invalidateQueries('purchaseLists'); },
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

  const handleSaveItem = () => {
    if (!itemForm.name.trim())     { toast.error('Ingresá el nombre del producto'); return; }
    if (itemForm.unitPrice <= 0)   { toast.error('Ingresá un precio válido'); return; }

    const ensureList = () => {
      if (!selectedList) {
        createListMut.mutate({ name: monthStr, budgetCUP: configForm.budgetCUP, exchangeRate: configForm.exchangeRate });
        toast('Lista del mes creada. Agregá tu producto.');
        setShowItemModal(false);
        return false;
      }
      return true;
    };

    if (!ensureList()) return;

    const realCUP = Number(itemForm.quantity) * Number(itemForm.unitPrice);
    const dto = {
      name:         itemForm.name,
      quantity:     itemForm.quantity,
      unitPrice:    itemForm.unitPrice,
      lugar:        itemForm.lugar || null,
      realPriceCUP: realCUP,
      realPriceUSD: Math.ceil(realCUP / exchangeRate),
    };

    if (editItem) {
      updateItemMut.mutate({ id: editItem.id, d: dto });
    } else {
      addItemMut.mutate({ listId: selectedList.id, d: dto });
    }
  };

  const handleEditItem = (item: any) => {
    setItemForm({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice || 0, lugar: item.lugar || '' });
    setEditItem(item);
    setShowItemModal(true);
  };

  const handleSaveConfig = () => {
    if (!selectedList) {
      createListMut.mutate({ name: monthStr, budgetCUP: configForm.budgetCUP, exchangeRate: configForm.exchangeRate });
    } else {
      updateListMut.mutate({ id: selectedList.id, d: { budgetCUP: configForm.budgetCUP, exchangeRate: configForm.exchangeRate } });
    }
    setShowConfigModal(false);
  };

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
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-gray-500 dark:text-gray-400">Error al cargar la lista</p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart size={24} /> Lista de la Compra
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Control de compras del mercado por mes</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setItemForm(defaultForm); setEditItem(null); setShowItemModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Agregar producto
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {!selectedList && (
        <div className="text-center py-16 mb-4">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Sin lista para este mes</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            No hay lista de compras creada para {MONTH_NAMES[month - 1]} {year}
          </p>
          {canCreate && (
            <button
              onClick={() => { setItemForm(defaultForm); setEditItem(null); setShowItemModal(true); }}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              Agregar producto
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTH_NAMES[month - 1]} {year} — {items.length} producto{items.length !== 1 ? 's' : ''}
            </h2>
            {totalCUP > 0 && (
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Total: {fmt(totalCUP)} CUP
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">Precio Unit.</th>
                  <th className="px-3 py-2 text-right">Total CUP</th>
                  <th className="px-3 py-2 text-left">Lugar</th>
                  <th className="px-3 py-2 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
                      Sin productos este mes — usá el botón "Agregar producto"
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const realCUP = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmt(item.unitPrice)} CUP</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{fmt(realCUP)} CUP</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">{item.lugar || '—'}</td>
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
                <tfoot className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300">TOTAL</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-white">{fmt(totalCUP)} CUP</td>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">📍 Total por lugar</h2>
            </div>
            <div className="p-4">
              {porLugar.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Sin datos todavía</p>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase pb-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="flex-1">Lugar</span>
                    <span className="w-28 text-right">Total CUP</span>
                    <span className="w-12 text-right">%</span>
                  </div>
                  {porLugar.map(({ lugar, total, pct }) => (
                    <div key={lugar} className="flex items-center text-sm">
                      <span className="flex-1 text-gray-700 dark:text-gray-300 truncate text-xs">{lugar}</span>
                      <span className="w-28 text-right font-medium text-gray-900 dark:text-white text-xs">{fmt(total)}</span>
                      <span className="w-12 text-right text-gray-400 dark:text-gray-500 text-xs">{pct}%</span>
                    </div>
                  ))}
                  <div className="flex items-center text-sm font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
                    <span className="flex-1 text-gray-900 dark:text-white text-xs">TOTAL</span>
                    <span className="w-28 text-right text-gray-900 dark:text-white text-xs">{fmt(totalCUP)}</span>
                    <span className="w-12 text-right text-gray-400 dark:text-gray-500 text-xs">100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Presupuesto */}
          {budgetCUP > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">💰 Presupuesto</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Asignado</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(budgetCUP)}</p>
                  <p className="text-[10px] text-gray-400">CUP</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gastado</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(totalCUP)}</p>
                  <p className="text-[10px] text-gray-400">CUP</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Restante</p>
                  <p className={`text-sm font-bold ${restante !== null && restante >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {restante !== null ? `${restante >= 0 ? '+' : ''}${fmt(restante)}` : '—'}
                  </p>
                  <p className="text-[10px] text-gray-400">CUP</p>
                </div>
              </div>
              {budgetCUP > 0 && totalCUP > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${totalCUP / budgetCUP > 1 ? 'bg-red-500' : totalCUP / budgetCUP > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((totalCUP / budgetCUP) * 100, 100)}%` }}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
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
                  <label className="label">Precio Unit. CUP</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={itemForm.unitPrice}
                    onChange={e => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Total CUP</label>
                <div className="input bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold">
                  {fmt(Number(itemForm.quantity) * Number(itemForm.unitPrice))}
                </div>
              </div>
              <div>
                <label className="label">Dónde se compró <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  className="input"
                  value={itemForm.lugar}
                  onChange={e => setItemForm({ ...itemForm, lugar: e.target.value })}
                  placeholder="Agro, Feria, Mercado..."
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">⚙️ Configuración del mes</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Presupuesto CUP</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={configForm.budgetCUP}
                  onChange={e => setConfigForm({ ...configForm, budgetCUP: Number(e.target.value) })}
                  placeholder="0 = sin límite"
                />
              </div>
              <div>
                <label className="label">Tasa de cambio (CUP por USD)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={configForm.exchangeRate}
                  onChange={e => setConfigForm({ ...configForm, exchangeRate: Number(e.target.value) })}
                />
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
