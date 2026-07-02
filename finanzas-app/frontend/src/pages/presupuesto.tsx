import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { budgetAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Calculator, TrendingUp, TrendingDown, Zap, CreditCard, Bug, Target,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Periodicity = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'fourmonthly' | 'semiannual' | 'annual';

interface IncomeSource { id: string; name: string; type: 'fixed' | 'variable'; amount: number; }
interface Expense { id: string; name: string; amount: number; periodicity: Periodicity; isFixed: boolean; isCreditCard: boolean; isAntExpense: boolean; }
interface Category { id: string; name: string; sortOrder: number; isDefault: boolean; expenses: Expense[]; }
interface BudgetSummary { totalMonthlyIncome: number; totalMonthlyExpenses: number; available: number; savingsTargetAmount: number; antExpensesTotal: number; advisory: 'ok' | 'warning' | 'danger'; alerts?: { overBudget?: boolean; antExpensesWarning?: boolean }; }
interface Budget { id: string; name: string; year: number; savingsTargetPercent: number; incomeSources: IncomeSource[]; categories: Category[]; summary: BudgetSummary; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const getErr = (e: any) => e?.response?.data?.message || e?.message || 'Error';

const PERIODICITY_LABELS: Record<Periodicity, string> = {
  daily:        'Diario',
  weekly:       'Semanal',
  biweekly:     'Quincenal',
  monthly:      'Mensual',
  bimonthly:    'Bimestral',
  quarterly:    'Trimestral',
  fourmonthly:  'Cuatrimestral',
  semiannual:   'Semestral',
  annual:       'Anual',
};

const PERIOD_DIVISOR: Record<Periodicity, number> = {
  daily: 1/30, weekly: 1/4, biweekly: 1/2,
  monthly: 1, bimonthly: 2, quarterly: 3,
  fourmonthly: 4, semiannual: 6, annual: 12,
};

const toMonthly = (amount: number, p: Periodicity) => Number(amount) / PERIOD_DIVISOR[p];

function savingsRating(pct: number): { emoji: string; text: string; color: string } {
  if (pct <= 5)  return { emoji: '⚠️', text: 'Muy bajo. Intentá ahorrar más.',           color: 'text-red-600 dark:text-red-400' };
  if (pct <= 10) return { emoji: '😐', text: 'Aceptable, pero podés mejorar.',            color: 'text-amber-600 dark:text-amber-400' };
  if (pct <= 15) return { emoji: '👍', text: 'Bueno. Seguí así.',                         color: 'text-blue-600 dark:text-blue-400' };
  if (pct <= 25) return { emoji: '💪', text: '¡Ideal! Muy buen hábito de ahorro.',        color: 'text-green-600 dark:text-green-400' };
  return              { emoji: '🏆', text: '¡Excelente! Estás en el top de ahorradores.', color: 'text-emerald-600 dark:text-emerald-400' };
}

const defaultIncomeForm  = { name: '', type: 'fixed' as 'fixed' | 'variable', amount: '' };
const defaultCategoryForm = { name: '' };
const defaultExpenseForm = { name: '', amount: '', periodicity: 'monthly' as Periodicity, isFixed: false, isAntExpense: false, isCreditCard: false };

// ─── CategorySection ──────────────────────────────────────────────────────────
function CategorySection({ category, onRefresh, onDeleteCategory }: { category: Category; onRefresh: () => void; onDeleteCategory: () => void; }) {
  const [open, setOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...defaultExpenseForm });

  const addMut = useMutation((d: any) => budgetAPI.addExpense(category.id, d), {
    onSuccess: () => { toast.success('Gasto agregado'); setShowModal(false); setForm({ ...defaultExpenseForm }); onRefresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const delMut = useMutation((id: string) => budgetAPI.deleteExpense(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteExpense(null); onRefresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const updMut = useMutation(({ id, data }: any) => budgetAPI.updateExpense(id, data), {
    onSuccess: () => onRefresh(),
    onError: (e: any) => { toast.error(getErr(e)); },
  });

  const catTotal = category.expenses.reduce((s, e) => s + toMonthly(e.amount, e.periodicity), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{category.name}</span>
          <span className="text-xs text-gray-400">({category.expenses.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">${fmt(catTotal)}/mes</span>
          <button
            onClick={e => { e.stopPropagation(); setShowModal(true); }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={11} /> Gasto
          </button>
          {!category.isDefault && <button
            onClick={e => { e.stopPropagation(); onDeleteCategory(); }}
            title="Eliminar categoría"
            className="p-1 text-red-300 hover:text-red-600 dark:text-red-600 dark:hover:text-red-400 transition-colors rounded"
            aria-label="Eliminar categoría"
          >
            <Trash2 size={13} />
          </button>}
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto">
          {category.expenses.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-gray-400 dark:text-gray-500">Sin gastos en esta categoría</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Gasto</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Mensual</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Período</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {category.expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{e.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">${fmt(e.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 text-xs">${fmt(toMonthly(e.amount, e.periodicity))}</td>
                    <td className="px-4 py-2.5 text-center">
                      <select
                        value={e.periodicity}
                        onChange={ev => updMut.mutate({ id: e.id, data: { periodicity: ev.target.value } })}
                        className="text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer focus:ring-2 focus:ring-primary-500"
                      >
                        {Object.entries(PERIODICITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {[
                          { flag: 'isFixed',      icon: <Zap size={13} />,        active: e.isFixed,      color: 'blue',   title: 'Fijo' },
                          { flag: 'isCreditCard', icon: <CreditCard size={13} />, active: e.isCreditCard, color: 'purple', title: 'Tarjeta' },
                          { flag: 'isAntExpense', icon: <Bug size={13} />,        active: e.isAntExpense, color: 'amber',  title: 'Hormiga' },
                        ].map(({ flag, icon, active, color, title }) => (
                          <button
                            key={flag}
                            aria-pressed={active}
                            title={title}
                            onClick={() => updMut.mutate({ id: e.id, data: { [flag]: !active } })}
                            className={`p-1 rounded transition-colors ${active ? `text-${color}-600 dark:text-${color}-400 bg-${color}-50 dark:bg-${color}-900/30` : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'}`}
                          >{icon}</button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => setDeleteExpense(e)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Total mensual</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800 dark:text-gray-200">${fmt(catTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Agregar gasto — ${category.name}`}>
        <form onSubmit={ev => { ev.preventDefault(); addMut.mutate({ ...form, amount: parseFloat(form.amount as string) }); }} className="space-y-4">
          <div>
            <label className="label">Nombre del gasto</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Netflix, Supermercado..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto</label>
              <input type="number" step="0.01" min="0" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Periodicidad</label>
              <select className="input" value={form.periodicity} onChange={e => setForm({ ...form, periodicity: e.target.value as Periodicity })}>
                {Object.entries(PERIODICITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'isFixed',      label: 'Fijo',    icon: <Zap size={13} />,        color: 'blue' },
              { key: 'isCreditCard', label: 'Tarjeta', icon: <CreditCard size={13} />, color: 'purple' },
              { key: 'isAntExpense', label: '🐜 Hormiga', icon: null,                  color: 'amber' },
            ] as const).map(({ key, label, icon, color }) => (
              <button key={key} type="button" onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  (form as any)[key]
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >{icon}{label}</button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addMut.isLoading} className="btn-primary">{addMut.isLoading ? 'Guardando...' : 'Agregar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteExpense} onClose={() => setDeleteExpense(null)} onConfirm={() => delMut.mutate(deleteExpense!.id)} loading={delMut.isLoading} title={`¿Eliminar "${deleteExpense?.name}"?`} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PresupuestoPage() {
  const qc = useQueryClient();
  const [showBudgetModal, setShowBudgetModal]   = useState(false);
  const [showIncomeModal, setShowIncomeModal]   = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [deleteIncomeId, setDeleteIncomeId]     = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm]             = useState({ name: '', year: new Date().getFullYear(), savingsTargetPercent: 20 });
  const [incomeForm, setIncomeForm]             = useState({ ...defaultIncomeForm });
  const [categoryForm, setCategoryForm]         = useState({ ...defaultCategoryForm });

  const { data: budgets = [], isLoading } = useQuery<Budget[]>('budgets', () => budgetAPI.getAll().then(r => r.data), { staleTime: 0 });
  const activeBudgetId = (budgets as Budget[])[0]?.id ?? null;

  const { data: budget, isLoading: loadingBudget, refetch: refetchBudget } = useQuery<Budget>(
    ['budget', activeBudgetId],
    () => budgetAPI.getOne(activeBudgetId!).then(r => r.data),
    { enabled: !!activeBudgetId, staleTime: 0 },
  );

  const refresh = () => { qc.invalidateQueries(['budget', activeBudgetId]); qc.invalidateQueries('budgets'); };

  const createBudgetMut = useMutation((d: any) => budgetAPI.create(d), {
    onSuccess: () => { toast.success('Presupuesto creado'); setShowBudgetModal(false); setBudgetForm({ name: '', year: new Date().getFullYear(), savingsTargetPercent: 20 }); qc.invalidateQueries('budgets'); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const addIncomeMut = useMutation((d: any) => budgetAPI.addIncome(activeBudgetId!, d), {
    onSuccess: () => { toast.success('Ingreso agregado'); setShowIncomeModal(false); setIncomeForm({ ...defaultIncomeForm }); refresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const delIncomeMut = useMutation((id: string) => budgetAPI.deleteIncome(id), {
    onSuccess: () => { toast.success('Ingreso eliminado'); setDeleteIncomeId(null); refresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const addCategoryMut = useMutation((d: any) => budgetAPI.addCategory(activeBudgetId!, d), {
    onSuccess: () => { toast.success('Categoría agregada'); setShowCategoryModal(false); setCategoryForm({ name: '' }); refresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const delCategoryMut = useMutation((id: string) => budgetAPI.deleteCategory(id), {
    onSuccess: () => { toast.success('Categoría eliminada'); setDeleteCategoryId(null); refresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });

  if (isLoading || (activeBudgetId && loadingBudget)) {
    return <Layout><div className="space-y-4"><div className="skeleton h-8 w-56" /><div className="skeleton h-40 w-full" /><div className="skeleton h-64 w-full" /></div></Layout>;
  }

  if (!activeBudgetId || !budget) {
    return (
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧮 Presupuesto</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Planificá tus ingresos y gastos mensuales</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center max-w-md w-full">
            <Calculator size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tenés un presupuesto creado</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Creá tu presupuesto para empezar a planificar tus finanzas del hogar.</p>
            <button onClick={() => setShowBudgetModal(true)} className="btn-primary flex items-center gap-2 mx-auto"><Plus size={18} /> Crear presupuesto</button>
          </div>
        </div>
        <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Nuevo presupuesto">
          <form onSubmit={e => { e.preventDefault(); createBudgetMut.mutate(budgetForm); }} className="space-y-4">
            <div><label className="label">Nombre</label><input className="input" value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} placeholder="Mi Presupuesto 2026" required /></div>
            <div><label className="label">Año</label><input type="number" className="input" value={budgetForm.year} onChange={e => setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) })} required /></div>
            <div>
              <label className="label">Meta de ahorro — {budgetForm.savingsTargetPercent}%</label>
              <input type="range" min="0" max="50" step="1" value={budgetForm.savingsTargetPercent} onChange={e => setBudgetForm({ ...budgetForm, savingsTargetPercent: parseInt(e.target.value) })} className="w-full accent-primary-600" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowBudgetModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={createBudgetMut.isLoading} className="btn-primary">{createBudgetMut.isLoading ? 'Creando...' : 'Crear presupuesto'}</button>
            </div>
          </form>
        </Modal>
      </Layout>
    );
  }

  const { summary, incomeSources, categories } = budget;
  const totalAnualIngresos   = summary.totalMonthlyIncome * 12;
  const totalAnualGastos     = summary.totalMonthlyExpenses * 12;
  const disponibleAnual      = totalAnualIngresos - totalAnualGastos;
  const savingsMonthly       = summary.savingsTargetAmount;
  const antPerDay            = summary.antExpensesTotal > 0 ? summary.antExpensesTotal / 30 : 0;
  const rating               = savingsRating(budget.savingsTargetPercent);

  const ingresosFijos     = incomeSources.filter(i => i.type === 'fixed').reduce((s, i) => s + Number(i.amount), 0);
  const ingresosVariables = incomeSources.filter(i => i.type === 'variable').reduce((s, i) => s + Number(i.amount), 0);
  const gastosFijos       = categories.flatMap(c => c.expenses).filter(e => e.isFixed).reduce((s, e) => s + toMonthly(e.amount, e.periodicity), 0);
  const gastosVariables   = summary.totalMonthlyExpenses - gastosFijos;

  const advisoryBanner = {
    ok:      { bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',  text: 'text-green-800 dark:text-green-300',  msg: '✅ ¡Felicidades! Podés alcanzar tus metas de ahorro.' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',  text: 'text-amber-800 dark:text-amber-300',  msg: `⚠️ Cuidado — no alcanzás tu meta de ahorro del ${budget.savingsTargetPercent}%.` },
    danger:  { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',          text: 'text-red-800 dark:text-red-300',      msg: '❌ Tus gastos superan tus ingresos.' },
  }[summary.advisory];

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧮 {budget.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Año {budget.year} · Meta de ahorro: {budget.savingsTargetPercent}%</p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Ingresos/mes',     icon: <TrendingUp size={16} />,  value: `$${fmt(summary.totalMonthlyIncome)}`,   color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Gastos/mes',       icon: <TrendingDown size={16} />, value: `$${fmt(summary.totalMonthlyExpenses)}`, color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Disponible/mes',   icon: <Calculator size={16} />,  value: `$${fmt(Math.abs(summary.available))}`,  color: summary.available >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: 'bg-gray-50 dark:bg-gray-700' },
          { label: 'Meta de ahorro',   icon: <Target size={16} />,       value: `$${fmt(savingsMonthly)}`,              color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400">{k.icon}<span className="text-xs font-medium">{k.label}</span></div>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Advisory ── */}
      <div className={`border rounded-xl px-4 py-3 mb-4 ${advisoryBanner.bg}`}>
        <p className={`text-sm font-medium ${advisoryBanner.text}`}>{advisoryBanner.msg}</p>
      </div>

      {/* ── Budget alert banners ── */}
      {(summary.alerts?.overBudget || summary.available < 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <span className="text-red-600 font-medium text-sm">Tus gastos superan tus ingresos este mes</span>
        </div>
      )}
      {(summary.alerts?.antExpensesWarning || (summary.antExpensesTotal > 0 && summary.totalMonthlyIncome > 0 && summary.antExpensesTotal / summary.totalMonthlyIncome > 0.15)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 mb-6">
          <span className="text-amber-700 text-sm">Los gastos hormiga superan el 15% de tus ingresos</span>
        </div>
      )}

      {/* ── TOP SECTION: Ingresos + Gastos Hormiga (lado a lado) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

        {/* LEFT: Tabla de Ingresos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
            <h2 className="text-sm font-semibold text-green-900 dark:text-green-300">💰 Ingresos Promedio Mensuales</h2>
            <button onClick={() => setShowIncomeModal(true)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <Plus size={11} /> Agregar
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fuente</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Monto/mes</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Anual</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {incomeSources.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Sin ingresos registrados</td></tr>
              ) : (
                incomeSources.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{inc.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${inc.type === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                        {inc.type === 'fixed' ? 'Fijo' : 'Variable'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">${fmt(inc.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-400 dark:text-gray-500">${fmt(Number(inc.amount) * 12)}</td>
                    <td className="px-2 py-2.5 text-center">
                      <button onClick={() => setDeleteIncomeId(inc.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-green-50 dark:bg-green-900/20 border-t-2 border-green-200 dark:border-green-800">
              <tr>
                <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white text-sm" colSpan={2}>Total ingresos</td>
                <td className="px-4 py-2.5 text-right font-bold text-green-600 dark:text-green-400">${fmt(summary.totalMonthlyIncome)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-green-600 dark:text-green-400 text-xs">${fmt(totalAnualIngresos)}</td>
                <td />
              </tr>
              <tr className="text-xs text-gray-500 dark:text-gray-400">
                <td className="px-4 py-1.5" colSpan={2}>Fijo: ${fmt(ingresosFijos)} · Variable: ${fmt(ingresosVariables)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* RIGHT: Gastos Hormiga + Meta ahorro */}
        <div className="space-y-4">
          {/* Gastos hormiga box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
              🐜 Gastos Hormiga
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Presupuesto al mes</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">${fmt(summary.antExpensesTotal)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Máximo por día</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">${fmt(antPerDay)}</p>
              </div>
            </div>
            {summary.antExpensesTotal > 0 ? (
              <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
                summary.available >= savingsMonthly
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {summary.available >= savingsMonthly
                  ? '👏 Bien, podés lograr tus metas de ahorro.'
                  : '⚠️ Considerá recortar estos gastos para alcanzar tu meta.'}
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center py-2">Sin gastos hormiga marcados. Usá el ícono 🐜 en cada gasto.</p>
            )}
          </div>

          {/* Meta de ahorro */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">🎯 Meta de Ahorro</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">¿Qué % querés ahorrar?</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300 w-12 text-right">{budget.savingsTargetPercent}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Meta mensual</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${fmt(savingsMonthly)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Meta anual</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${fmt(savingsMonthly * 12)}</p>
              </div>
            </div>
            <div className={`text-xs font-medium px-3 py-2 rounded-lg ${rating.color} bg-white dark:bg-gray-800`}>
              {rating.emoji} {rating.text}
            </div>
          </div>

          {/* Resumen anual */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📅 Proyección Anual</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Ingresos anuales</span>
                <span className="font-semibold text-green-600 dark:text-green-400">${fmt(totalAnualIngresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Gastos anuales</span>
                <span className="font-semibold text-red-600 dark:text-red-400">${fmt(totalAnualGastos)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                <span className="text-gray-900 dark:text-white">Disponible anual</span>
                <span className={disponibleAnual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  ${fmt(Math.abs(disponibleAnual))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>Gastos fijos: ${fmt(gastosFijos)} · Variables: ${fmt(gastosVariables)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expenses by category ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">💸 Detalle de Gastos por Categoría</h2>
        <button onClick={() => setShowCategoryModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Plus size={12} /> Nueva categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Sin categorías de gastos. Agregá una para empezar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <CategorySection
              key={cat.id}
              category={cat}
              onRefresh={refresh}
              onDeleteCategory={() => setDeleteCategoryId(cat.id)}
            />
          ))}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-red-900 dark:text-red-300">Total gastos mensuales</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">${fmt(summary.totalMonthlyExpenses)}</span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={showIncomeModal} onClose={() => { setShowIncomeModal(false); setIncomeForm({ ...defaultIncomeForm }); }} title="Agregar fuente de ingreso">
        <form onSubmit={e => { e.preventDefault(); addIncomeMut.mutate({ ...incomeForm, amount: parseFloat(incomeForm.amount as string) }); }} className="space-y-4">
          <div><label className="label">Nombre</label><input className="input" value={incomeForm.name} onChange={e => setIncomeForm({ ...incomeForm, name: e.target.value })} placeholder="Sueldo, Freelance..." required /></div>
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              {([{ v: 'fixed', l: '🔵 Fijo' }, { v: 'variable', l: '🟠 Variable' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => setIncomeForm({ ...incomeForm, type: v })}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${incomeForm.type === v ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                >{l}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Monto mensual</label><input type="number" step="0.01" min="0" className="input" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} placeholder="0.00" required /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowIncomeModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addIncomeMut.isLoading} className="btn-primary">{addIncomeMut.isLoading ? 'Guardando...' : 'Agregar ingreso'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setCategoryForm({ name: '' }); }} title="Nueva categoría de gastos">
        <form onSubmit={e => { e.preventDefault(); addCategoryMut.mutate(categoryForm); }} className="space-y-4">
          <div><label className="label">Nombre</label><input className="input" value={categoryForm.name} onChange={e => setCategoryForm({ name: e.target.value })} placeholder="🏡 Casa, 🚗 Transporte..." required /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addCategoryMut.isLoading} className="btn-primary">{addCategoryMut.isLoading ? 'Creando...' : 'Crear categoría'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteIncomeId} onClose={() => setDeleteIncomeId(null)} onConfirm={() => delIncomeMut.mutate(deleteIncomeId!)} loading={delIncomeMut.isLoading} title="¿Eliminar ingreso?" message={`Se eliminará "${incomeSources.find(i => i.id === deleteIncomeId)?.name ?? ''}". Esta acción no se puede deshacer.`} />
      <ConfirmDialog isOpen={!!deleteCategoryId} onClose={() => setDeleteCategoryId(null)} onConfirm={() => delCategoryMut.mutate(deleteCategoryId!)} loading={delCategoryMut.isLoading} title="¿Eliminar categoría?" message="Se eliminarán todos los gastos de esta categoría. Esta acción no se puede deshacer." />
    </Layout>
  );
}
