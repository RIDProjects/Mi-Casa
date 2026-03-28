import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { inventoryAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';

const LOCATIONS = [
  { value: 'nevera', label: '🥶 Nevera' },
  { value: 'frio', label: '🧊 Frío' },
  { value: 'alacena', label: '🏪 Alacena' },
  { value: 'viandero', label: '🌽 Viandero' },
  { value: 'otro', label: '📦 Otro' },
];

const defaultForm = { name: '', quantity: 0, location: 'alacena', notes: '' };

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'ok') return <span className="badge-ok">✅ OK</span>;
  if (status === 'last') return <span className="badge-last">⚠️ Último</span>;
  return <span className="badge-out">❌ Sin stock</span>;
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('inventory', 'create');
  const canEdit = hasPermission('inventory', 'edit');
  const canDelete = hasPermission('inventory', 'delete');
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');

  const { data: dashboard, isLoading, error } = useQuery('inventoryDash', () => inventoryAPI.getDashboard().then(r => r.data));

  // Helper to extract error message safely
  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const createMut = useMutation((d: any) => inventoryAPI.create(d), {
    onSuccess: () => { toast.success('Producto creado'); setShowModal(false); setForm(defaultForm); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('inventoryDash'); },
  });
  const updateMut = useMutation((d: any) => inventoryAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Actualizado'); setEditItem(null); setShowModal(false); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('inventoryDash'); },
  });
  const deleteMut = useMutation((id: string) => inventoryAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteId(null); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('inventoryDash'); },
  });

  const handleEdit = (item: any) => {
    setForm({ name: item.name, quantity: item.quantity, location: item.location, notes: item.notes || '' });
    setEditItem(item);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Cargando inventario...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 dark:text-red-400">Error al cargar inventario. ¿Estás autenticado?</div>
        </div>
      </Layout>
    );
  }

  const items = dashboard?.items || [];

  const itemsByLocation = LOCATIONS.reduce((acc, loc) => {
    acc[loc.value] = items.filter((i: any) => i.location === loc.value);
    return acc;
  }, {} as Record<string, any[]>);

  const outOfStock = items.filter((i: any) => i.quantity === 0);

  const filtered = items.filter((item: any) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchLoc = filterLoc === 'all' || item.location === filterLoc;
    return matchSearch && matchLoc;
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📦 Inventario</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Control de productos y stock</p>
        </div>
        {canCreate ? (
          <button onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Agregar producto
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
            <Lock size={16} /> Sin permisos para agregar
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input 
          className="input w-64" 
          placeholder="🔍 Buscar producto..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <select className="input w-48" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
          <option value="all">📍 Todas las ubicaciones</option>
          {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      {filterLoc === 'all' && !search && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 border-b border-cyan-100 dark:border-cyan-800">
              <h3 className="font-semibold text-cyan-900 dark:text-cyan-300">🧊 Frío</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Producto</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(itemsByLocation['frio'] || []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.quantity <= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>{item.quantity}</td>
                  </tr>
                ))}
                {(!itemsByLocation['frio'] || itemsByLocation['frio'].length === 0) && (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 border-b border-blue-100 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">🥶 Nevera</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Producto</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(itemsByLocation['nevera'] || []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.quantity <= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>{item.quantity}</td>
                  </tr>
                ))}
                {(!itemsByLocation['nevera'] || itemsByLocation['nevera'].length === 0) && (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-green-50 dark:bg-green-900/30 px-4 py-2 border-b border-green-100 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-300">🌽 Viandero</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Producto</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(itemsByLocation['viandero'] || []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.quantity <= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>{item.quantity}</td>
                  </tr>
                ))}
                {(!itemsByLocation['viandero'] || itemsByLocation['viandero'].length === 0) && (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-orange-50 dark:bg-orange-900/30 px-4 py-2 border-b border-orange-100 dark:border-orange-800">
              <h3 className="font-semibold text-orange-900 dark:text-orange-300">🏪 Alacena</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Producto</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(itemsByLocation['alacena'] || []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className={`px-3 py-2 text-right font-medium ${item.quantity <= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>{item.quantity}</td>
                  </tr>
                ))}
                {(!itemsByLocation['alacena'] || itemsByLocation['alacena'].length === 0) && (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {outOfStock.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/30 px-4 py-2 border-b border-red-100 dark:border-red-800">
                <h3 className="font-semibold text-red-900 dark:text-red-300">🚫 Sin Stock ({outOfStock.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Producto</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {outOfStock.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.name}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-600 dark:text-red-400">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📋 Todos los Productos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">🧾 Producto</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📊 Cant.</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📍 Ubicación</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💡 Estado</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${item.quantity === 0 ? 'text-red-600 dark:text-red-400' : item.quantity === 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{LOCATIONS.find(l => l.value === item.location)?.label || item.location}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {canEdit && (
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"><Edit2 size={16} /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteId(item.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"><Trash2 size={16} /></button>
                    )}
                    {!canEdit && !canDelete && (
                      <span className="text-xs text-gray-400">Solo vista</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No se encontraron productos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Editar producto' : 'Agregar producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre del producto</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cantidad</label>
              <input type="number" min="0" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="label">Ubicación</label>
              <select className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          {form.quantity === 1 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ Cantidad = 1: Se enviará alerta por email a los usuarios.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading} />
    </Layout>
  );
}
