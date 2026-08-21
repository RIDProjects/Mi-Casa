import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { budgetAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Calculator, TrendingUp, TrendingDown, CreditCard, Bug, Pencil,
  Lock, BrainCircuit,
} from 'lucide-react';
import { fmt } from '../lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────
type Periodicity = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'fourmonthly' | 'semiannual' | 'annual';
type BudgetRule = '50-30-20' | '70-20-10';
interface BudgetPlan {
  rule: BudgetRule;
  fiTarget: number;
  minMonthlyInvestment: number;
  emergencyFundTarget: number;
  entertainmentBudget: number;
  fixedExpensesCap: number;
}

interface IncomeSource { id: string; name: string; type: string; amount: number; }
interface Expense { id: string; name: string; amount: number; periodicity: Periodicity; isFixed: boolean; isCreditCard: boolean; isAntExpense: boolean; }
interface Category { id: string; name: string; sortOrder: number; isDefault: boolean; expenses: Expense[]; }
interface BudgetSummary { totalMonthlyIncome: number; totalMonthlyExpenses: number; available: number; savingsTargetAmount: number; antExpensesTotal: number; advisory: 'ok' | 'warning' | 'danger'; alerts?: { overBudget?: boolean; antExpensesWarning?: boolean }; plan: BudgetPlan | null; }
interface Budget { id: string; name: string; year: number; savingsTargetPercent: number; rule: BudgetRule; incomeSources: IncomeSource[]; categories: Category[]; summary: BudgetSummary; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (pct <= 5)  return { emoji: '⚠️', text: 'Muy bajo. Intentá ahorrar más.',           color: 'text-danger' };
  if (pct <= 10) return { emoji: '😐', text: 'Aceptable, pero podés mejorar.',            color: 'text-warning' };
  if (pct <= 15) return { emoji: '👍', text: 'Bueno. Seguí así.',                         color: 'text-primary' };
  if (pct <= 25) return { emoji: '💪', text: '¡Ideal! Muy buen hábito de ahorro.',        color: 'text-success' };
  return              { emoji: '🏆', text: '¡Excelente! Estás en el top de ahorradores.', color: 'text-success' };
}

const INCOME_TYPE_LABELS: Record<string, string> = {
  salary:     'Salario',
  investment: 'Inversiones',
  business:   'Negocio / Emprendimiento',
  rental:     'Alquiler',
  freelance:  'Freelance / Independiente',
  extras:     'Ingresos extras',
  other:      'Otro',
  // backward compatibility
  fixed: 'Fijo',
  variable: 'Variable',
  salario_estatal: 'Salario',
  tcp: 'Freelance / Independiente',
  remesas: 'Ingresos extras',
  mipyme: 'Negocio / Emprendimiento',
};

