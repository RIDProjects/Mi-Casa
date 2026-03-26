import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { debtsAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatCard from '../components/ui/StatCard';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
const defaultForm = { personName: '', amount: '', note: '', type: 'they_owe_me' };

export default function DebtsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editDebt, setEditDebt] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [filterType, setFilterType] = useState<'all'|'they_owe_me'|'i_owe'>('all');

  const { data: debts = [], isLoading: loadingDebts } = useQuery('debts', () => debtsAPI.getAll().then(r => r.data));
  const { data: summary, isLoading: loadingSummary } = useQuery('debtsSummary', () => debtsAPI.getSummary().then(r => r.data));

  const createMut = useMutation((d: any) => debtsAPI.create(d), {
    onSuccess: () => { 
      toast.success('Deuda registrada'); 
      setShowModal(false); 
      setForm(defaultForm); 
      qc.refetchQueries(['debts', 'debtsSummary']);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });
  const updateMut = useMutation((d: any) => debtsAPI.update(editDebt?.id, d), {
    onSuccess: () => { 
      toast.success('Deuda actualizada'); 
      setEditDebt(null); 
      setShowModal(false); 
      qc.refetchQueries(['debts', 'debtsSummary']);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });
  const deleteMut = useMutation((id: string) => debtsAPI.delete(id), {
    onSuccess: () => { 
      toast.success('Eliminada'); 
      setDeleteId(null); 
      qc.refetchQueries(['debts', 'debtsSummary']);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });
  const markPaidMut = useMutation((id: string) => debtsAPI.update(id, { isPaid: true }), {
    onSuccess: () => { 
      toast.success('Marcada como pagada ✅'); 
      qc.refetchQueries(['debts', 'debtsSummary']);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  const handleEdit = (d: any) => {
    setForm({ personName: d.personName, amount: d.amount, note: d.note || '', type: d.type });
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
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando deudas...</div>
        </div>
      </Layout>
    );
  }

  const filtered = (debts || []).filter((d: any) => filterType === 'all' || d.type === filterType);
  const active = filtered.filter((d: any) => !d.isPaid);
  const paid = filtered.filter((d: any) => d.isPaid);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-gray-900">💸 Gestor de Deudas</h1><p className="text-gray-500 mt-1">Control de lo que te deben y lo que debes</p></div>
        <button onClick={() => { setForm(defaultForm); setEditDebt(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18}/> Registrar deuda
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="💙 Total que me deben" value={`$${fmt(summary.totalTheyOweMe)}`} color="green" />
          <StatCard title="❤️ Total que debo" value={`$${fmt(summary.totalIOwe)}`} color="red" />
          <StatCard title={summary.balance >= 0 ? '✅ Saldo a favor' : '⚠️ Saldo en contra'}
            value={`$${fmt(Math.abs(summary.balance))}`} color={summary.balance >= 0 ? 'green' : 'red'}
            subtitle={summary.balance >= 0 ? 'Estás en positivo 🎉' : 'Debes más de lo que te deben'} />
        </div>
      )}

      <div className="flex gap-3 mb-6">
        {(['all','they_owe_me','i_owe'] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t === 'all' ? 'Todas' : t === 'they_owe_me' ? '💙 Me deben' : '❤️ Debo'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Deudas activas ({active.length})</h2>
          <div className="space-y-3">
            {active.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${d.type === 'they_owe_me' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                    {d.type === 'they_owe_me' ? '💙' : '❤️'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{d.personName}</p>
                    {d.note && <p className="text-xs text-gray-400">{d.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${d.type === 'they_owe_me' ? 'text-success-600' : 'text-danger-600'}`}>${fmt(d.amount)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => markPaidMut.mutate(d.id)} title="Marcar pagada" className="text-success-600 hover:text-success-700 p-1"><CheckCircle size={16}/></button>
                    <button onClick={() => handleEdit(d)} className="text-primary-600 hover:text-primary-700 p-1"><Edit2 size={16}/></button>
                    <button onClick={() => setDeleteId(d.id)} className="text-danger-600 hover:text-danger-700 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
            {active.length === 0 && <p className="text-center text-gray-400 py-8">No hay deudas activas 🎉</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Historial pagadas ({paid.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {paid.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-success-50 rounded-xl opacity-70">
                <div>
                  <p className="text-sm font-medium text-gray-700">{d.personName}</p>
                  <p className="text-xs text-gray-400">{d.type === 'they_owe_me' ? 'Me debía' : 'Le debía'}</p>
                </div>
                <span className="font-bold text-gray-500 line-through">${fmt(d.amount)}</span>
              </div>
            ))}
            {paid.length === 0 && <p className="text-center text-gray-400 py-8">Sin historial aún</p>}
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditDebt(null); }} title={editDebt ? 'Editar deuda' : 'Registrar deuda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              {[{v:'they_owe_me',l:'💙 Me deben'},{v:'i_owe',l:'❤️ Yo debo'}].map(({v,l}) => (
                <button key={v} type="button" onClick={() => setForm({...form, type: v})}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${form.type === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">Persona</label><input className="input" value={form.personName} onChange={e => setForm({...form, personName: e.target.value})} placeholder="Nombre" required /></div>
          <div><label className="label">Monto</label><input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" required /></div>
          <div><label className="label">Nota (opcional)</label><input className="input" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Descripción" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditDebt(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editDebt ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading} />
    </Layout>
  );
}