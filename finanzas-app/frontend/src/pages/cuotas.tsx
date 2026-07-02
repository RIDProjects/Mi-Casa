import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cuotasAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, CreditCard, Edit2, Trash2, CheckCircle, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const defaultForm = {
  description: '',
  store: '',
  totalAmount: '',
  totalInstallments: '',
  installmentAmount: '',
  startDate: '',
  withInterest: false,
  interestRate: '',
  cardLastFour: '',
};

export default function CuotasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: cuotasRaw, isLoading, isError, refetch } = useQuery(
    'cuotas',
    () => cuotasAPI.getAll().then(r => r.data),
    { staleTime: 0 }
  );
  const { data: summary } = useQuery(
    'cuotas-summary',
    () => cuotasAPI.getSummary().then(r => r.data),
    { staleTime: 0 }
  );

  const cuotas: any[] = Array.isArray(cuotasRaw) ? cuotasRaw : [];
  const activeCuotas = cuotas.filter((c: any) => !c.isPaid && !c.isCompleted);

  const compromisoMensual = summary?.compromisoMensual
    ?? activeCuotas.reduce((s: number, c: any) => s + Number(c.installmentAmount || 0), 0);
  const cuotasActivas = summary?.cuotasActivas ?? activeCuotas.length;
  const deudaTotalRestante = summary?.deudaTotalRestante
    ?? activeCuotas.reduce((s: number, c: any) => {
      const remaining = (Number(c.totalInstallments || 0) - Number(c.paidInstallments || 0));
      return s + remaining * Number(c.installmentAmount || 0);
    }, 0);

  const getError = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const invalidate = () => {
    qc.invalidateQueries('cuotas');
    qc.invalidateQueries('cuotas-summary');
  };

  const createMut = useMutation((d: any) => cuotasAPI.create(d), {
    onSuccess: () => { toast.success('Cuota registrada'); setShowModal(false); setForm(defaultForm); invalidate(); },
    onError: (e: any) => { toast.error(getError(e)); },
  });

  const updateMut = useMutation((d: any) => cuotasAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Cuota actualizada'); setShowModal(false); setEditItem(null); invalidate(); },
    onError: (e: any) => { toast.error(getError(e)); },
  });

  const removeMut = useMutation((id: string) => cuotasAPI.remove(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteId(null); invalidate(); },
    onError: (e: any) => { toast.error(getError(e)); },
  });

  const payMut = useMutation((id: string) => cuotasAPI.pay(id), {
    onSuccess: () => { toast.success('Cuota pagada'); invalidate(); },
    onError: (e: any) => { toast.error(getError(e)); },
  });

  const handleEdit = (c: any) => {
    setForm({
      description: c.description || '',
      store: c.store || '',
      totalAmount: c.totalAmount || '',
      totalInstallments: c.totalInstallments || '',
      installmentAmount: c.installmentAmount || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      withInterest: c.withInterest || false,
      interestRate: c.interestRate || '',
      cardLastFour: c.cardLastFour || '',
    });
    setEditItem(c);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      totalAmount: Number(form.totalAmount),
      totalInstallments: Number(form.totalInstallments),
      installmentAmount: form.installmentAmount
        ? Number(form.installmentAmount)
        : Number(form.totalAmount) / Number(form.totalInstallments),
      interestRate: form.withInterest ? Number(form.interestRate) : null,
    };
    editItem ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const autoInstallment =
    form.totalAmount && form.totalInstallments && !form.installmentAmount
      ? (Number(form.totalAmount) / Number(form.totalInstallments)).toFixed(2)
      : null;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="skeleton h-8 w-56" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 w-full" />)}
          </div>
          <div className="skeleton h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">Error al cargar las cuotas</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard size={24} /> Plan de Cuotas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Seguimiento de compras en cuotas</p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Nueva cuota
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Compromiso mensual</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${fmt(compromisoMensual)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cuotas activas</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cuotasActivas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Deuda total restante</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${fmt(deudaTotalRestante)}</p>
        </div>
      </div>

      {cuotas.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Sin cuotas registradas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registrá tus compras en cuotas para hacer un seguimiento</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            Agregar cuota
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cuotas.map((c: any) => {
            const paid = Number(c.paidInstallments || 0);
            const total = Number(c.totalInstallments || 1);
            const pct = Math.min((paid / total) * 100, 100);
            const remaining = total - paid;
            const isCompleted = remaining <= 0 || c.isCompleted || c.isPaid;

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5 ${
                  isCompleted
                    ? 'border-green-200 dark:border-green-800 opacity-70'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{c.description}</h3>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Completada
                        </span>
                      )}
                      {c.withInterest && (
                        <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                          Con interés {c.interestRate ? `${c.interestRate}%` : ''}
                        </span>
                      )}
                    </div>
                    {c.store && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.store}</p>
                    )}

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{paid} de {total} cuotas pagadas</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Cuota mensual</p>
                        <p className="font-semibold text-gray-900 dark:text-white">${fmt(Number(c.installmentAmount || 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Restante</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          ${fmt(remaining * Number(c.installmentAmount || 0))}
                        </p>
                      </div>
                      {c.nextPaymentDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Próximo vencimiento</p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{fmtDate(c.nextPaymentDate)}</p>
                          </div>
                        </div>
                      )}
                      {c.cardLastFour && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Tarjeta</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">**** {c.cardLastFour}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {!isCompleted && (
                      <button
                        onClick={() => payMut.mutate(c.id)}
                        disabled={payMut.isLoading}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Pagar cuota
                      </button>
                    )}
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar cuota' : 'Nueva cuota'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Descripción</label>
            <input
              className="input"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Heladera Samsung"
              required
            />
          </div>
          <div>
            <label className="label">Comercio (opcional)</label>
            <input
              className="input"
              value={form.store}
              onChange={e => setForm({ ...form, store: e.target.value })}
              placeholder="Ej: Frávega, Garbarino..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto total</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.totalAmount}
                onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Cantidad de cuotas</label>
              <input
                type="number"
                min="1"
                max="48"
                className="input"
                value={form.totalInstallments}
                onChange={e => setForm({ ...form, totalInstallments: e.target.value })}
                placeholder="12"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">
              Monto por cuota{' '}
              {autoInstallment && (
                <span className="text-gray-400 font-normal">(calculado: ${autoInstallment})</span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.installmentAmount}
              onChange={e => setForm({ ...form, installmentAmount: e.target.value })}
              placeholder={autoInstallment ?? '0.00'}
            />
          </div>
          <div>
            <label className="label">Fecha de inicio</label>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="withInterest"
              checked={form.withInterest}
              onChange={e => setForm({ ...form, withInterest: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="withInterest" className="text-sm text-gray-700 dark:text-gray-300">Con interés</label>
          </div>
          {form.withInterest && (
            <div>
              <label className="label">Tasa de interés (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.interestRate}
                onChange={e => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
          )}
          <div>
            <label className="label">Últimos 4 dígitos de tarjeta (opcional)</label>
            <input
              className="input"
              maxLength={4}
              value={form.cardLastFour}
              onChange={e => setForm({ ...form, cardLastFour: e.target.value })}
              placeholder="1234"
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
        onConfirm={() => removeMut.mutate(deleteId!)}
        loading={removeMut.isLoading}
      />
    </Layout>
  );
}
