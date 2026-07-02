import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { debtsAPI, budgetAPI, transactionsAPI, summaryAPI, insightsAPI } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/ui/StatCard';
import { useAuthStore } from '../store/auth.store';
import { CurrencyToggle } from '../components/ui/CurrencyToggle';
import { HealthScore } from '../components/ui/HealthScore';
import { useCurrencyFormatter } from '../lib/currency';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Target,
  CreditCard,
  Landmark,
  Calculator,
  ArrowRight,
  BookOpen,
  ShoppingCart,
  Bug,
  Printer,
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n || 0);

const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const currentMonth      = new Date().getMonth() + 1;
const currentYear       = new Date().getFullYear();
const currentMonthPad   = String(currentMonth).padStart(2, '0');
const currentMonthName  = MONTHS.find(m => m.value === currentMonthPad)?.label ?? '';

interface NavCard { label: string; href: string; icon: React.ReactNode; }

const NAV_CARDS: NavCard[] = [
  { label: 'Presupuesto',   href: '/presupuesto',     icon: <TrendingUp  className="w-5 h-5" /> },
  { label: 'Transacciones', href: '/transacciones',   icon: <Receipt     className="w-5 h-5" /> },
  { label: 'Metas',         href: '/metas',           icon: <Target      className="w-5 h-5" /> },
  { label: 'Tarjetas',      href: '/tarjetas',        icon: <CreditCard  className="w-5 h-5" /> },
  { label: 'Créditos',      href: '/creditos',        icon: <Landmark    className="w-5 h-5" /> },
  { label: 'Patrimonio',    href: '/patrimonio',      icon: <Calculator  className="w-5 h-5" /> },
  { label: 'Lista Compra',  href: '/purchases',       icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Reg. Gastos',   href: '/registro-gastos', icon: <BookOpen    className="w-5 h-5" /> },
];

type AdvisoryStatus = 'ok' | 'warning' | 'danger';

const ADVISORY: Record<AdvisoryStatus, { label: string; sub: string; className: string }> = {
  ok:      { label: '✅ En camino con tus metas',   sub: 'Tus gastos están dentro del presupuesto.',        className: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700' },
  warning: { label: '⚠️ Cuidado con los gastos',    sub: 'Estás cerca del límite del presupuesto mensual.', className: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700' },
  danger:  { label: '❌ Gastos superan ingresos',   sub: 'Revisá tu presupuesto — estás en déficit.',       className: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700' },
};

function thermometerColor(pct: number) { return pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'; }
function thermometerLabel(pct: number) { return pct > 100 ? '¡Gastos superaron el presupuesto!' : pct > 80 ? 'Acercándose al límite' : 'Todo bajo control'; }

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission, isAdminGlobal, isAuthenticated } = useAuthStore();
  const { fmt: cfmt } = useCurrencyFormatter();

  useEffect(() => {
    if (isAuthenticated && isAdminGlobal()) router.replace('/admin');
  }, [isAuthenticated, isAdminGlobal, router]);

  const { data: debtsSummary, isLoading: loadingDebts, isError: errorDebts } = useQuery(
    'debtsSummary',
    () => debtsAPI.getSummary(),
    { enabled: hasPermission('debts', 'view'), select: d => d.data },
  );

  const { data: budgetData, isError: errorBudget } = useQuery(
    'budgetDashboard',
    () => budgetAPI.getAll(),
    { select: d => d.data },
  );

  const firstBudget   = Array.isArray(budgetData) ? budgetData[0] : undefined;
  const budgetSummary = firstBudget?.summary as
    | { totalMonthlyIncome: number; totalMonthlyExpenses: number; available: number; savingsTargetAmount: number; antExpensesTotal: number; advisory: AdvisoryStatus }
    | undefined;
  const savingsPercent = (firstBudget as any)?.savingsTargetPercent ?? 0;

  const { data: globalSummary } = useQuery(
    'globalSummary',
    () => summaryAPI.getGlobal().then(r => r.data),
    { retry: false, staleTime: 60 * 1000 }
  );

  const { data: insights } = useQuery(
    'dashboardInsights',
    () => insightsAPI.get().then(r => r.data),
    { retry: false, staleTime: 60 * 1000 }
  );

  const { data: txSummary, isError: errorTx } = useQuery(
    ['transactionsDashboard', budgetSummary?.totalMonthlyIncome, budgetSummary?.totalMonthlyExpenses],
    () => transactionsAPI.getSummary(currentYear, currentMonth, budgetSummary?.totalMonthlyIncome, budgetSummary?.totalMonthlyExpenses),
    { select: d => d.data as { totalIncome: number; totalExpenses: number; expectedExpenses: number } },
  );

  const balance = debtsSummary?.balance ?? 0;
  const txPct   = txSummary && txSummary.expectedExpenses > 0
    ? (txSummary.totalExpenses / txSummary.expectedExpenses) * 100
    : 0;

  const advisoryStatus: AdvisoryStatus = budgetSummary?.advisory
    ?? (budgetSummary
      ? budgetSummary.available < 0
        ? 'danger'
        : budgetSummary.totalMonthlyExpenses / budgetSummary.totalMonthlyIncome > 0.8
          ? 'warning'
          : 'ok'
      : 'ok');

  const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  const categoryPieData = useMemo(() => {
    if (!firstBudget?.categories) return [];
    const PERIOD_DIV: Record<string, number> = {
      daily: 1/30, weekly: 1/4, biweekly: 1/2,
      monthly: 1, bimonthly: 2, quarterly: 3,
      fourmonthly: 4, semiannual: 6, annual: 12,
    };
    return (firstBudget.categories as any[])
      .map((cat: any) => ({
        name: cat.name,
        value: (cat.expenses ?? []).reduce(
          (s: number, e: any) => s + Number(e.amount) / (PERIOD_DIV[e.periodicity] ?? 1),
          0
        ),
      }))
      .filter((d: any) => d.value > 0)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 6);
  }, [firstBudget]);

  if (loadingDebts) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-gray-500 dark:text-gray-400">Cargando dashboard...</div></div></Layout>;
  }

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen general de tus finanzas</p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyToggle />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      {errorDebts && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-300">
          No se pudieron cargar las deudas. Intentá recargar la página.
        </div>
      )}
      {errorBudget && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-300">
          No se pudo cargar el presupuesto. Intentá recargar la página.
        </div>
      )}
      {errorTx && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-300">
          No se pudieron cargar las transacciones. Intentá recargar la página.
        </div>
      )}

      {/* ── Budget KPIs ── */}
      {budgetSummary && (
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard title="Ingreso mensual"       value={cfmt(budgetSummary.totalMonthlyIncome)}    icon="💰" color="green" />
            <StatCard title="Gastos presupuestados" value={cfmt(budgetSummary.totalMonthlyExpenses)}  icon="💸" color="yellow" />
            <StatCard title="Disponible"            value={cfmt(Math.abs(budgetSummary.available))}   icon="🏦" color={budgetSummary.available >= 0 ? 'green' : 'red'} subtitle={budgetSummary.available < 0 ? 'En déficit' : undefined} />
            <StatCard title={`Meta ahorro (${savingsPercent}%)`} value={cfmt(budgetSummary.savingsTargetAmount)} icon="🎯" color="blue" />
          </div>
          <div className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 ${ADVISORY[advisoryStatus].className}`}>
            <div className="flex-1">
              <p className="font-semibold text-sm">{ADVISORY[advisoryStatus].label}</p>
              <p className="text-xs opacity-80 mt-0.5">{ADVISORY[advisoryStatus].sub}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Debts row ── */}
      {hasPermission('debts', 'view') && debtsSummary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard title="Me deben" value={`$${fmt(debtsSummary.totalTheyOweMe)}`} icon="💙" color="green" />
          <StatCard title="Debo"     value={`$${fmt(debtsSummary.totalIOwe)}`}       icon="❤️" color="red" />
          <StatCard title="Balance"  value={`$${fmt(balance)}`}                      icon={balance >= 0 ? '✅' : '⚠️'} color={balance >= 0 ? 'green' : 'red'} />
        </div>
      )}

      {/* ── Global summary ── */}
      {globalSummary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Resumen Global</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Patrimonio neto', value: `$${fmt((globalSummary as any).netWorth ?? 0)}`, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Total deudas', value: `$${fmt((globalSummary as any).totalDebts ?? 0)}`, color: 'text-red-600 dark:text-red-400' },
              { label: 'Ahorro en metas', value: `$${fmt((globalSummary as any).totalSavings ?? 0)}`, color: 'text-green-600 dark:text-green-400' },
              { label: 'Cuotas/mes', value: `$${fmt((globalSummary as any).monthlyLoanPayments ?? 0)}`, color: 'text-amber-600 dark:text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Health Score ── */}
      <div className="mb-6">
        <HealthScore />
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transactions thermometer */}
        {txSummary && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Transacciones de {currentMonthName}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-green-500" /> Ingresos reales</span>
                <span className="font-semibold text-green-600 dark:text-green-400">${fmt(txSummary.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-red-500" /> Gastos reales</span>
                <span className="font-semibold text-red-600 dark:text-red-400">${fmt(txSummary.totalExpenses)}</span>
              </div>
              {txSummary.expectedExpenses > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>{thermometerLabel(txPct)}</span>
                    <span>{txPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden" role="presentation">
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(Math.min(100, txPct))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Gastos vs presupuesto: ${Math.round(txPct)}%`}
                      className={`h-3 rounded-full transition-all duration-500 ${thermometerColor(txPct)}`}
                      style={{ width: `${Math.min(100, txPct)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ant expenses panel */}
        {budgetSummary && budgetSummary.antExpensesTotal > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-2">
              <Bug className="w-4 h-4" /> 🐜 Gastos Hormiga del Mes
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Presupuesto/mes</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">${fmt(budgetSummary.antExpensesTotal)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Máximo/día</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">${fmt(budgetSummary.antExpensesTotal / 30)}</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
              Pequeños gastos frecuentes. Controlá cuánto gastás por día para no pasarte.
            </p>
          </div>
        )}

        {/* Expense donut */}
        {categoryPieData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Gastos por categoría</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {categoryPieData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${fmt(v)}`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Hogar quick links */}
        {hasPermission('purchases', 'view') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">🏡 Hogar</h2>
            <div className="space-y-2">
              {[
                { href: '/purchases', icon: <ShoppingCart className="w-4 h-4" />, label: 'Lista de la Compra', sub: 'Mercado, precios, totales por lugar' },
                { href: '/registro-gastos', icon: <BookOpen className="w-4 h-4" />, label: 'Registro de Gastos', sub: 'Salidas y gastos del hogar' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors">{l.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{l.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Insights ── */}
      {insights && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Resumen Inteligente</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Promedio mensual gastos" value={`$${fmt(insights.monthlyAverageExpenses)}`} icon="📊" color="yellow" />
            <StatCard title="Tasa de ahorro" value={`${insights.savingsRate.toFixed(1)}%`} icon="💹" color="green" />
            <StatCard title="Fondo de emergencia" value={`${insights.monthsOfEmergencyFund.toFixed(1)} meses`} icon="🛡️" color="blue" />
            <StatCard title="Transacciones este mes" value={`${insights.transactionCount}`} icon="🔢" color="green" />
          </div>
        </div>
      )}

      {/* ── Quick nav ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col items-center gap-2 group hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <span className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{card.icon}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{card.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
