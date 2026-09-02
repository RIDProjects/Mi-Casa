import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { emergencyFundAPI, emergencyFundCoverageAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, PiggyBank, Lock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { useCurrencyFormatter } from '../lib/currency';
import { getErrorMessage } from '../utils/errors';

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
  const { fmt: cfmt } = useCurrencyFormatter();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('emergency_fund', 'create');
  const canEdit = hasPermission('emergency_fund', 'edit');
  const canDelete = hasPermission('emergency_fund', 'delete');

  const [showModal, setShowModal] = useState(false);
  const [editFund, setEditFund] = useState<any>(null);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const [currentBalance, setCurrentBalance] = useState<number>(0);

  const { data: funds = [] } = useQuery('emergencyFunds', () => emergencyFundAPI.getAll().then(r => r.data));

  const { data: coverage } = useQuery(
    'emergencyFundCoverage',
    () => emergencyFundCoverageAPI.getCoverage().then(r => r.data),
    { retry: false }
  );

  // Helper to extract error message safely

  const createMut = useMutation((d: any) => emergencyFundAPI.create(d), {
    onSuccess: (res) => { toast.success('Fondo creado'); setShowModal(false); setSelectedFund(res.data); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });
  const updateMut = useMutation((d: any) => emergencyFundAPI.update(editFund?.id, d), {
    onSuccess: (res) => { toast.success('Actualizado'); setEditFund(null); setShowModal(false); setSelectedFund(res.data); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });
  const deleteMut = useMutation((id: string) => emergencyFundAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteId(null); setSelectedFund(null); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
    onSettled: () => { qc.invalidateQueries('emergencyFunds'); },
  });

  const updateBalanceMut = useMutation(
    ({ id, balance }: { id: string; balance: number }) => emergencyFundAPI.update(id, { currentBalance: balance }),
    {
      onSuccess: () => { toast.success('Saldo actualizado'); qc.invalidateQueries('emergencyFunds'); },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    }
  );

  // Sync local balance state when the selected fund changes
  useEffect(() => {
    setCurrentBalance(Number((selectedFund || (funds as any[])[0])?.currentBalance ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(selectedFund || (funds as any[])[0])?.id]);

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
  const monthlySavingsRequired = fund?.savingPeriodMonths > 0 ? optimalFund / fund.savingPeriodMonths : 0;

  return (
    <Layout>
      <PageHeader
        title="💰 Calculadora de Fondo de Emergencia"
        subtitle="Calcula cuánto necesitas para estar seguro"
        action={
          canCreate ? (
            <button onClick={() => { setForm(defaultForm); setEditFund(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Nueva calculadora
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
              <Lock size={16} /> Sin permisos para agregar
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Fund selector */}
        <div className="space-y-3">
          <h2 className="font-semibold text-on-surface text-sm uppercase tracking-wider">Mis Fondos</h2>
          {funds.map((f: any) => {
            const fCalc = {
              totalMonthlyExpenses: f.categories?.reduce((sum: number, c: any) => sum + Number(c.monthlyAmount || 0), 0) || 0,
              optimalFund: 0,
              minimumFund: 0,
              monthlySavingsRequired: 0,
            };
            fCalc.optimalFund = fCalc.totalMonthlyExpenses * f.targetMonths;
            fCalc.minimumFund = fCalc.totalMonthlyExpenses * f.minimumMonths;
            fCalc.monthlySavingsRequired = f.savingPeriodMonths > 0 ? fCalc.optimalFund / f.savingPeriodMonths : 0;

            return (
              <div key={f.id} onClick={() => setSelectedFund(f)}
                className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant cursor-pointer p-4 transition-all hover:shadow-md ${selectedFund?.id === f.id || (!selectedFund && funds[0]?.id === f.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank size={18} className="text-primary" />
                    <span className="text-sm font-semibold text-on-surface">{f.name}</span>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {(canEdit || canDelete) ? (
                      <ActionButtons
                        onEdit={canEdit ? () => handleEdit(f) : undefined}
                        onDelete={canDelete ? () => setDeleteId(f.id) : undefined}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ) : (
                      <span className="text-xs text-outline">Solo vista</span>
                    )}
                  </div>
                </div>
                {fCalc && (
                  <div className="mt-2 text-xs text-outline">
                    <p>Óptimo: <strong className="text-on-surface">{cfmt(fCalc.optimalFund)}</strong></p>
                    <p>Ahorro: <strong className="text-on-surface">{f.savingPeriodMonths > 0 ? `${cfmt(fCalc.monthlySavingsRequired)}/mes` : '—'}</strong></p>
                  </div>
                )}
              </div>
            );
          })}
          {funds.length === 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant text-center text-outline py-8 text-sm">
              Sin calculadoras aún
            </div>
          )}
        </div>

        {/* Fund detail */}
        <div className="lg:col-span-3">
          {fund && calc ? (
            <>
              {/* Results - Like Excel */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant mb-6">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <h2 className="text-lg font-semibold text-on-surface">💰 Calcula tu Fondo de Emergencia</h2>
                  <p className="font-body-default text-on-surface-variant">¡Empieza aquí!</p>
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

                  {/* Months Display */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-on-surface mb-2">¿En cuántos meses lo harás?</label>
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg">
                      <span className="text-lg font-bold text-primary">{fund.savingPeriodMonths}</span>
                      <span className="text-sm text-on-surface-variant">meses</span>
                    </div>
                    <p className="text-xs text-outline mt-1">Editá el valor desde el panel lateral</p>
                  </div>

                  {/* Results Display */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <p className="text-sm text-green-700 dark:text-green-400">🏆 Monto óptimo ({fund.targetMonths} meses)</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{cfmt(optimalFund)}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <p className="text-sm text-orange-700 dark:text-orange-400">🎯 Monto mínimo ({fund.minimumMonths} meses)</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{cfmt(minimumFund)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-400">📅 Ahorro mensual mínimo</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{fund.savingPeriodMonths > 0 ? cfmt(monthlySavingsRequired) : '—'}</p>
                    </div>
                  </div>

                  {/* Current balance input */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
                    <label className="block text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Lo que tenés ahorrado actualmente
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input flex-1"
                        value={currentBalance}
                        onChange={e => setCurrentBalance(Number(e.target.value))}
                        placeholder="0.00"
                      />
                      <button
                        type="button"
                        onClick={() => fund && updateBalanceMut.mutate({ id: fund.id, balance: currentBalance })}
                        disabled={updateBalanceMut.isLoading}
                        className="btn-primary px-4 whitespace-nowrap"
                      >
                        {updateBalanceMut.isLoading ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    {totalMonthlyExpenses > 0 && (
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        Cobertura actual:{' '}
                        <strong>{(currentBalance / totalMonthlyExpenses).toFixed(1)} meses</strong>
                        {' '}(meta: {fund.targetMonths} meses)
                      </p>
                    )}
                  </div>

                  {coverage && (
                    <div className={`rounded-xl p-4 border mb-6 ${coverage.status === 'safe' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' : coverage.status === 'low' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'}`}>
                      <p className="font-semibold text-sm">Cobertura: {coverage.monthsCovered.toFixed(1)} meses</p>
                      <p className="text-xs text-on-surface-variant mt-1">Meta: 6 meses | Gastos promedio: {cfmt(coverage.monthlyExpenses)}/mes</p>
                      <div className="mt-2 h-2 bg-surface-container rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${Math.min(100, (coverage.monthsCovered / 6) * 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Categories Table - Like Excel */}
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
                      <h3 className="font-semibold text-on-surface">Tus gastos mensuales por categoría</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container-low border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant uppercase">Categoría</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Monto mensual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {fund.categories?.map((cat: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-gray">
                            <td className="px-4 py-3 text-on-surface">{cat.name}</td>
                            <td className="px-4 py-3 text-right font-medium text-on-surface">
                              {Number(cat.monthlyAmount) > 0 ? cfmt(cat.monthlyAmount) : <span className="text-outline">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface-container-low border-t-2 font-semibold">
                        <tr>
                          <td className="px-4 py-3 text-on-surface">TOTAL GASTOS MENSUALES</td>
                          <td className="px-4 py-3 text-right text-on-surface text-base">{cfmt(totalMonthlyExpenses)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex items-center justify-center h-64">
              <div className="text-center">
                <PiggyBank size={40} className="mx-auto mb-3 text-outline" />
                <p className="text-on-surface-variant mb-4">Crea tu primera calculadora de fondo de emergencia</p>
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
          <Input
            label="Nombre"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Meses óptimo"
              type="number"
              min="1"
              value={form.targetMonths}
              onChange={e => setForm({ ...form, targetMonths: Number(e.target.value) })}
            />
            <Input
              label="Meses mínimo"
              type="number"
              min="1"
              value={form.minimumMonths}
              onChange={e => setForm({ ...form, minimumMonths: Number(e.target.value) })}
            />
            <Input
              label="¿En cuántos meses?"
              type="number"
              min="1"
              value={form.savingPeriodMonths}
              onChange={e => setForm({ ...form, savingPeriodMonths: Number(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-on-surface">Gastos mensuales por categoría</label>
              <button type="button" onClick={addCategory} className="text-sm text-primary hover:text-blue-700 font-medium">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-outline-variant rounded-xl p-3">
              {form.categories.map((cat: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="input flex-1 text-sm" placeholder="Categoría" value={cat.name} onChange={e => updateCategory(idx, 'name', e.target.value)} />
                  <input type="number" step="0.01" min="0" className="input w-32 text-sm" placeholder="0.00" value={cat.monthlyAmount} onChange={e => updateCategory(idx, 'monthlyAmount', Number(e.target.value))} />
                  <button type="button" onClick={() => removeCategory(idx)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0 p-1">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold text-on-surface">
              Total: {cfmt(form.categories.reduce((s: number, c: any) => s + (Number(c.monthlyAmount) || 0), 0))}
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
