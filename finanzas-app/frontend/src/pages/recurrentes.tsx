import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { recurringAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, AlertTriangle, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import ActionButtons from '../components/ui/ActionButtons';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const CATEGORIES = [
  'Casa', 'Comida', 'Familia', 'Transporte', 'Viajes',
  'Deudas', 'Salud', 'Suscripciones', 'Cuidado Personal', 'Otros',
];

const defaultForm = {
  nombre: '',
  monto: '',
  diaMes: '1',
  categoria: '',
  activo: true,
};

export default function RecurrentesPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);

  const { data: recurring = [], isLoading, isError, refetch } = useQuery(
    'recurring-transactions',
    () => recurringAPI.getAll().then(r => r.data),
    { staleTime: 0, retry: false }
  );

  const refresh = () => qc.invalidateQueries('recurring-transactions');

  const createMut = useMutation((d: any) => recurringAPI.create(d), {
    onSuccess: () => { toast.success('Transacción recurrente creada'); setShowModal(false); setForm(defaultForm); refresh(); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const updateMut = useMutation((d: any) => recurringAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Actualizada'); setEditItem(null); setShowModal(false); refresh(); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const deleteMut = useMutation((id: string) => recurringAPI.remove(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteId(null); refresh(); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const toggleMut = useMutation(({ id, activo }: { id: string; activo: boolean }) =>
    recurringAPI.update(id, { activo: !activo }), {
    onSuccess: () => refresh(),
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const generateMut = useMutation(() => recurringAPI.generateForMonth(genYear, genMonth), {
    onSuccess: () => { toast.success(`Transacciones generadas para ${genMonth}/${genYear}`); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error al generar'); },
  });

  const handleEdit = (r: any) => {
    setForm({
      nombre: r.nombre ?? r.name ?? '',
      monto: r.monto ?? r.amount ?? '',
      diaMes: r.diaMes ?? r.dayOfMonth ?? '1',
      categoria: r.categoria ?? r.category ?? '',
      activo: r.activo ?? r.active ?? true,
    });
    setEditItem(r);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, monto: parseFloat(form.monto), diaMes: parseInt(form.diaMes) };
    editItem ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const activeRecurring = (recurring as any[]).filter((r: any) => r.activo ?? r.active);
  const totalMensual = activeRecurring.reduce((s: number, r: any) => s + Number(r.monto ?? r.amount ?? 0), 0);

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw size={24} /> Transacciones Recurrentes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gastos e ingresos periódicos del hogar</p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Nueva recurrente
        </button>
      </div>

      {/* Summary + generate */}
      {!isLoading && !isError && (recurring as any[]).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Total mensual activo</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${fmt(totalMensual)}/mes</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activeRecurring.length} de {(recurring as any[]).length} activas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-2">Generar para el mes</p>
            <div className="flex gap-2 items-center">
              <select
                value={genMonth}
                onChange={e => setGenMonth(Number(e.target.value))}
                className="input flex-1 text-sm py-1.5"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number"
                value={genYear}
                onChange={e => setGenYear(Number(e.target.value))}
                className="input w-24 text-sm py-1.5"
                min={2020}
                max={2099}
              />
              <button
                onClick={() => generateMut.mutate()}
                disabled={generateMut.isLoading}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
              >
                <Play size={14} /> {generateMut.isLoading ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar las recurrentes</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && (recurring as any[]).length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No hay transacciones recurrentes</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Agregá gastos o ingresos que se repiten cada mes</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            Agregar recurrente
          </button>
        </div>
      )}

      {!isLoading && !isError && (recurring as any[]).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Día</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Generación</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(recurring as any[]).map((r: any) => {
                  const isActive = r.activo ?? r.active ?? true;
                  const lastGenAt: string | null = r.lastGeneratedAt ?? null;
                  const generatedThisMonth = (() => {
                    if (!lastGenAt) return false;
                    const d = new Date(lastGenAt);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  })();
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {r.nombre ?? r.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {r.categoria ?? r.category ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                        ${fmt(r.monto ?? r.amount ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        Día {r.diaMes ?? r.dayOfMonth ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isActive ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${generatedThisMonth ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                            {generatedThisMonth ? 'Generada este mes' : 'Pendiente'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleMut.mutate({ id: r.id, activo: isActive })}
                          className={`flex items-center gap-1 mx-auto text-xs font-medium transition-colors ${
                            isActive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {isActive
                            ? <><ToggleRight size={18} /> Activa</>
                            : <><ToggleLeft size={18} /> Inactiva</>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionButtons
                          onEdit={() => handleEdit(r)}
                          onDelete={() => setDeleteId(r.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar recurrente' : 'Nueva transacción recurrente'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="rec-nombre">Nombre</label>
            <input
              id="rec-nombre"
              className="input"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Netflix, Alquiler..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="rec-monto">Monto</label>
              <input
                id="rec-monto"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="rec-dia">Día del mes (1-31)</label>
              <input
                id="rec-dia"
                type="number"
                min="1"
                max="31"
                className="input"
                value={form.diaMes}
                onChange={e => setForm({ ...form, diaMes: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="rec-categoria">Categoría</label>
            <select
              id="rec-categoria"
              className="input"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId!)}
        loading={deleteMut.isLoading}
      />
    </Layout>
  );
}
