import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { emergencyFundAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, PiggyBank, Target } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(Number(n) || 0);

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  // Calculate totals
  const totalMonthlyExpenses = fund?.categories?.reduce((sum: number, c: any) => sum + Number(c.monthlyAmount || 0), 0) || 0;
  const optimalFund = totalMonthlyExpenses * fund?.targetMonths;
  const minimumFund = totalMonthlyExpenses * fund?.minimumMonths;
  const monthlySavingsRequired = optimalFund / fund?.savingPeriodMonths;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💰 Calculadora de Fondo de Emergencia</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Calcula cuánto necesitas para estar seguro</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setEditFund(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nueva calculadora
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Fund selector */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Mis Fondos</h2>
          {funds.map((f: any) => {
            const fCalc = {
              totalMonthlyExpenses: f.categories?.reduce((sum: number, c: any) => sum + Number(c.monthlyAmount || 0), 0) || 0,
              optimalFund: 0,
              minimumFund: 0,
              monthlySavingsRequired: 0,
            };
            fCalc.optimalFund = fCalc.totalMonthlyExpenses * f.targetMonths;
            fCalc.minimumFund = fCalc.totalMonthlyExpenses * f.minimumMonths;
            fCalc.monthlySavingsRequired = fCalc.optimalFund / f.savingPeriodMonths;
            
            return (
              <div key={f.id} onClick={() => setSelectedFund(f)}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer p-4 transition-all hover:shadow-md ${selectedFund?.id === f.id || (!selectedFund && funds[0]?.id === f.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); handleEdit(f); }} className="text-blue-500 hover:text-blue-700 p-1">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(f.id); }} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {fCalc && (
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <p>Óptimo: <strong className="text-gray-700 dark:text-gray-300">${fmt(fCalc.optimalFund)}</strong></p>
                    <p>Ahorro: <strong className="text-gray-700 dark:text-gray-300">${fmt(fCalc.monthlySavingsRequired)}/mes</strong></p>
                  </div>
                )}
              </div>
            );
          })}
          {funds.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
              Sin calculadoras aún
            </div>
          )}
        </div>

        {/* Fund detail */}
        <div className="lg:col-span-3">
          {fund && calc ? (
            <>
              {/* Results - Like Excel */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">💰 Calcula tu Fondo de Emergencia</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">¡Empieza aquí!</p>
                </div>

                {/* Main Results */}
                <div className="p-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                      <li><strong>1.</strong> Escribe los meses en los que te gustaría lograr tu fondo de emergencia.</li>
                      <li><strong>2.</strong> Ingresa tus gastos fijos mensuales en cada categoría.</li>
                      <li><strong>3.</strong> Revisa el monto óptimo en la primera celda verde y el mínimo en la celda naranja.</li>
                      <li><strong>4.</strong> ¡Comienza a ahorrar! Checa el monto mensual que tendrías que destinar mes a mes.</li>
                    </ol>
                  </div>

                  {/* Months Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿En cuántos meses lo harás?</label>
                    <input 
                      type="number" 
                      className="input w-32" 
                      value={fund.savingPeriodMonths}
                      readOnly
                    />
                  </div>

                  {/* Results Display */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <p className="text-sm text-green-700 dark:text-green-400">🏆 Monto óptimo ({fund.targetMonths} meses)</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">${fmt(optimalFund)}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <p className="text-sm text-orange-700 dark:text-orange-400">🎯 Monto mínimo ({fund.minimumMonths} meses)</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">${fmt(minimumFund)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-400">📅 Ahorro mensual mínimo</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">${fmt(monthlySavingsRequired)}</p>
                    </div>
                  </div>

                  {/* Categories Table - Like Excel */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Tus gastos mensuales por categoría</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Monto mensual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {fund.categories?.map((cat: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{cat.name}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                              {Number(cat.monthlyAmount) > 0 ? `$${fmt(cat.monthlyAmount)}` : <span className="text-gray-400">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 font-semibold">
                        <tr>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">TOTAL GASTOS MENSUALES</td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white text-base">${fmt(totalMonthlyExpenses)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center h-64">
              <div className="text-center">
                <PiggyBank size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-400 dark:text-gray-500 mb-4">Crea tu primera calculadora de fondo de emergencia</p>
                <button onClick={() => { setForm(defaultForm); setEditFund(null); setShowModal(true); }} className="btn-primary">
                  <Plus size={16} className="inline mr-2" />Crear ahora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditFund(null); }} title={editFund ? 'Editar fondo' : 'Nueva calculadora'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Meses óptimo</label>
              <input type="number" min="1" className="input" value={form.targetMonths} onChange={e => setForm({ ...form, targetMonths: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Meses mínimo</label>
              <input type="number" min="1" className="input" value={form.minimumMonths} onChange={e => setForm({ ...form, minimumMonths: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">¿En cuántos meses?</label>
              <input type="number" min="1" className="input" value={form.savingPeriodMonths} onChange={e => setForm({ ...form, savingPeriodMonths: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Gastos mensuales por categoría</label>
              <button type="button" onClick={addCategory} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border dark:border-gray-600 rounded-xl p-3">
              {form.categories.map((cat: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="input flex-1 text-sm" placeholder="Categoría" value={cat.name} onChange={e => updateCategory(idx, 'name', e.target.value)} />
                  <input type="number" step="0.01" min="0" className="input w-32 text-sm" placeholder="0.00" value={cat.monthlyAmount} onChange={e => updateCategory(idx, 'monthlyAmount', Number(e.target.value))} />
                  <button type="button" onClick={() => removeCategory(idx)} className="text-red-500 hover:text-red-700 shrink-0 p-1">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total: ${fmt(form.categories.reduce((s: number, c: any) => s + (Number(c.monthlyAmount) || 0), 0))}
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
