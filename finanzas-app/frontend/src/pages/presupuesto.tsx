import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { budgetAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  CreditCard,
  Zap,
  Bug,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Periodicity = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

interface IncomeSource {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  amount: number;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  periodicity: Periodicity;
  isFixed: boolean;
  isCreditCard: boolean;
  isAntExpense: boolean;
}

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  expenses: Expense[];
}

interface BudgetSummary {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  available: number;
  savingsTargetAmount: number;
  antExpensesTotal: number;
  advisory: 'ok' | 'warning' | 'danger';
}

interface Budget {
  id: string;
  name: string;
  year: number;
  savingsTargetPercent: number;
  incomeSources: IncomeSource[];
  categories: Category[];
  summary: BudgetSummary;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const PERIODICITY_LABELS: Record<Periodicity, string> = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const getErrorMessage = (e: any) =>
  e?.response?.data?.message || e?.message || 'Error desconocido';

// ─── Default form states ──────────────────────────────────────────────────────

const defaultBudgetForm = { name: '', year: new Date().getFullYear(), savingsTargetPercent: 20 };
const defaultIncomeForm = { name: '', type: 'fixed' as 'fixed' | 'variable', amount: '' };
const defaultCategoryForm = { name: '' };
const defaultExpenseForm = {
  name: '',
  amount: '',
  periodicity: 'monthly' as Periodicity,
  isFixed: false,
  isAntExpense: false,
  isCreditCard: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'red' | 'blue' | 'dynamic';
  children?: React.ReactNode;
}) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    dynamic: '',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>${value}</p>
      {children}
    </div>
  );
}

