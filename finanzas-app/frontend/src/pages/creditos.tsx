import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loansAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
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
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => loansAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Crédito actualizado'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => loansAPI.delete(id), {
    onSuccess: () => { toast.success('Crédito eliminado'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
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

  return (
    <Layout>
      <PageHeader
        title={<><Landmark size={24} /> Créditos</>}
        subtitle="Seguimiento de préstamos y financiamientos"
        action={
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Crédito
          </button>
        }
      />

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">Error al cargar los créditos</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Summary */}
      {!isLoading && !isError && loans.length > 0 && (
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
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && !isError && loans.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No hay créditos registrados</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registrá tu primer préstamo para llevar el control</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            Agregar crédito
          </button>
        </div>
      ) : !isLoading && !isError ? (
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
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Pagado: ${fmt(pagado)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

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
              <label className="label" htmlFor="credito-tipo">Tipo de crédito</label>
              <input
                id="credito-tipo"
                className="input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                placeholder="Ej: Préstamo personal"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="credito-institucion">Institución</label>
              <input
                id="credito-institucion"
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
              <label className="label" htmlFor="credito-deuda-inicial">Deuda inicial</label>
              <input
                id="credito-deuda-inicial"
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
              <label className="label" htmlFor="credito-deuda-actual">Deuda actual</label>
              <input
                id="credito-deuda-actual"
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
            <label className="label" htmlFor="credito-cuota">Cuota mensual</label>
            <input
              id="credito-cuota"
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
            <label className="label" htmlFor="credito-notas">Notas (opcional)</label>
            <textarea
              id="credito-notas"
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