const defaultIncomeForm  = { name: '', type: 'salary', amount: '' };
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
    <div className="bg-surface-container-lowest rounded-xl border border-border-light overflow-hidden">
      {/* Category header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-surface-gray border-b border-outline-variant cursor-pointer hover:bg-surface-container transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronDown size={15} className="text-on-surface-variant" />
            : <ChevronRight size={15} className="text-on-surface-variant" />
          }
          <span className="font-section-title text-section-title text-on-surface">{category.name}</span>
          <span className="font-body-small text-body-small text-outline">({category.expenses.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-card-title text-card-title text-on-surface-variant">${fmt(catTotal)}/mes</span>
          <button
            onClick={e => { e.stopPropagation(); setShowModal(true); }}
            className="flex items-center gap-1 px-2.5 py-1 text-primary font-label-upper text-label-upper border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Plus size={11} /> Gasto
          </button>
          {!category.isDefault && (
            <button
              onClick={e => { e.stopPropagation(); onDeleteCategory(); }}
              title="Eliminar categoría"
              className="p-1 text-outline hover:text-danger transition-colors rounded"
              aria-label="Eliminar categoría"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto">
          {category.expenses.length === 0 ? (
            <p className="px-4 py-8 text-center font-body-small text-body-small text-outline">
              Sin gastos en esta categoría
            </p>
          ) : (
            <table className="w-full text-left font-body-default">
              <thead>
                <tr className="font-label-upper text-label-upper text-on-surface-variant bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-3">Gasto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">Mensual</th>
                  <th className="px-4 py-3 text-center">Período</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {category.expenses.map(e => (
                  <tr key={e.id} className="hover:bg-surface-gray transition-colors">
                    <td className="px-6 py-3 font-body-default text-on-surface">{e.name}</td>
                    <td className="px-4 py-3 text-right font-body-default text-on-surface">${fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-right font-body-small text-on-surface-variant">${fmt(toMonthly(e.amount, e.periodicity))}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={e.periodicity}
                        onChange={ev => updMut.mutate({ id: e.id, data: { periodicity: ev.target.value } })}
                        className="font-body-small text-body-small bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      >
                        {Object.entries(PERIODICITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Fijo badge */}
                        <button
                          aria-pressed={e.isFixed}
                          title="Fijo"
                          onClick={() => updMut.mutate({ id: e.id, data: { isFixed: !e.isFixed } })}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-label-upper text-label-upper transition-colors ${
                            e.isFixed
                              ? 'bg-primary-fixed text-on-primary-fixed-variant'
                              : 'bg-surface-container text-outline hover:bg-surface-container-low'
                          }`}
                        >
                          <Lock size={10} />
                          {e.isFixed && <span>Fijo</span>}
                        </button>
                        {/* Tarjeta badge */}
                        <button
                          aria-pressed={e.isCreditCard}
                          title="Tarjeta"
                          onClick={() => updMut.mutate({ id: e.id, data: { isCreditCard: !e.isCreditCard } })}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-label-upper text-label-upper transition-colors ${
                            e.isCreditCard
                              ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                              : 'bg-surface-container text-outline hover:bg-surface-container-low'
                          }`}
                        >
                          <CreditCard size={10} />
                          {e.isCreditCard && <span>Tarjeta</span>}
                        </button>
                        {/* Hormiga badge */}
                        <button
                          aria-pressed={e.isAntExpense}
                          title="Hormiga"
                          onClick={() => updMut.mutate({ id: e.id, data: { isAntExpense: !e.isAntExpense } })}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-label-upper text-label-upper transition-colors ${
                            e.isAntExpense
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container text-outline hover:bg-surface-container-low'
                          }`}
                        >
                          <Bug size={10} />
                          {e.isAntExpense && <span>Hormiga</span>}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDeleteExpense(e)}
                        className="text-outline hover:text-danger p-1 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low font-bold border-t border-outline-variant">
                  <td colSpan={2} className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant uppercase">Total mensual</td>
                  <td className="px-4 py-3 text-right font-card-title text-card-title text-on-surface">${fmt(catTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Add expense modal */}
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
              { key: 'isFixed',      label: 'Fijo',       icon: <Lock size={13} />,        color: 'blue' },
              { key: 'isCreditCard', label: 'Tarjeta',    icon: <CreditCard size={13} />,  color: 'purple' },
              { key: 'isAntExpense', label: 'Hormiga',    icon: <Bug size={13} />,          color: 'amber' },
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
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsTargetEdit, setSavingsTargetEdit] = useState(20);

  const { data: budgets = [], isLoading } = useQuery<Budget[]>('budgets', () => budgetAPI.getAll().then(r => r.data), { staleTime: 0 });
  const activeBudgetId = (budgets as Budget[])[0]?.id ?? null;

  const { data: budget, isLoading: loadingBudget } = useQuery<Budget>(
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
  const updateSavingsMut = useMutation((pct: number) => budgetAPI.update(activeBudgetId!, { savingsTargetPercent: pct }), {
    onSuccess: () => { toast.success('Meta de ahorro actualizada'); setShowSavingsModal(false); refresh(); },
    onError: (e: any) => { toast.error(getErr(e)); },
  });
  const updateRuleMut = useMutation(
    (rule: BudgetRule) => budgetAPI.update(activeBudgetId!, {
      rule,
      savingsTargetPercent: rule === '50-30-20' ? 20 : 10,
    }),
    {
      onSuccess: () => { toast.success('Regla actualizada'); refresh(); },
      onError: (e: any) => { toast.error(getErr(e)); },
    },
  );
  const syncFiMut = useMutation(
    () => budgetAPI.syncFiGoal(activeBudgetId!),
    {
      onSuccess: () => {
        toast.success('Meta FI sincronizada');
        qc.invalidateQueries('savings-goals');
      },
      onError: (e: any) => { toast.error(getErr(e)); },
    },
  );

  if (isLoading || (activeBudgetId && loadingBudget)) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!activeBudgetId || !budget) {
    return (
      <Layout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface">Presupuesto</h1>
            <p className="font-body-default text-body-default text-on-surface-variant mt-1">Planificá tus ingresos y gastos mensuales</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-surface-container-lowest rounded-2xl border border-border-light p-10 text-center max-w-md w-full">
            <Calculator size={48} className="mx-auto text-outline mb-4" />
            <h2 className="font-section-title text-section-title text-on-surface mb-2">No tenés un presupuesto creado</h2>
            <p className="font-body-default text-body-default text-on-surface-variant mb-6">Creá tu presupuesto para empezar a planificar tus finanzas del hogar.</p>
            <button onClick={() => setShowBudgetModal(true)} className="btn-primary flex items-center gap-2 mx-auto">
              <Plus size={18} /> Crear presupuesto
            </button>
          </div>
        </div>
        <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Nuevo presupuesto">
          <form onSubmit={e => { e.preventDefault(); createBudgetMut.mutate(budgetForm); }} className="space-y-4">
            <div><label className="label">Nombre</label><input className="input" value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} placeholder="Mi Presupuesto 2026" required /></div>
            <div><label className="label">Año</label><input type="number" className="input" value={budgetForm.year} onChange={e => setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) })} required /></div>
            <div>
              <label className="label">Meta de ahorro — {budgetForm.savingsTargetPercent}%</label>
              <input type="range" min="0" max="50" step="1" value={budgetForm.savingsTargetPercent} onChange={e => setBudgetForm({ ...budgetForm, savingsTargetPercent: parseInt(e.target.value) })} className="w-full accent-primary" />
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

  const gastosFijos       = categories.flatMap(c => c.expenses).filter(e => e.isFixed).reduce((s, e) => s + toMonthly(e.amount, e.periodicity), 0);
  const gastosVariables   = summary.totalMonthlyExpenses - gastosFijos;

  const advisoryBanner = {
    ok:      { cls: 'bg-surface-container border border-success/30 text-success',  msg: '¡Felicidades! Podés alcanzar tus metas de ahorro.' },
    warning: { cls: 'bg-surface-container border border-warning/30 text-warning',  msg: `Cuidado — no alcanzás tu meta de ahorro del ${budget.savingsTargetPercent}%.` },
    danger:  { cls: 'bg-surface-container border border-danger/30 text-danger',    msg: 'Tus gastos superan tus ingresos.' },
  }[summary.advisory];

  // Budget health score (0-100) based on advisory + savings pct
  const healthScore = summary.advisory === 'ok'
    ? Math.min(100, 60 + budget.savingsTargetPercent * 2)
    : summary.advisory === 'warning'
    ? Math.min(59, 40 + budget.savingsTargetPercent)
    : Math.min(39, budget.savingsTargetPercent * 2);

  const advisoryLabel = summary.advisory === 'ok'
    ? 'Realista & Saludable'
    : summary.advisory === 'warning'
    ? 'Necesita Atención'
    : 'En Riesgo';

  const advisoryLabelColor = summary.advisory === 'ok'
    ? 'text-success'
    : summary.advisory === 'warning'
    ? 'text-warning'
    : 'text-danger';

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface">{budget.name}</h1>
          <p className="font-body-default text-body-default text-on-surface-variant mt-1">
            Año {budget.year} · Meta de ahorro: {budget.savingsTargetPercent}%
          </p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-lowest border border-border-light rounded-xl p-4">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">INGRESOS/MES</p>
          <p className="font-section-title text-[22px] text-success">${fmt(summary.totalMonthlyIncome)}</p>
        </div>
        <div className="bg-surface-container-lowest border border-border-light rounded-xl p-4">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">GASTOS/MES</p>
          <p className="font-section-title text-[22px] text-danger">${fmt(summary.totalMonthlyExpenses)}</p>
        </div>
        <div className="bg-surface-container-lowest border border-border-light rounded-xl p-4">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">DISPONIBLE/MES</p>
          <p className={`font-section-title text-[22px] ${summary.available >= 0 ? 'text-success' : 'text-danger'}`}>
            ${fmt(Math.abs(summary.available))}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-border-light rounded-xl p-4">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">META DE AHORRO</p>
          <p className="font-section-title text-[22px] text-primary">${fmt(savingsMonthly)}</p>
        </div>
      </div>

      {/* ── Advisory banner ── */}
      <div className={`rounded-xl px-4 py-3 mb-4 font-body-default ${advisoryBanner.cls}`}>
        <p className="font-body-default">{advisoryBanner.msg}</p>
      </div>

      {/* ── Budget alert banners ── */}
      {(summary.alerts?.overBudget || summary.available < 0) && (
        <div className="bg-surface-container border border-danger/30 text-danger rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <span className="font-body-default">Tus gastos superan tus ingresos este mes</span>
        </div>
      )}
      {(summary.alerts?.antExpensesWarning || (summary.antExpensesTotal > 0 && summary.totalMonthlyIncome > 0 && summary.antExpensesTotal / summary.totalMonthlyIncome > 0.15)) && (
        <div className="bg-surface-container border border-warning/30 text-warning rounded-xl px-4 py-3 flex items-center gap-2 mb-6">
          <span className="font-body-default">Los gastos hormiga superan el 15% de tus ingresos</span>
        </div>
      )}

      {/* ── TOP SECTION: Ingresos + Right panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* LEFT (2 cols): Tabla de Ingresos */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-xl border border-border-light overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-gray">
            <h3 className="font-section-title text-section-title text-on-surface">Ingresos Promedio Mensuales</h3>
            <button
              onClick={() => setShowIncomeModal(true)}
              className="flex items-center gap-1 text-primary font-label-upper text-label-upper hover:underline"
            >
              <Plus size={12} /> Agregar
            </button>
          </div>
          <table className="w-full text-left font-body-default">
            <thead>
              <tr className="font-label-upper text-label-upper text-on-surface-variant bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-3">Fuente</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-right">Monto/mes</th>
                <th className="px-4 py-3 text-right">Anual</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {incomeSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center font-body-default text-outline">
                    Sin ingresos registrados
                  </td>
                </tr>
              ) : (
                incomeSources.map(inc => (
                  <tr key={inc.id} className="hover:bg-surface-gray transition-colors">
                    <td className="px-6 py-3 font-body-default text-on-surface">{inc.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-label-upper text-label-upper bg-primary-fixed text-on-primary-fixed-variant">
                        {INCOME_TYPE_LABELS[inc.type] ?? inc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-card-title text-card-title text-success">${fmt(inc.amount)}</td>
                    <td className="px-4 py-3 text-right font-body-small text-body-small text-on-surface-variant">${fmt(Number(inc.amount) * 12)}</td>
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => setDeleteIncomeId(inc.id)} className="text-outline hover:text-danger p-1 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-low font-bold border-t-2 border-outline-variant">
                <td className="px-6 py-3 font-card-title text-card-title text-on-surface" colSpan={2}>Total ingresos</td>
                <td className="px-4 py-3 text-right font-card-title text-card-title text-success">${fmt(summary.totalMonthlyIncome)}</td>
                <td className="px-4 py-3 text-right font-body-small text-body-small text-success">${fmt(totalAnualIngresos)}</td>
                <td />
              </tr>
              <tr>
                <td className="px-6 py-2 font-caption text-caption text-outline" colSpan={5}>
                  {incomeSources.length} fuente{incomeSources.length !== 1 ? 's' : ''} de ingreso
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* RIGHT (1 col): Meta de Ahorro + Budget Advisory AI */}
        <div className="space-y-4">
          {/* Meta de ahorro card */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-border-light">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-card-title text-card-title text-on-surface">Meta de Ahorro</h3>
              <button
                onClick={() => { setSavingsTargetEdit(budget.savingsTargetPercent); setShowSavingsModal(true); }}
                className="p-1.5 bg-primary-fixed text-on-primary-fixed-variant rounded-full hover:opacity-80 transition-opacity"
              >
                <Pencil size={13} />
              </button>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-hero-title text-[48px] leading-none text-primary">{budget.savingsTargetPercent}%</span>
              <span className="font-body-default text-on-surface-variant mb-1">del ingreso total</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">META MENSUAL</p>
                <p className="font-card-title text-card-title text-primary">${fmt(savingsMonthly)}</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">META ANUAL</p>
                <p className="font-card-title text-card-title text-primary">${fmt(savingsMonthly * 12)}</p>
              </div>
            </div>
            <p className={`mt-3 font-body-small text-body-small ${rating.color}`}>
              {rating.emoji} {rating.text}
            </p>
          </div>

          {/* Budget Advisory AI dark card */}
          <div className="bg-advisory-bg p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit size={14} className="text-advisory-text-dim" />
              <span className="font-label-upper text-label-upper text-advisory-text-dim">BUDGET ADVISORY AI</span>
            </div>
            <h4 className="font-section-title text-[18px] text-advisory-text mb-2 leading-snug">
              Tu presupuesto es:{' '}
              <span className={advisoryLabelColor}>{advisoryLabel}</span>
            </h4>
            <p className="font-body-small text-body-small text-advisory-text-dim mb-4">
              {advisoryBanner.msg}
            </p>
            <div className="bg-advisory-text/10 rounded-lg p-4 border border-advisory-text/15">
              <p className="font-label-upper text-label-upper text-advisory-text-dim/70 uppercase text-center mb-1">Score de Salud</p>
              <p className="font-formula-code text-advisory-text text-[32px] text-center">{healthScore} / 100</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION: Gastos Hormiga + Proyección Anual ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Gastos Hormiga */}
        <div className="bg-surface-container-lowest rounded-xl border border-border-light overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-gray flex justify-between items-center">
            <h3 className="font-section-title text-section-title text-on-surface">Gastos Hormiga</h3>
            <span className="px-2.5 py-1 bg-error-container text-on-error-container rounded-full font-label-upper text-label-upper">
              <Bug size={10} className="inline mr-1" />HORMIGA
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">AL MES</p>
                <p className="font-card-title text-[20px] text-warning">${fmt(summary.antExpensesTotal)}</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">MÁX. POR DÍA</p>
                <p className="font-card-title text-[20px] text-warning">${fmt(antPerDay)}</p>
              </div>
            </div>
            {summary.antExpensesTotal > 0 ? (
              <div className={`font-body-small text-body-small px-3 py-2 rounded-lg border ${
                summary.available >= savingsMonthly
                  ? 'bg-surface-container border-success/30 text-success'
                  : 'bg-surface-container border-danger/30 text-danger'
              }`}>
                {summary.available >= savingsMonthly
                  ? 'Bien, podés lograr tus metas de ahorro.'
                  : 'Considerá recortar estos gastos para alcanzar tu meta.'}
              </div>
            ) : (
              <p className="font-body-small text-body-small text-outline text-center py-3">
                Sin gastos hormiga marcados. Usá el ícono de insecto en cada gasto.
              </p>
            )}
          </div>
        </div>

        {/* Proyección Anual */}
        <div className="bg-surface-container-lowest rounded-xl border border-border-light overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-gray">
            <h3 className="font-section-title text-section-title text-on-surface">Proyección Anual</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-success" />
                <span className="font-body-default text-on-surface-variant">Ingresos anuales</span>
              </div>
              <span className="font-card-title text-card-title text-success">${fmt(totalAnualIngresos)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-danger" />
                <span className="font-body-default text-on-surface-variant">Gastos anuales</span>
              </div>
              <span className="font-card-title text-card-title text-danger">${fmt(totalAnualGastos)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant">
              <span className="font-body-default text-on-surface font-semibold">Disponible anual</span>
              <span className={`font-card-title text-card-title ${disponibleAnual >= 0 ? 'text-success' : 'text-danger'}`}>
                ${fmt(Math.abs(disponibleAnual))}
              </span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between font-body-small text-body-small text-on-surface-variant mb-1">
                <span>Gastos fijos</span>
                <span>${fmt(gastosFijos)}</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: summary.totalMonthlyExpenses > 0 ? `${Math.min(100, (gastosFijos / summary.totalMonthlyExpenses) * 100)}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between font-body-small text-body-small text-on-surface-variant mb-1">
                <span>Gastos variables</span>
                <span>${fmt(gastosVariables)}</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: summary.totalMonthlyExpenses > 0 ? `${Math.min(100, (gastosVariables / summary.totalMonthlyExpenses) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Plan Financiero ── */}
      {summary.totalMonthlyIncome > 0 && summary.plan && (
        <div className="bg-surface-container-lowest rounded-xl border border-border-light overflow-hidden mb-6">
          <div className="p-4 border-b border-outline-variant bg-surface-gray flex justify-between items-center">
            <h3 className="font-section-title text-section-title text-on-surface">Plan Financiero</h3>
            <div className="flex gap-2">
              {(['50-30-20', '70-20-10'] as BudgetRule[]).map(r => (
                <button
                  key={r}
                  onClick={() => updateRuleMut.mutate(r)}
                  disabled={updateRuleMut.isLoading}
                  className={`px-3 py-1 rounded-full font-label-upper text-label-upper transition-colors ${
                    budget.rule === r
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low border border-outline-variant'
                  }`}
                >
                  {r === '50-30-20' ? '50/30/20' : '70/20/10'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <div className="bg-surface-container rounded-xl p-4 text-center border border-border-light">
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">META FI</p>
              <p className="font-card-title text-card-title text-primary mb-2">${fmt(summary.plan.fiTarget)}</p>
              <button
                onClick={() => syncFiMut.mutate()}
                disabled={syncFiMut.isLoading}
                className="font-caption text-caption text-primary hover:underline disabled:opacity-50"
              >
                {syncFiMut.isLoading ? 'Sincronizando...' : 'Sincronizar meta FI'}
              </button>
            </div>
            <div className="bg-surface-container rounded-xl p-4 text-center border border-border-light">
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">INVERSIÓN MÍN.</p>
              <p className="font-card-title text-card-title text-success">${fmt(summary.plan.minMonthlyInvestment)}/mes</p>
            </div>
            <div className="bg-surface-container rounded-xl p-4 text-center border border-border-light">
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">FONDO EMERGENCIA</p>
              <p className="font-card-title text-card-title text-primary mb-2">${fmt(summary.plan.emergencyFundTarget)}</p>
              <a href="/emergency-fund" className="font-caption text-caption text-primary hover:underline">
                Ver fondo →
              </a>
            </div>
            <div className="bg-surface-container rounded-xl p-4 text-center border border-border-light">
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">OCIO/MES</p>
              <p className="font-card-title text-card-title text-warning">${fmt(summary.plan.entertainmentBudget)}</p>
            </div>
            <div className="bg-surface-container rounded-xl p-4 text-center border border-border-light">
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-2">TOPE GASTOS FIJOS</p>
              <p className="font-card-title text-card-title text-danger">${fmt(summary.plan.fixedExpensesCap)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses by category ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-section-title text-section-title text-on-surface">Detalle de Gastos por Categoría</h2>
        <button
          onClick={() => setShowCategoryModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 font-label-upper text-label-upper text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Nueva categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-border-light p-10 text-center">
          <p className="font-body-default text-outline">Sin categorías de gastos. Agregá una para empezar.</p>
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
        </div>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={showIncomeModal} onClose={() => { setShowIncomeModal(false); setIncomeForm({ ...defaultIncomeForm }); }} title="Agregar fuente de ingreso">
        <form onSubmit={e => { e.preventDefault(); addIncomeMut.mutate({ ...incomeForm, amount: parseFloat(incomeForm.amount as string) }); }} className="space-y-4">
          <div><label className="label">Nombre</label><input className="input" value={incomeForm.name} onChange={e => setIncomeForm({ ...incomeForm, name: e.target.value })} placeholder="Sueldo, Freelance..." required /></div>
          <div>
            <label className="label">Tipo de ingreso</label>
            <select className="input" value={incomeForm.type} onChange={e => setIncomeForm({ ...incomeForm, type: e.target.value })}>
              <option value="salary">Salario</option>
              <option value="investment">Inversiones</option>
              <option value="business">Negocio / Emprendimiento</option>
              <option value="rental">Alquiler</option>
              <option value="freelance">Freelance / Independiente</option>
              <option value="extras">Ingresos extras</option>
              <option value="other">Otro</option>
            </select>
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
          <div><label className="label">Nombre</label><input className="input" value={categoryForm.name} onChange={e => setCategoryForm({ name: e.target.value })} placeholder="Casa, Transporte..." required /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addCategoryMut.isLoading} className="btn-primary">{addCategoryMut.isLoading ? 'Creando...' : 'Crear categoría'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showSavingsModal} onClose={() => setShowSavingsModal(false)} title="Editar meta de ahorro">
        <div className="space-y-5">
          <div>
            <label className="label">Meta de ahorro — <span className="font-bold text-primary">{savingsTargetEdit}%</span></label>
            <input
              type="range" min="0" max="50" step="1"
              value={savingsTargetEdit}
              onChange={e => setSavingsTargetEdit(parseInt(e.target.value))}
              className="w-full accent-primary mt-2"
            />
            <div className="flex justify-between font-caption text-caption text-outline mt-1"><span>0%</span><span>25%</span><span>50%</span></div>
          </div>
          <div className={`font-body-small text-body-small px-3 py-2 rounded-lg bg-surface-container ${savingsRating(savingsTargetEdit).color}`}>
            {savingsRating(savingsTargetEdit).emoji} {savingsRating(savingsTargetEdit).text}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowSavingsModal(false)} className="btn-secondary">Cancelar</button>
            <button
              type="button"
              disabled={updateSavingsMut.isLoading}
              onClick={() => updateSavingsMut.mutate(savingsTargetEdit)}
              className="btn-primary"
            >
              {updateSavingsMut.isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteIncomeId} onClose={() => setDeleteIncomeId(null)} onConfirm={() => delIncomeMut.mutate(deleteIncomeId!)} loading={delIncomeMut.isLoading} title="¿Eliminar ingreso?" message={`Se eliminará "${incomeSources.find(i => i.id === deleteIncomeId)?.name ?? ''}". Esta acción no se puede deshacer.`} />
      <ConfirmDialog isOpen={!!deleteCategoryId} onClose={() => setDeleteCategoryId(null)} onConfirm={() => delCategoryMut.mutate(deleteCategoryId!)} loading={delCategoryMut.isLoading} title="¿Eliminar categoría?" message="Se eliminarán todos los gastos de esta categoría. Esta acción no se puede deshacer." />
    </Layout>
  );
}