function CategorySection({
  category,
  budgetId,
  onExpenseAdded,
  onExpenseDeleted,
  onExpenseUpdated,
}: {
  category: Category;
  budgetId: string;
  onExpenseAdded: () => void;
  onExpenseDeleted: () => void;
  onExpenseUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ ...defaultExpenseForm });

  const addExpenseMut = useMutation(
    (data: any) => budgetAPI.addExpense(category.id, data),
    {
      onSuccess: () => {
        toast.success('Gasto agregado');
        setShowExpenseModal(false);
        setExpenseForm({ ...defaultExpenseForm });
        onExpenseAdded();
      },
      onError: (e: any) => toast.error(getErrorMessage(e)),
    }
  );

  const deleteExpenseMut = useMutation((id: string) => budgetAPI.deleteExpense(id), {
    onSuccess: () => {
      toast.success('Gasto eliminado');
      setDeleteExpenseId(null);
      onExpenseDeleted();
    },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const updateExpenseMut = useMutation(
    ({ id, data }: { id: string; data: any }) => budgetAPI.updateExpense(id, data),
    {
      onSuccess: () => {
        toast.success('Gasto actualizado');
        onExpenseUpdated();
      },
      onError: (e: any) => toast.error(getErrorMessage(e)),
    }
  );

  const categoryTotal = category.expenses.reduce((sum, e) => {
    const divisor: Record<Periodicity, number> = {
      monthly: 1,
      bimonthly: 2,
      quarterly: 3,
      semiannual: 6,
      annual: 12,
    };
    return sum + Number(e.amount) / divisor[e.periodicity];
  }, 0);

  const handleToggleFlag = (expense: Expense, flag: 'isFixed' | 'isCreditCard' | 'isAntExpense') => {
    updateExpenseMut.mutate({
      id: expense.id,
      data: { [flag]: !expense[flag] },
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Category header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="font-semibold text-gray-900 dark:text-white">{category.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            ({category.expenses.length} gastos)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            ${fmt(categoryTotal)}/mes
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExpenseModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={12} /> Gasto
          </button>
        </div>
      </div>

      {/* Expenses table */}
      {open && (
        <div className="overflow-x-auto">
          {category.expenses.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No hay gastos en esta categoría
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Gasto
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Monto
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Periodicidad
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {category.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {expense.name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                      ${fmt(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={expense.periodicity}
                        onChange={(e) =>
                          updateExpenseMut.mutate({
                            id: expense.id,
                            data: { periodicity: e.target.value },
                          })
                        }
                        className="text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer focus:ring-2 focus:ring-primary-500"
                      >
                        {Object.entries(PERIODICITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleFlag(expense, 'isFixed')}
                          title="Fijo"
                          className={`p-1 rounded transition-colors ${
                            expense.isFixed
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                              : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                          }`}
                        >
                          <Zap size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleFlag(expense, 'isCreditCard')}
                          title="Tarjeta de crédito"
                          className={`p-1 rounded transition-colors ${
                            expense.isCreditCard
                              ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30'
                              : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                          }`}
                        >
                          <CreditCard size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleFlag(expense, 'isAntExpense')}
                          title="Gasto hormiga"
                          className={`p-1 rounded transition-colors ${
                            expense.isAntExpense
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                              : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                          }`}
                        >
                          <Bug size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDeleteExpenseId(expense.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                <tr>
                  <td className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Total mensual
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800 dark:text-gray-200">
                    ${fmt(categoryTotal)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Add expense modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setExpenseForm({ ...defaultExpenseForm });
        }}
        title={`Agregar gasto — ${category.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addExpenseMut.mutate({
              ...expenseForm,
              amount: parseFloat(expenseForm.amount as string),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Nombre del gasto</label>
            <input
              className="input"
              value={expenseForm.name}
              onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
              placeholder="Ej: Netflix, Supermercado..."
              required
            />
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="label">Periodicidad</label>
            <select
              className="input"
              value={expenseForm.periodicity}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, periodicity: e.target.value as Periodicity })
              }
            >
              {Object.entries(PERIODICITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { key: 'isFixed', label: 'Fijo', icon: <Zap size={14} />, color: 'blue' },
                { key: 'isCreditCard', label: 'Tarjeta', icon: <CreditCard size={14} />, color: 'purple' },
                { key: 'isAntExpense', label: 'Hormiga', icon: <Bug size={14} />, color: 'amber' },
              ] as const
            ).map(({ key, label, icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setExpenseForm({ ...expenseForm, [key]: !expenseForm[key] })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  expenseForm[key]
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false);
                setExpenseForm({ ...defaultExpenseForm });
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addExpenseMut.isLoading}
              className="btn-primary"
            >
              {addExpenseMut.isLoading ? 'Guardando...' : 'Agregar gasto'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={() => deleteExpenseMut.mutate(deleteExpenseId!)}
        loading={deleteExpenseMut.isLoading}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
  const qc = useQueryClient();

  // Modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // Form state
  const [budgetForm, setBudgetForm] = useState({ ...defaultBudgetForm });
  const [incomeForm, setIncomeForm] = useState({ ...defaultIncomeForm });
  const [categoryForm, setCategoryForm] = useState({ ...defaultCategoryForm });

  // ── Data fetching ──
  const {
    data: budgets = [],
    isLoading,
  } = useQuery<Budget[]>('budgets', () => budgetAPI.getAll().then((r) => r.data), {
    staleTime: 0,
  });

  // Use the first budget (one per house model)
  const activeBudgetId = budgets[0]?.id ?? null;

  const {
    data: budget,
    isLoading: loadingBudget,
    refetch: refetchBudget,
  } = useQuery<Budget>(
    ['budget', activeBudgetId],
    () => budgetAPI.getOne(activeBudgetId!).then((r) => r.data),
    { enabled: !!activeBudgetId, staleTime: 0 }
  );

  const refreshBudget = () => {
    qc.invalidateQueries(['budget', activeBudgetId]);
    qc.invalidateQueries('budgets');
  };

  // ── Mutations ──
  const createBudgetMut = useMutation((data: any) => budgetAPI.create(data), {
    onSuccess: () => {
      toast.success('Presupuesto creado');
      setShowBudgetModal(false);
      setBudgetForm({ ...defaultBudgetForm });
      qc.invalidateQueries('budgets');
    },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const addIncomeMut = useMutation(
    (data: any) => budgetAPI.addIncome(activeBudgetId!, data),
    {
      onSuccess: () => {
        toast.success('Ingreso agregado');
        setShowIncomeModal(false);
        setIncomeForm({ ...defaultIncomeForm });
        refreshBudget();
      },
      onError: (e: any) => toast.error(getErrorMessage(e)),
    }
  );

  const deleteIncomeMut = useMutation((id: string) => budgetAPI.deleteIncome(id), {
    onSuccess: () => {
      toast.success('Ingreso eliminado');
      setDeleteIncomeId(null);
      refreshBudget();
    },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const addCategoryMut = useMutation(
    (data: any) => budgetAPI.addCategory(activeBudgetId!, data),
    {
      onSuccess: () => {
        toast.success('Categoría agregada');
        setShowCategoryModal(false);
        setCategoryForm({ ...defaultCategoryForm });
        refreshBudget();
      },
      onError: (e: any) => toast.error(getErrorMessage(e)),
    }
  );

  const deleteCategoryMut = useMutation((id: string) => budgetAPI.deleteCategory(id), {
    onSuccess: () => {
      toast.success('Categoría eliminada');
      setDeleteCategoryId(null);
      refreshBudget();
    },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  // ── Loading state ──
  if (isLoading || (activeBudgetId && loadingBudget)) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Cargando presupuesto...</div>
        </div>
      </Layout>
    );
  }

  // ── No budget state ──
  if (!activeBudgetId || !budget) {
    return (
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🧮 Presupuesto
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Planificá tus ingresos y gastos mensuales
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center max-w-md w-full">
            <Calculator size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No tenés un presupuesto creado
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Creá tu presupuesto para empezar a planificar tus finanzas del hogar.
            </p>
            <button
              onClick={() => setShowBudgetModal(true)}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus size={18} /> Crear presupuesto
            </button>
          </div>
        </div>

        {/* Create budget modal */}
        <Modal
          isOpen={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          title="Nuevo presupuesto"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBudgetMut.mutate(budgetForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                placeholder="Ej: Presupuesto 2025"
                required
              />
            </div>
            <div>
              <label className="label">Año</label>
              <input
                type="number"
                className="input"
                value={budgetForm.year}
                onChange={(e) =>
                  setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <label className="label">
                Meta de ahorro (%) — actualmente {budgetForm.savingsTargetPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={budgetForm.savingsTargetPercent}
                onChange={(e) =>
                  setBudgetForm({
                    ...budgetForm,
                    savingsTargetPercent: parseInt(e.target.value),
                  })
                }
                className="w-full accent-primary-600"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createBudgetMut.isLoading}
                className="btn-primary"
              >
                {createBudgetMut.isLoading ? 'Creando...' : 'Crear presupuesto'}
              </button>
            </div>
          </form>
        </Modal>
      </Layout>
    );
  }

  // ── Derived values ──
  const { summary, incomeSources, categories } = budget;
  const savingsProgress = summary.savingsTargetAmount > 0
    ? Math.min(100, Math.max(0, (summary.available / summary.savingsTargetAmount) * 100))
    : 0;

  const advisoryConfig = {
    ok: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-300',
      message: '✅ ¡Felicidades! Podés alcanzar tus metas de ahorro.',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-300',
      message: `⚠️ Cuidado, no alcanzás tu meta de ahorro del ${budget.savingsTargetPercent}%.`,
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      message: '❌ Tus gastos superan tus ingresos.',
    },
  };

  const advisory = advisoryConfig[summary.advisory];
  const availableColor = summary.available >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🧮 {budget.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Año {budget.year} · Meta de ahorro: {budget.savingsTargetPercent}%
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="Ingreso mensual"
          value={fmt(summary.totalMonthlyIncome)}
          color="green"
        />
        <KpiCard
          icon={<TrendingDown size={20} />}
          label="Gastos mensuales"
          value={fmt(summary.totalMonthlyExpenses)}
          color="red"
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-gray-400 dark:text-gray-500">
              <Calculator size={20} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Disponible</p>
          </div>
          <p className={`text-2xl font-bold ${availableColor}`}>
            {summary.available >= 0 ? '' : '-'}${fmt(Math.abs(summary.available))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-gray-400 dark:text-gray-500">
              <Target size={20} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Meta de ahorro</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${fmt(summary.savingsTargetAmount)}
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{savingsProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  savingsProgress >= 100
                    ? 'bg-green-500'
                    : savingsProgress >= 50
                    ? 'bg-blue-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${savingsProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Advisory banner ── */}
      <div
        className={`${advisory.bg} ${advisory.border} border rounded-xl px-4 py-3 mb-6`}
      >
        <p className={`text-sm font-medium ${advisory.text}`}>{advisory.message}</p>
      </div>

      {/* ── Ant expenses alert ── */}
      {summary.antExpensesTotal > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          <Bug size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            🐜 Gastos hormiga: ${fmt(summary.antExpensesTotal)}/mes — pequeños gastos que suman
            mucho al final del mes.
          </p>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Income sources ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
              <h2 className="text-base font-semibold text-green-900 dark:text-green-300">
                💰 Fuentes de Ingreso
              </h2>
              <button
                onClick={() => setShowIncomeModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Fuente
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Monto
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {incomeSources.map((income) => (
                  <tr key={income.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {income.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          income.type === 'fixed'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {income.type === 'fixed' ? 'Fijo' : 'Variable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      ${fmt(income.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDeleteIncomeId(income.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {incomeSources.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                    >
                      No hay fuentes de ingreso registradas
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-green-50 dark:bg-green-900/20 border-t-2 border-green-200 dark:border-green-800">
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-sm"
                  >
                    Total mensual
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                    ${fmt(summary.totalMonthlyIncome)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Expenses by category ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              💸 Gastos por categoría
            </h2>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus size={12} /> Nueva categoría
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                No hay categorías de gastos. Agregá una para empezar.
              </p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="relative group">
                <CategorySection
                  category={category}
                  budgetId={budget.id}
                  onExpenseAdded={refreshBudget}
                  onExpenseDeleted={refreshBudget}
                  onExpenseUpdated={refreshBudget}
                />
                {/* Delete category button */}
                <button
                  onClick={() => setDeleteCategoryId(category.id)}
                  className="absolute top-2.5 right-16 text-red-300 hover:text-red-600 dark:text-red-600 dark:hover:text-red-400 p-1 transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}

          {/* Expenses total */}
          {categories.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-red-900 dark:text-red-300">
                  Total gastos mensuales
                </span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${fmt(summary.totalMonthlyExpenses)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add income modal ── */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          setIncomeForm({ ...defaultIncomeForm });
        }}
        title="Agregar fuente de ingreso"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addIncomeMut.mutate({
              ...incomeForm,
              amount: parseFloat(incomeForm.amount as string),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={incomeForm.name}
              onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })}
              placeholder="Ej: Sueldo, Freelance..."
              required
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { v: 'fixed', l: '🔵 Fijo' },
                  { v: 'variable', l: '🟠 Variable' },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setIncomeForm({ ...incomeForm, type: v })}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    incomeForm.type === v
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Monto mensual</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={incomeForm.amount}
              onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowIncomeModal(false);
                setIncomeForm({ ...defaultIncomeForm });
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addIncomeMut.isLoading}
              className="btn-primary"
            >
              {addIncomeMut.isLoading ? 'Guardando...' : 'Agregar ingreso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add category modal ── */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setCategoryForm({ ...defaultCategoryForm });
        }}
        title="Nueva categoría de gastos"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCategoryMut.mutate(categoryForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Nombre de la categoría</label>
            <input
              className="input"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Ej: Alimentación, Transporte, Ocio..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setCategoryForm({ ...defaultCategoryForm });
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addCategoryMut.isLoading}
              className="btn-primary"
            >
              {addCategoryMut.isLoading ? 'Guardando...' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        isOpen={!!deleteIncomeId}
        onClose={() => setDeleteIncomeId(null)}
        onConfirm={() => deleteIncomeMut.mutate(deleteIncomeId!)}
        loading={deleteIncomeMut.isLoading}
      />
      <ConfirmDialog
        isOpen={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={() => deleteCategoryMut.mutate(deleteCategoryId!)}
        loading={deleteCategoryMut.isLoading}
      />
    </Layout>
  );
}
