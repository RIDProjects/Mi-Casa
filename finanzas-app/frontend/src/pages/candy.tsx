import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/auth.store';
import { purchasesAPI } from '../services/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, BarChart3 } from 'lucide-react';

/**
 * Formats a number as currency in Spanish locale
 * @param n - Number to format
 * @returns Formatted string with 2 decimal places
 */
const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

/**
 * Month options for the selector dropdown
 */
const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const currentYear = new Date().getFullYear();

/**
 * Generates the list name for candy purchases (prefixed with 'chuches-')
 * @param month - Month in YYYY-MM format
 * @returns List name string (e.g., 'chuches-2024-01')
 */
const getListName = (month: string) => `chuches-${month}`;

export default function CandyPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('purchases', 'create');
  const canEdit = hasPermission('purchases', 'edit');
  const canDelete = hasPermission('purchases', 'delete');

  // ==================== STATE ====================
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonth}`);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  /**
   * Form state for adding/editing items
   * Nota: unitPrice es el precio en CUP (pesos cubanos)
   */
  const [itemForm, setItemForm] = useState({ 
    name: '', 
    quantity: 1, 
    unitPrice: 0,
    planCUP: 0
  });
  
  /**
   * Form state for budget configuration (used when no list exists yet)
   */
  const [configForm, setConfigForm] = useState({
    budgetUSD: 0,
    exchangeRate: 515
  });

  // ==================== QUERIES & MUTATIONS ====================
  /**
   * Fetches all purchase lists from the API
   */
  const { data: lists = [], isLoading } = useQuery('purchaseLists', () => 
    purchasesAPI.getLists().then(r => r.data)
  );

  const listName = getListName(selectedMonth);
  
  /**
   * Finds the selected month's candy list from all lists
   */
  const selectedList = lists.find((l: any) => l.name === listName) || null;
  const items = selectedList?.items || [];

  /**
   * Creates a new purchase list
   */
  const createListMut = useMutation((d: any) => purchasesAPI.createList(d), {
    onSuccess: () => { 
      qc.invalidateQueries('purchaseLists'); 
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message || e?.message || 'Error'); },
  });

  /**
   * Updates an existing list (budget/exchange rate)
   */
  const updateListMut = useMutation(({ id, d }: { id: string; d: any }) => 
    purchasesAPI.updateList(id, d), {
    onSuccess: () => { 
      toast.success('Configuración actualizada'); 
      qc.invalidateQueries('purchaseLists'); 
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message || e?.message || 'Error'); },
  });

  /**
   * Deletes an item from a list
   */
  const deleteItemMut = useMutation((id: string) => purchasesAPI.deleteItem(id), {
    onSuccess: () => { toast.success('Producto eliminado'); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || e?.message || 'Error'); },
  });

  /**
   * Adds a new item to an existing list
   */
  const addItemMut = useMutation(({ listId, d }: { listId: string; d: any }) => 
    purchasesAPI.addItem(listId, d), {
    onSuccess: () => { toast.success('Producto agregado'); setShowItemModal(false); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || e?.message || 'Error'); },
  });

  /**
   * Updates an existing item
   */
  const updateItemMut = useMutation(({ id, d }: { id: string; d: any }) => 
    purchasesAPI.updateItem(id, d), {
    onSuccess: () => { toast.success('Producto actualizado'); setShowItemModal(false); qc.invalidateQueries('purchaseLists'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || e?.message || 'Error'); },
  });

  // ==================== CALCULATED VALUES ====================
  /**
   * Gets exchange rate from selected list or defaults to form config
   */
  const exchangeRate = selectedList?.exchangeRate || configForm.exchangeRate;
  
  /**
   * Gets budget in USD from selected list or defaults to form config
   */
  const budgetUSD = selectedList?.budgetUSD || configForm.budgetUSD;
  
  /**
   * Converts budget to CUP using current exchange rate
   * @returns Budget amount in Cuban Pesos
   */
  const budgetCUP = budgetUSD * exchangeRate;

  /**
   * Calculates total spent in CUP by summing all items (quantity * unitPrice)
   * unitPrice es el precio en CUP
   * @returns Total expenditure in CUP
   */
  const totalRealCUP = items.reduce((sum: number, i: any) => {
    const total = Number(i.quantity || 0) * Number(i.unitPrice || 0);
    return sum + total;
  }, 0);
  
  /**
   * Converts total spent to USD for display
   * @returns Total expenditure in USD
   */
  const totalRealUSD = Math.ceil(totalRealCUP / exchangeRate);
  
  /**
   * Remaining budget in USD (budget - spent)
   */
  const diferenciaUSD = budgetUSD - totalRealUSD;
  
  /**
   * Remaining budget in CUP (budget - spent)
   */
  const diferenciaCUP = budgetCUP - totalRealCUP;

  // ==================== HANDLERS ====================
  /**
   * Handles saving an item (create or update)
   * If no list exists, creates one first
   */
  const handleSaveItem = () => {
    if (!itemForm.name.trim()) { toast.error('Ingresa el nombre del producto'); return; }
    if (itemForm.unitPrice <= 0) { toast.error('Ingresa un precio válido'); return; }
    
    if (!selectedList) {
      createListMut.mutate({ 
        name: listName, 
        budgetUSD: configForm.budgetUSD || 0, 
        exchangeRate: configForm.exchangeRate || 515 
      });
      toast.success('Lista creada');
      setShowItemModal(false);
      return;
    }
    
    // El precio unitario es en CUP
    const dto = {
      name: itemForm.name,
      quantity: itemForm.quantity,
      unitPrice: itemForm.unitPrice, // Precio en CUP
      plannedPriceCUP: itemForm.planCUP || 0, // Presupuesto planificado
      realPriceCUP: Number(itemForm.quantity) * Number(itemForm.unitPrice),
      realPriceUSD: Math.ceil(Number(itemForm.quantity) * Number(itemForm.unitPrice) / exchangeRate),
    };
    
    if (editItem) {
      updateItemMut.mutate({ id: editItem.id, d: dto });
    } else {
      addItemMut.mutate({ listId: selectedList.id, d: dto });
    }
  };

  /**
   * Saves budget configuration
   * Creates new list if none exists, otherwise updates existing
   */
  const handleSaveConfig = () => {
    if (!selectedList) {
      createListMut.mutate({ 
        name: listName, 
        budgetUSD: configForm.budgetUSD, 
        exchangeRate: configForm.exchangeRate 
      });
    } else {
      updateListMut.mutate({ 
        id: selectedList.id, 
        d: { 
          name: listName, 
          budgetUSD: configForm.budgetUSD, 
          exchangeRate: configForm.exchangeRate 
        } 
      });
    }
  };

  /**
   * Opens edit modal with item data pre-filled
   * @param item - Item to edit
   */
  const handleEditItem = (item: any) => {
    setItemForm({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      planCUP: item.planCUP || 0
    });
    setEditItem(item);
    setShowItemModal(true);
  };

  /**
   * Deletes an item after confirmation
   * @param itemId - ID of item to delete
   */
  const handleDeleteItem = (itemId: string) => {
    if (confirm('¿Eliminar este producto?')) {
      deleteItemMut.mutate(itemId);
    }
  };

  /**
   * Parses selected month to get label for display
   */
  const [year, month] = selectedMonth.split('-');
  const monthLabel = MONTHS.find(m => m.value === month)?.label || '';
  const fullMonthLabel = `${monthLabel} ${year}`;

  // ==================== RENDER ====================
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🍬 Chuches</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gastos en golosinas y snacks</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => { 
              setItemForm({ name: '', quantity: 1, unitPrice: 0 }); 
              setEditItem(null); 
              setShowItemModal(true); 
            }} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Agregar producto
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mes:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input w-auto"
        >
          {MONTHS.map((m) => (
            <option key={`${currentYear}-${m.value}`} value={`${currentYear}-${m.value}`}>
              {m.label} {currentYear}
            </option>
          ))}
          {[currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={`${y}-${month}`}>
              {monthLabel} {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🍬 Chuches - {fullMonthLabel}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">🧾 Producto</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📦 Cant.</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💲 Unit. CUP</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💰 Total USD</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💵 Total CUP</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📝 Plan CUP</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📝 Plan USD</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📊 Diferencia</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item: any) => {
                  // unitPrice es el precio en CUP
                  const totalCUP = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                  const totalUSD = Math.ceil(totalCUP / exchangeRate);
                  const planCUP = Number(item.planCUP || 0);
                  const planUSD = planCUP > 0 ? Math.ceil(planCUP / exchangeRate) : 0;
                  const diferencia = planCUP > 0 ? planCUP - totalCUP : null;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">${fmt(item.unitPrice)}</td>
                      <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">${fmt(totalUSD)}</td>
                      <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">${fmt(totalCUP)}</td>
                      <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">{planCUP > 0 ? `$${fmt(planCUP)}` : '—'}</td>
                      <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">{planUSD > 0 ? `$${fmt(planUSD)}` : '—'}</td>
                      <td className={`px-2 py-2 text-right font-medium ${diferencia !== null ? (diferencia >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                        {diferencia !== null ? (diferencia >= 0 ? '+' : '') + '$' + fmt(Math.abs(diferencia)) : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-700 p-1">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-700 p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                          {!canEdit && !canDelete && <span className="text-xs text-gray-400">Solo vista</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-gray-400 dark:text-gray-500">
                      Sin productos. Agrega productos abajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <BarChart3 size={18} /> Auxiliares
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 mb-2">
                💵 Presupuesto CUP
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${fmt(budgetCUP)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ingreso</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${diferenciaCUP >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diferenciaCUP >= 0 ? '+' : ''}${fmt(Math.abs(diferenciaCUP))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Restante</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 mb-2">
                💲 Presupuesto USD
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${fmt(budgetUSD)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ingreso</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${diferenciaUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diferenciaUSD >= 0 ? '+' : ''}${fmt(Math.abs(diferenciaUSD))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Restante</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col pt-2 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 mb-2">
                ⚙️ Configuración
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${fmt(configForm.budgetUSD)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ingreso USD</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(configForm.exchangeRate)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasa CUP</p>
                </div>
              </div>
              <div className="mt-3">
                <button 
                  onClick={() => setShowConfigModal(true)}
                  className="btn-secondary w-full text-sm"
                >
                  ✏️ Editar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editItem ? 'Editar producto' : 'Agregar producto'}</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre del producto</label>
                <input 
                  className="input" 
                  value={itemForm.name} 
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })} 
                  placeholder="Chicle, Chocolate, Papas..." 
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cantidad</label>
                  <input 
                    className="input" 
                    type="number" 
                    min="1" 
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
                    step="0.01"
                    value={itemForm.unitPrice} 
                    onChange={e => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} 
                  />
                </div>
              </div>
              <div>
                <label className="label">Plan CUP (presupuesto)</label>
                <input 
                  className="input" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={itemForm.planCUP} 
                  onChange={e => setItemForm({ ...itemForm, planCUP: Number(e.target.value) })} 
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowItemModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveItem} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">⚙️ Configuración</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Ingreso USD</label>
                <input 
                  className="input" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={configForm.budgetUSD} 
                  onChange={e => setConfigForm({ ...configForm, budgetUSD: Number(e.target.value) })} 
                />
              </div>
              <div>
                <label className="label">Tasa CUP por USD</label>
                <input 
                  className="input" 
                  type="number" 
                  min="1"
                  value={configForm.exchangeRate} 
                  onChange={e => setConfigForm({ ...configForm, exchangeRate: Number(e.target.value) })} 
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Presupuesto en CUP: <span className="font-bold">${fmt(configForm.budgetUSD * configForm.exchangeRate)}</span>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowConfigModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { handleSaveConfig(); setShowConfigModal(false); }} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
