import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loansAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, Landmark, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const defaultForm = {
  tipo: '',
  institucion: '',
  deudaInicial: '',
  deudaActual: '',
  cuotaMensual: '',
  notas: '',
};

export default function CreditosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: loans = [], isLoading, isError, refetch } = useQuery(
    'loans',
    () => loansAPI.getAll().then(r => r.data),
    { staleTime: 0 }
  );

  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const refreshCache = () => {
    loansAPI.getAll().then(r => qc.setQueryData('loans', r.data));
  };

  const createMut = useMutation((d: any) => loansAPI.create(d), {
    onSuccess: () => { toast.success('Crédito registrado'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation((d: any) => loansAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Crédito actualizado'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation((id: string) => loansAPI.delete(id), {
    onSuccess: () => { toast.success('Crédito eliminado'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const handleEdit = (l: any) => {
    setForm({
      tipo: l.tipo,
      institucion: l.institucion,
      deudaInicial: l.deudaInicial,
      deudaActual: l.deudaActual,
      cuotaMensual: l.cuotaMensual,
      notas: l.notas || '',
    });
    setEditItem(l);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  const totalDeuda = loans.reduce((s: number, l: any) => s + Number(l.deudaActual || 0), 0);
  const totalCuota = loans.reduce((s: number, l: any) => s + Number(l.cuotaMensual || 0), 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="skeleton h-8 w-44" />
          <div className="skeleton h-20 w-full" />
          {[1, 2].map(i => <div key={i} className="skeleton h-32 w-full" />)}
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">Error al cargar los créditos</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Landmark size={24} /> Créditos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Seguimiento de préstamos y financiamientos</p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Crédito
        </button>
      </div>

      {/* Summary */}
      {loans.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm flex flex-wrap gap-8">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">Deuda total</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${fmt(totalDeuda)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">Cuota mensual total</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${fmt(totalCuota)}/mes</p>
          </div>
        </div>
      )}

      {/* Loans list */}
      {loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <Landmark size={48} className="mb-4 opacity-40" />
          <p className="text-lg font-medium mb-1">No hay créditos registrados</p>
          <p className="text-sm">Registrá tus préstamos para llevar el control</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((l: any) => {
            const inicial = Number(l.deudaInicial || 0);
            const actual = Number(l.deudaActual || 0);
            const pagado = Math.max(inicial - actual, 0);
            const pct = inicial > 0 ? Math.min((pagado / inicial) * 100, 100) : 0;

            return (
              <div
                key={l.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{l.tipo}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">— {l.institucion}</span>
                    </div>
                    {l.notas && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{l.notas}</p>
                    )}
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(l)}
                    onDelete={() => setDeleteId(l.id)}
                  />
                </div>

                {/* Debt journey */}
                <div className="flex flex-wrap gap-4 text-sm mb-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Deuda inicial</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">${fmt(inicial)}</span>
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 self-center">→</div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Deuda actual</span>
                    <span className="font-bold text-red-600 dark:text-red-400">${fmt(actual)}</span>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Cuota mensual</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">${fmt(Number(l.cuotaMensual || 0))}/mes</span>
                  </div>
                  {Number(l.cuotaMensual) > 0 && actual > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Finaliza en</span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 justify-end">
                        <Clock size={11} />
                        {Math.ceil(actual / Number(l.cuotaMensual))} meses
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{pct.toFixed(0)}% completado</span>
                    <span>${fmt(pagado)} pagado</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar crédito' : 'Nuevo crédito'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de crédito</label>
              <input
                className="input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                placeholder="Ej: Préstamo personal"
                required
              />
            </div>
            <div>
              <label className="label">Institución</label>
              <input
                className="input"
                value={form.institucion}
                onChange={e => setForm({ ...form, institucion: e.target.value })}
                placeholder="Ej: Banco Nación"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deuda inicial</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.deudaInicial}
                onChange={e => setForm({ ...form, deudaInicial: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Deuda actual</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.deudaActual}
                onChange={e => setForm({ ...form, deudaActual: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Cuota mensual</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.cuotaMensual}
              onChange={e => setForm({ ...form, cuotaMensual: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              placeholder="Detalles adicionales del crédito..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Registrar'}
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
