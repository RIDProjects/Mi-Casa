import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { emergencyFundAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, PiggyBank, Target } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(Number(n)||0);

const DEFAULT_CATEGORIES = [
  { name: 'Renta o crédito de vivienda', monthlyAmount: 0 },
  { name: 'Luz', monthlyAmount: 0 },
  { name: 'Gas', monthlyAmount: 0 },
  { name: 'Agua', monthlyAmount: 0 },
  { name: 'Internet', monthlyAmount: 0 },
  { name: 'Celular', monthlyAmount: 0 },
  { name: 'Seguros (salud, auto, vida)', monthlyAmount: 0 },
  { name: 'Transporte (Uber, gasolina, metro)', monthlyAmount: 0 },
  { name: 'Deudas (tarjeta, préstamo)', monthlyAmount: 0 },
  { name: 'Alimentos (despensa, comidas)', monthlyAmount: 0 },
  { name: 'Otros gastos', monthlyAmount: 0 },
];

const defaultForm = {
  name: 'Mi Fondo de Emergencia',
  targetMonths: 6,
  minimumMonths: 3,
  savingPeriodMonths: 24,
  categories: DEFAULT_CATEGORIES,
};

export default function EmergencyFundPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editFund, setEditFund] = useState<any>(null);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: funds = [] } = useQuery('emergencyFunds', () => emergencyFundAPI.getAll().then(r => r.data));

  const createMut = useMutation((d: any) => emergencyFundAPI.create(d), {
    onSuccess: (res) => { toast.success('Fondo creado'); setShowModal(false); setSelectedFund(res.data); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });
  const updateMut = useMutation((d: any) => emergencyFundAPI.update(editFund?.id, d), {
    onSuccess: (res) => { toast.success('Actualizado'); setEditFund(null); setShowModal(false); setSelectedFund(res.data); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });
  const deleteMut = useMutation((id: string) => emergencyFundAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteId(null); setSelectedFund(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });

  const handleEdit = (fund: any) => {
    setForm({
      name: fund.name,
      targetMonths: fund.targetMonths,
      minimumMonths: fund.minimumMonths,
      savingPeriodMonths: fund.savingPeriodMonths,
      categories: fund.categories?.map((c: any) => ({ name: c.name, monthlyAmount: Number(c.monthlyAmount) })) || DEFAULT_CATEGORIES,
    });
    setEditFund(fund);
    setShowModal(true);
  };

  const updateCategory = (idx: number, field: string, value: any) => {
    const cats = [...form.categories];
    cats[idx] = { ...cats[idx], [field]: value };
    setForm({ ...form, categories: cats });
  };

  const addCategory = () => setForm({ ...form, categories: [...form.categories, { name: '', monthlyAmount: 0 }] });
  const removeCategory = (idx: number) => setForm({ ...form, categories: form.categories.filter((_: any, i: number) => i !== idx) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editFund ? updateMut.mutate(form) : createMut.mutate(form);
  };

  const fund = selectedFund || funds[0];
  const calc = fund?.calculations;

  const progress = calc && calc.optimalFund > 0
    ? Math.min(100, ((calc.totalMonthlyExpenses * (fund.targetMonths - fund.minimumMonths)) / calc.optimalFund) * 100)
    : 0;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Fondo de Emergencia</h1>
          <p className="text-gray-500 mt-1">Calcula cuánto necesitas para estar seguro</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setEditFund(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18}/> Nueva calculadora
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Fund selector */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Mis Fondos</h2>
          {funds.map((f: any) => (
            <div key={f.id} onClick={() => setSelectedFund(f)}
              className={`card cursor-pointer p-4 transition-all hover:shadow-md ${selectedFund?.id === f.id || (!selectedFund && funds[0]?.id === f.id) ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank size={18} className="text-primary-600"/>
                  <span className="text-sm font-semibold text-gray-900">{f.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); handleEdit(f); }} className="text-primary-500 hover:text-primary-700 p-1"><Edit2 size={14}/></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteId(f.id); }} className="text-danger-500 hover:text-danger-700 p-1"><Trash2 size={14}/></button>
                </div>
              </div>
              {f.calculations && (
                <div className="mt-2 text-xs text-gray-400">
                  <p>Óptimo: <strong>${fmt(f.calculations.optimalFund)}</strong></p>
                  <p>Ahorro: <strong>${fmt(f.calculations.monthlySavingsRequired)}/mes</strong></p>
                </div>
              )}
            </div>
          ))}
          {funds.length === 0 && <div className="card text-center text-gray-400 py-8 text-sm">Sin calculadoras aún</div>}
        </div>

        {/* Fund detail */}
        <div className="lg:col-span-3">
          {fund && calc ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="card bg-gradient-to-br from-success-500 to-success-600 text-white p-4">
                  <p className="text-sm opacity-80">🏆 Monto Óptimo</p>
                  <p className="text-2xl font-bold">${fmt(calc.optimalFund)}</p>
                  <p className="text-xs opacity-70">{fund.targetMonths} meses de gastos</p>
                </div>
                <div className="card bg-gradient-to-br from-warning-500 to-warning-600 text-white p-4">
                  <p className="text-sm opacity-80">🎯 Monto Mínimo</p>
                  <p className="text-2xl font-bold">${fmt(calc.minimumFund)}</p>
                  <p className="text-xs opacity-70">{fund.minimumMonths} meses de gastos</p>
                </div>
                <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white p-4">
                  <p className="text-sm opacity-80">📅 Ahorro mensual</p>
                  <p className="text-2xl font-bold">${fmt(calc.monthlySavingsRequired)}</p>
                  <p className="text-xs opacity-70">Para {fund.savingPeriodMonths} meses</p>
                </div>
                <div className="card bg-gradient-to-br from-gray-700 to-gray-800 text-white p-4">
                  <p className="text-sm opacity-80">💸 Gastos mensuales</p>
                  <p className="text-2xl font-bold">${fmt(calc.totalMonthlyExpenses)}</p>
                  <p className="text-xs opacity-70">Total de categorías</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="card mb-6 bg-blue-50 border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3">📋 Cómo usar tu fondo de emergencia</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li><strong>1.</strong> Tu meta óptima es <strong>${fmt(calc.optimalFund)}</strong> ({fund.targetMonths} meses de gastos)</li>
                  <li><strong>2.</strong> El mínimo recomendado es <strong>${fmt(calc.minimumFund)}</strong> ({fund.minimumMonths} meses)</li>
                  <li><strong>3.</strong> Para lograrlo en {fund.savingPeriodMonths} meses, ahorra <strong>${fmt(calc.monthlySavingsRequired)}/mes</strong></li>
                  <li><strong>4.</strong> Si no puedes, ajusta el número de meses en la configuración</li>
                </ol>
              </div>

              {/* Expense categories */}
              <div className="card overflow-hidden p-0">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Tus gastos mensuales por categoría</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monto mensual</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fund.categories?.map((cat: any) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{cat.name}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {Number(cat.monthlyAmount) > 0 ? `$${fmt(cat.monthlyAmount)}` : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {calc.totalMonthlyExpenses > 0
                            ? `${((Number(cat.monthlyAmount) / calc.totalMonthlyExpenses) * 100).toFixed(1)}%`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-gray-900">TOTAL GASTOS MENSUALES</td>
                      <td className="px-4 py-3 text-right text-gray-900 text-base">${fmt(calc.totalMonthlyExpenses)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <PiggyBank size={40} className="mx-auto mb-3 opacity-30"/>
                <p>Crea tu primera calculadora de fondo de emergencia</p>
                <button onClick={() => { setForm(defaultForm); setEditFund(null); setShowModal(true); }} className="btn-primary mt-4">
                  <Plus size={16} className="inline mr-2"/>Crear ahora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditFund(null); }} title={editFund ? 'Editar fondo' : 'Nueva calculadora'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Meses óptimo</label>
              <input type="number" min="1" className="input" value={form.targetMonths} onChange={e => setForm({...form,targetMonths:Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">Meses mínimo</label>
              <input type="number" min="1" className="input" value={form.minimumMonths} onChange={e => setForm({...form,minimumMonths:Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">¿En cuántos meses?</label>
              <input type="number" min="1" className="input" value={form.savingPeriodMonths} onChange={e => setForm({...form,savingPeriodMonths:Number(e.target.value)})} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Gastos mensuales por categoría</label>
              <button type="button" onClick={addCategory} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-xl p-3">
              {form.categories.map((cat: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="input flex-1 text-sm" placeholder="Categoría" value={cat.name} onChange={e => updateCategory(idx,'name',e.target.value)} />
                  <input type="number" step="0.01" min="0" className="input w-32 text-sm" placeholder="0.00" value={cat.monthlyAmount} onChange={e => updateCategory(idx,'monthlyAmount',Number(e.target.value))} />
                  <button type="button" onClick={() => removeCategory(idx)} className="text-danger-500 hover:text-danger-700 shrink-0 p-1">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold text-gray-700">
              Total: ${fmt(form.categories.reduce((s: number, c: any) => s + (Number(c.monthlyAmount)||0), 0))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditFund(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editFund ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading} />
    </Layout>
  );
}