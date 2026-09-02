import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { debtsAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ActionButtons from '../components/ui/ActionButtons';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, DollarSign, Calendar, User, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { getErrorMessage } from '../utils/errors';
import { useCurrencyFormatter } from '../lib/currency';

const defaultForm = { personName: '', amount: '', note: '', type: 'they_owe_me', interestRate: '', minimumPayment: '' };

export default function DebtsPage() {
  const qc = useQueryClient();
  const { fmt: cfmt } = useCurrencyFormatter();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('debts', 'create');
  const canEdit = hasPermission('debts', 'edit');
  const canDelete = hasPermission('debts', 'delete');

  const [showModal, setShowModal] = useState(false);
  const [editDebt, setEditDebt] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [paidDebtInfo, setPaidDebtInfo] = useState<any>(null);

  const { data: debts = [], isLoading: loadingDebts, isError: errorDebts, refetch: refetchDebts } = useQuery('debts', () => debtsAPI.getAll().then(r => r.data), { staleTime: 0 });
  const { isLoading: loadingSummary } = useQuery('debtsSummary', () => debtsAPI.getSummary().then(r => r.data), { staleTime: 0 });


  const updateDebtsCache = () => {
    debtsAPI.getAll().then(r => { qc.setQueryData('debts', r.data); });
    debtsAPI.getSummary().then(r => { qc.setQueryData('debtsSummary', r.data); });
  };

  const createMut = useMutation((d: any) => debtsAPI.create(d), {
    onSuccess: () => { toast.success('Deuda registrada'); setShowModal(false); setForm(defaultForm); updateDebtsCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => debtsAPI.update(editDebt?.id, d), {
    onSuccess: () => { toast.success('Deuda actualizada'); setEditDebt(null); setShowModal(false); updateDebtsCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => debtsAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteId(null); updateDebtsCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const markPaidMut = useMutation((id: string) => debtsAPI.update(id, { isPaid: true }), {
    onSuccess: (_res, id) => {
      const debt = debts.find((d: any) => d.id === id);
      const now = new Date();
      setPaidDebtInfo({
        personName: debt?.personName,
        amount: debt?.amount,
        type: debt?.type,
        paidAt: now,
        originalNote: debt?.note,
      });
      toast.success('Marcada como pagada ✅');
      updateDebtsCache();
    },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const handleEdit = (d: any) => {
    setForm({
      personName: d.personName,
      amount: d.amount,
      note: d.note || '',
      type: d.type,
      interestRate: String(d.interestRate ?? ''),
      minimumPayment: String(d.minimumPayment ?? ''),
    });
    setEditDebt(d);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editDebt ? updateMut.mutate(form) : createMut.mutate(form);
  };

  if (loadingDebts || loadingSummary) {
    return (
      <Layout>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant space-y-3">
              <div className="animate-pulse bg-surface-container rounded h-4 w-1/3" />
              <div className="animate-pulse bg-surface-container rounded h-8 w-1/2" />
              <div className="animate-pulse bg-surface-container rounded h-3 w-2/3" />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  if (errorDebts) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger" />
          <p className="text-on-surface-variant">Error al cargar las deudas</p>
          <button onClick={() => refetchDebts()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </Layout>
    );
  }

  const theyOweMe = debts.filter((d: any) => d.type === 'they_owe_me' && !d.isPaid);
  const iOwe = debts.filter((d: any) => d.type === 'i_owe' && !d.isPaid);
  const paidDebts = debts.filter((d: any) => d.isPaid);

  const totalTheyOweMe = theyOweMe.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const totalIOwe = iOwe.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const balance = totalTheyOweMe - totalIOwe;

  return (
    <Layout>
      <PageHeader
        title="💸 Gestor de Deudas"
        subtitle="Control de lo que te deben y lo que debes"
        action={
          canCreate ? (
            <button onClick={() => { setForm(defaultForm); setEditDebt(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Registrar deuda
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
              <Lock size={16} /> Sin permisos para agregar
            </div>
          )
        }
      />

      {/* Summary Banner */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-on-surface">Saldo:</span>
            <span className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {balance >= 0 ? '✅' : '⚠️'} {balance >= 0 ? '+' : ''}{cfmt(balance)}
            </span>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Total que me adeudan</p>
              <p className="text-xl font-bold text-success">+{cfmt(totalTheyOweMe)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Total adeudado por mí</p>
              <p className="text-xl font-bold text-danger">-{cfmt(totalIOwe)}</p>
            </div>
          </div>
        </div>
      </div>

      {theyOweMe.length === 0 && iOwe.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🤝</div>
          <h3 className="text-lg font-semibold text-on-surface">Sin deudas activas</h3>
          <p className="text-sm text-on-surface-variant mt-1">No hay deudas pendientes en este momento</p>
          {canCreate && (
            <button
              onClick={() => { setForm(defaultForm); setEditDebt(null); setShowModal(true); }}
              className="mt-4 btn-primary text-sm"
            >
              Registrar deuda
            </button>
          )}
        </div>
      )}

      {/* Main Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 💙 ME DEBEN */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-3 border-b border-blue-100 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300">💙 ME DEBEN</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b">
              <tr>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">👤 Persona</th>
                <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant uppercase">💰 Monto</th>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">📝 Nota</th>
                <th className="px-4 py-2 text-center font-label-upper text-label-upper text-on-surface-variant uppercase">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {theyOweMe.map((d: any) => (
                <tr key={d.id} className="hover:bg-surface-gray">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {d.personName}
                    {Number(d.interestRate) > 0 && (
                      <div className="mt-0.5"><Badge variant="red">{d.interestRate}% TNA</Badge></div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-success">
                    <div>{cfmt(d.amount)}</div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{d.note || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <ActionButtons
                      onMarkPaid={() => markPaidMut.mutate(d.id)}
                      onEdit={canEdit ? () => handleEdit(d) : undefined}
                      onDelete={canDelete ? () => setDeleteId(d.id) : undefined}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  </td>
                </tr>
              ))}
              {theyOweMe.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-outline">No hay nadie que te deba dinero</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
              <tr>
                <td className="px-4 py-3 font-semibold text-on-surface">TOTAL QUE ME ADEUDAN</td>
                <td className="px-4 py-3 text-right font-bold text-success">{cfmt(totalTheyOweMe)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ❤️ LES DEBO */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/30 px-4 py-3 border-b border-red-100 dark:border-red-800">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">❤️ LES DEBO</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b">
              <tr>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">👤 Persona</th>
                <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant uppercase">💰 Monto</th>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">📝 Nota</th>
                <th className="px-4 py-2 text-center font-label-upper text-label-upper text-on-surface-variant uppercase">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {iOwe.map((d: any) => (
                <tr key={d.id} className="hover:bg-surface-gray">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {d.personName}
                    {Number(d.interestRate) > 0 && (
                      <div className="mt-0.5"><Badge variant="red">{d.interestRate}% TNA</Badge></div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-danger">
                    <div>{cfmt(d.amount)}</div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{d.note || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <ActionButtons
                      onMarkPaid={() => markPaidMut.mutate(d.id)}
                      onEdit={canEdit ? () => handleEdit(d) : undefined}
                      onDelete={canDelete ? () => setDeleteId(d.id) : undefined}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  </td>
                </tr>
              ))}
              {iOwe.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-outline">No debes dinero a nadie</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-red-50 dark:bg-red-900/20 border-t-2 border-red-200 dark:border-red-800">
              <tr>
                <td className="px-4 py-3 font-semibold text-on-surface">TOTAL ADEUDADO POR MÍ</td>
                <td className="px-4 py-3 text-right font-bold text-danger">{cfmt(totalIOwe)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Paid Debts History */}
      {paidDebts.length > 0 && (
        <div className="mt-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant">
            <h2 className="text-lg font-semibold text-on-surface">✅ Deudas Pagadas ({paidDebts.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b">
              <tr>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">Persona</th>
                <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant uppercase">Monto</th>
                <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant uppercase">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paidDebts.map((d: any) => (
                <tr key={d.id} className="opacity-60">
                  <td className="px-4 py-2 text-on-surface">{d.personName}</td>
                  <td className="px-4 py-2 text-right text-on-surface-variant line-through">{cfmt(d.amount)}</td>
                  <td className="px-4 py-2">
                    {d.type === 'they_owe_me'
                      ? <Badge variant="green">Me debían</Badge>
                      : <Badge variant="red">Les debía</Badge>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditDebt(null); }} title={editDebt ? 'Editar deuda' : 'Registrar deuda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: 'they_owe_me', l: '💙 Me deben' }, { v: 'i_owe', l: '❤️ Yo debo' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, type: v })}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${form.type === v ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-outline-variant text-on-surface-variant'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Persona</label>
            <input className="input" value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })} placeholder="Nombre de la persona" required />
          </div>
          <div>
            <label className="label">Monto</label>
            <input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
          </div>
          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Descripción adicional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tasa de interés anual (%)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Pago mínimo mensual</label>
              <input type="number" step="0.01" min="0" className="input" value={form.minimumPayment} onChange={e => setForm({ ...form, minimumPayment: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditDebt(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editDebt ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Paid Debt Info */}
      <Modal isOpen={!!paidDebtInfo} onClose={() => setPaidDebtInfo(null)} title="✅ Deuda Pagada">
        {paidDebtInfo && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <CheckCircle size={48} className="mx-auto text-success mb-2" />
              <p className="text-green-800 dark:text-green-300 font-semibold">¡Pago registrado!</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <User size={18} className="text-on-surface-variant" />
                <div>
                  <p className="text-xs text-on-surface-variant">Persona</p>
                  <p className="font-medium text-on-surface">{paidDebtInfo.personName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <DollarSign size={18} className="text-on-surface-variant" />
                <div>
                  <p className="text-xs text-on-surface-variant">Monto pagado</p>
                  <p className="font-medium text-success">{cfmt(paidDebtInfo.amount)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <Calendar size={18} className="text-on-surface-variant" />
                <div>
                  <p className="text-xs text-on-surface-variant">Fecha de pago</p>
                  <p className="font-medium text-on-surface">
                    {paidDebtInfo.paidAt instanceof Date
                      ? paidDebtInfo.paidAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : paidDebtInfo.paidAt}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => setPaidDebtInfo(null)} className="btn-primary w-full">Cerrar</button>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading} />
    </Layout>
  );
}
