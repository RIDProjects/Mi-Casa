import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { inventoryAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatCard from '../components/ui/StatCard';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: dashboard, isLoading, error } = useQuery('inventoryDash', () => inventoryAPI.getDashboard().then(r => r.data));

  const createMut = useMutation((d: any) => inventoryAPI.create(d), {
    onSuccess: () => { toast.success('Producto creado'); setShowModal(false); setForm(defaultForm); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('inventoryDash'); },
  });
  const updateMut = useMutation((d: any) => inventoryAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Actualizado'); setEditItem(null); setShowModal(false); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('inventoryDash'); },
  });
  const deleteMut = useMutation((id: string) => inventoryAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteId(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
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
          <div className="text-gray-500">Cargando inventario...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error al cargar inventario. ¿Estás autenticado?</div>
        </div>
      </Layout>
    );
  }

  const items = dashboard?.items || [];
  const stats = dashboard?.stats || { total: 0, ok: 0, last: 0, outOfStock: 0 };
  const filtered = items.filter((item: any) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchLoc = filterLoc === 'all' || item.location === filterLoc;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchLoc && matchStatus;
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Inventario</h1>
          <p className="text-gray-500 mt-1">Control de productos y stock</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18}/> Agregar producto
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total productos" value={stats.total} icon={<Package size={20}/>} color="blue" />
          <StatCard title="✅ OK" value={stats.ok} color="green" />
          <StatCard title="⚠️ Último" value={stats.last} color="yellow" />
          <StatCard title="❌ Sin stock" value={stats.outOfStock} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input className="input w-64" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-48" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
          <option value="all">📍 Todas las ubicaciones</option>
          {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className="input w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">💡 Todos los estados</option>
          <option value="ok">✅ OK</option>
          <option value="last">⚠️ Último</option>
          <option value="out_of_stock">❌ Sin stock</option>
        </select>
      </div>

      {/* Grouped by location */}
      {filterLoc === 'all' && filterStatus === 'all' && !search ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {LOCATIONS.map(loc => {
            const locItems = items.filter((i: any) => i.location === loc.value);
            if (!locItems.length) return null;
            return (
              <div key={loc.value} className="card">
                <h3 className="font-semibold text-gray-900 mb-4">{loc.label} <span className="text-gray-400 font-normal">({locItems.length})</span></h3>
                <div className="space-y-2">
                  {locItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400">Cant: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <button onClick={() => handleEdit(item)} className="text-primary-500 hover:text-primary-700 p-1"><Edit2 size={14}/></button>
                        <button onClick={() => setDeleteId(item.id)} className="text-danger-500 hover:text-danger-700 p-1"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Producto','Cantidad','Ubicación','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${item.quantity === 0 ? 'text-danger-600' : item.quantity === 1 ? 'text-warning-600' : 'text-success-600'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{LOCATIONS.find(l=>l.value===item.location)?.label || item.location}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="text-primary-600 hover:text-primary-700 p-1"><Edit2 size={16}/></button>
                      <button onClick={() => setDeleteId(item.id)} className="text-danger-600 hover:text-danger-700 p-1"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-12">No se encontraron productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Editar producto' : 'Agregar producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre del producto</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Cantidad</label><input type="number" min="0" className="input" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)||0})} required /></div>
            <div>
              <label className="label">Ubicación</label>
              <select className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})}>
                {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notas (opcional)</label><input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          {form.quantity === 1 && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-700">
              ⚠️ Cantidad = 1: Se enviará alerta por WhatsApp a los usuarios configurados.
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