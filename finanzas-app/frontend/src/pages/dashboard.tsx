import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { OnboardingBanner } from '../components/ui/OnboardingBanner';
import { useQuery } from 'react-query';
import { debtsAPI, budgetAPI, transactionsAPI, summaryAPI, insightsAPI, investmentsAPI } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/ui/StatCard';
import { useAuthStore } from '../store/auth.store';
import { CurrencyToggle } from '../components/ui/CurrencyToggle';
import { HealthScore } from '../components/ui/HealthScore';
import { ErrorState } from '../components/ui/ErrorState';
import { useCurrencyFormatter } from '../lib/currency';
import { useCountUp } from '../hooks/useCountUp';
import {
  TrendingUp, TrendingDown, Receipt,
  ArrowRight, BookOpen, ShoppingCart, Bug, Printer,
} from 'lucide-react';
import { fmt, MONTHS } from '../lib/format';

const safeNum = (n: unknown): number => { const v = Number(n); return Number.isFinite(v) ? v : 0; };

const currentMonth     = new Date().getMonth() + 1;
const currentYear      = new Date().getFullYear();
const currentMonthPad  = String(currentMonth).padStart(2, '0');
const currentMonthName = MONTHS.find(m => m.value === currentMonthPad)?.label ?? '';
const GREETING = (() => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
})();

type AdvisoryStatus = 'ok' | 'warning' | 'danger';
const ADVISORY: Record<AdvisoryStatus, { label: string; sub: string; bg: string; text: string; dot: string }> = {
  ok:      { label: 'En camino con tus metas',   sub: 'Tus gastos están dentro del presupuesto.',        bg: 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800',     text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
  warning: { label: 'Cuidado con los gastos',    sub: 'Estás cerca del límite del presupuesto mensual.', bg: 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800',           text: 'text-amber-800 dark:text-amber-300',   dot: 'bg-amber-500' },
  danger:  { label: 'Gastos superan ingresos',   sub: 'Revisá tu presupuesto — estás en déficit.',       bg: 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800',                   text: 'text-red-800 dark:text-red-300',       dot: 'bg-red-500' },
};

function thermometerColor(pct: number) { return pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'; }
function thermometerLabel(pct: number) { return pct > 100 ? '¡Superado!' : pct > 80 ? 'Cerca del límite' : 'Todo bajo control'; }

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission, isAdminGlobal, isAuthenticated, user } = useAuthStore();
  const { fmt: cfmt } = useCurrencyFormatter();

  useEffect(() => {
    if (isAuthenticated && isAdminGlobal()) router.replace('/admin');
  }, [isAuthenticated, isAdminGlobal, router]);

  const { data: debtsSummary, isLoading: loadingDebts } = useQuery(
    'debtsSummary',
    () => debtsAPI.getSummary(),
    { enabled: hasPermission('debts', 'view'), select: d => d.data },
  );
  const { data: budgetData, isError: isBudgetDataError, refetch: refetchBudgetData } = useQuery('budgetDashboard', () => budgetAPI.getAll(), { select: d => d.data });
  const firstBudget   = Array.isArray(budgetData) ? budgetData[0] : undefined;
  const budgetSummary = firstBudget?.summary as
    | { totalMonthlyIncome: number; totalMonthlyExpenses: number; available: number; savingsTargetAmount: number; antExpensesTotal: number; advisory: AdvisoryStatus }
    | undefined;
  const savingsPercent = (firstBudget as any)?.savingsTargetPercent ?? 0;

  const { data: globalSummary, isError: isGlobalSummaryError, refetch: refetchGlobalSummary } = useQuery('globalSummary', () => summaryAPI.getGlobal().then(r => r.data), { retry: false, staleTime: 60000 });
  const { data: insights, isError: isInsightsError, refetch: refetchInsights }      = useQuery('dashboardInsights', () => insightsAPI.get().then(r => r.data), { retry: false, staleTime: 60000 });
  const { data: txSummary, isError: isTxSummaryError, refetch: refetchTxSummary }     = useQuery(
    ['transactionsDashboard', budgetSummary?.totalMonthlyIncome, budgetSummary?.totalMonthlyExpenses],
    () => transactionsAPI.getSummary(currentYear, currentMonth, budgetSummary?.totalMonthlyIncome, budgetSummary?.totalMonthlyExpenses),
    { select: d => d.data as { totalIncome: number; totalExpenses: number; expectedExpenses: number } },
  );
  const { data: allInvestments, isError: isInvestmentsError, refetch: refetchInvestments } = useQuery('investments', () => investmentsAPI.getAll().then(r => r.data), { retry: false, staleTime: 60000 });
  const { data: allDebts, isError: isDebtsError, refetch: refetchDebts }       = useQuery('debts', () => debtsAPI.getAll().then(r => r.data ?? []), { retry: false, staleTime: 60000, enabled: hasPermission('debts', 'view') });

  const netWorth     = safeNum((globalSummary as any)?.netWorth?.total ?? 0);
  const netWorthAnim = useCountUp(netWorth, 1200, netWorth !== 0);
  const balance      = debtsSummary?.balance ?? 0;
  const txPct        = txSummary && txSummary.expectedExpenses > 0 ? (txSummary.totalExpenses / txSummary.expectedExpenses) * 100 : 0;

  const advisoryStatus: AdvisoryStatus = budgetSummary?.advisory
    ?? (budgetSummary ? (budgetSummary.available < 0 ? 'danger' : budgetSummary.totalMonthlyExpenses / budgetSummary.totalMonthlyIncome > 0.8 ? 'warning' : 'ok') : 'ok');

  const investList  = Array.isArray(allInvestments) ? (allInvestments as any[]) : [];
  const debtList    = Array.isArray(allDebts) ? (allDebts as any[]) : [];
  const avgDebtCost = debtList.length > 0 ? debtList.reduce((s: number, d: any) => s + (Number(d.interestRate) || 0), 0) / debtList.length : 0;
  const avgInvestReturn = investList.length > 0 ? investList.reduce((s: number, i: any) => s + (Number(i.tna ?? i.rate) || 0), 0) / investList.length : 0;

  const categoryPieData = useMemo(() => {
    if (!firstBudget?.categories) return [];
    const PERIOD_DIV: Record<string, number> = { daily: 1/30, weekly: 1/4, biweekly: 1/2, monthly: 1, bimonthly: 2, quarterly: 3, fourmonthly: 4, semiannual: 6, annual: 12 };
    return (firstBudget.categories as any[])
      .map((cat: any) => ({
        name: cat.name,
        value: (cat.expenses ?? []).reduce((s: number, e: any) => s + Number(e.amount) / (PERIOD_DIV[e.periodicity] ?? 1), 0),
      }))
      .filter((d: any) => d.value > 0)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 6);
  }, [firstBudget]);

  if (loadingDebts) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Cargando dashboard...</div>
        </div>
      </Layout>
    );
  }

  const netWorthPositive = netWorth >= 0;

  return (
    <Layout>
      <OnboardingBanner
        hasBudget={!!firstBudget}
        hasTransactions={(txSummary?.totalIncome ?? 0) + (txSummary?.totalExpenses ?? 0) > 0}
        hasGoals={(globalSummary as any)?.totalSavings > 0}
      />

      {/* ── Header ── */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{GREETING}, {user?.name?.split(' ')[0]}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
            {currentMonthName} {currentYear}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyToggle />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-white/[0.08] rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-gray-600 dark:text-gray-400"
          >
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      {/* ── HERO: Patrimonio neto ── */}
      {isGlobalSummaryError && (
        <div className="mb-6"><ErrorState message="No se pudo cargar el patrimonio neto" onRetry={() => refetchGlobalSummary()} /></div>
      )}
      {globalSummary && (
        <div className="mb-6 rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-gray-900 animate-fade-up"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Net worth hero */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Patrimonio neto</p>
              <div className={`fin-hero ${netWorthPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {netWorthPositive ? '' : '–'}${fmt(Math.abs(netWorthAnim))}
              </div>
              {netWorth !== 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Activos – Deudas totales
                </p>
              )}
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 min-w-0">
              {[
                { label: 'Total deudas',  value: `$${fmt(safeNum((globalSummary as any).debts?.total ?? 0))}`,               color: 'text-red-600 dark:text-red-400' },
                { label: 'Ahorro metas',  value: `$${fmt(safeNum((globalSummary as any).savingsGoals?.totalSaved ?? 0))}`,   color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Cuotas/mes',    value: `$${fmt(safeNum((globalSummary as any).loans?.monthlyPayments ?? 0))}`,     color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Salud fin.',    value: insights ? `${(insights as any).savingsRate?.toFixed(0) ?? 0}% ahorro` : '—', color: 'text-blue-600 dark:text-blue-400' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">{k.label}</p>
                  <p className={`text-lg font-bold fin-number ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Budget KPIs ── */}
      {isBudgetDataError && (
        <div className="mb-6"><ErrorState message="No se pudo cargar el presupuesto" onRetry={() => refetchBudgetData()} /></div>
      )}
      {budgetSummary && (
        <div className="mb-6 animate-stagger-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard title="Ingresos"  value={cfmt(budgetSummary.totalMonthlyIncome)}   icon="💰" color="green" />
            <StatCard title="Gastos"    value={cfmt(budgetSummary.totalMonthlyExpenses)}  icon="💸" color="yellow" />
            <StatCard title="Disponible" value={cfmt(Math.abs(budgetSummary.available))}  icon="🏦" color={budgetSummary.available >= 0 ? 'green' : 'red'} subtitle={budgetSummary.available < 0 ? 'En déficit' : undefined} />
            <StatCard title={`Meta ahorro (${savingsPercent}%)`} value={cfmt(budgetSummary.savingsTargetAmount)} icon="🎯" color="blue" />
          </div>

          {/* Advisory */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${ADVISORY[advisoryStatus].bg}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${ADVISORY[advisoryStatus].dot}`} />
            <div>
              <p className={`font-semibold text-sm ${ADVISORY[advisoryStatus].text}`}>{ADVISORY[advisoryStatus].label}</p>
              <p className={`text-xs opacity-75 mt-0.5 ${ADVISORY[advisoryStatus].text}`}>{ADVISORY[advisoryStatus].sub}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Debts row ── */}
      {hasPermission('debts', 'view') && debtsSummary && (
        <div className="grid grid-cols-3 gap-3 mb-6 animate-stagger-2">
          <StatCard title="Me deben" value={`$${fmt(debtsSummary.totalTheyOweMe)}`} icon="💙" color="green" />
          <StatCard title="Debo"     value={`$${fmt(debtsSummary.totalIOwe)}`}       icon="❤️" color="red" />
          <StatCard title="Balance"  value={`$${fmt(balance)}`} icon={balance >= 0 ? '✅' : '⚠️'} color={balance >= 0 ? 'green' : 'red'} />
        </div>
      )}

      {/* ── Health Score ── */}
      <div className="mb-6">
        <HealthScore />
      </div>

      {/* ── Debt vs Investment alert ── */}
      {(isInvestmentsError || isDebtsError) && (
        <div className="mb-5">
          <ErrorState
            message={isInvestmentsError && isDebtsError ? 'No se pudieron cargar inversiones ni deudas' : isInvestmentsError ? 'No se pudieron cargar las inversiones' : 'No se pudieron cargar las deudas'}
            onRetry={() => { if (isInvestmentsError) refetchInvestments(); if (isDebtsError) refetchDebts(); }}
          />
        </div>
      )}
      {avgDebtCost > 0 && avgInvestReturn > 0 && avgDebtCost > avgInvestReturn && (
        <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
            Tu deuda te cuesta más que lo que rinden tus inversiones
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Costo deudas: {avgDebtCost.toFixed(1)}% TNA — Retorno inversiones: {avgInvestReturn.toFixed(1)}% TNA
          </p>
        </div>
      )}

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Transactions */}
        {isTxSummaryError && (
          <ErrorState message="No se pudo cargar el resumen de transacciones" onRetry={() => refetchTxSummary()} />
        )}
        {txSummary && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-400" /> Transacciones — {currentMonthName}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Ingresos reales
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 fin-number">${fmt(txSummary.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Gastos reales
                </span>
                <span className="font-bold text-red-600 dark:text-red-400 fin-number">${fmt(txSummary.totalExpenses)}</span>
              </div>
              {txSummary.expectedExpenses > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{thermometerLabel(txPct)}</span>
                    <span className="font-semibold">{txPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${thermometerColor(txPct)}`}
                      style={{ width: `${Math.min(100, txPct)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ant expenses */}
        {budgetSummary && budgetSummary.antExpensesTotal > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-2">
              <Bug className="w-4 h-4" /> Gastos Hormiga del Mes
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-medium">Presupuesto/mes</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 fin-number">${fmt(budgetSummary.antExpensesTotal)}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-medium">Máximo/día</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 fin-number">${fmt(budgetSummary.antExpensesTotal / 30)}</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
              Pequeños gastos frecuentes que acumulan sin que te des cuenta.
            </p>
          </div>
        )}

        {/* Pie chart */}
        {categoryPieData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Gastos por categoría</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {categoryPieData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${fmt(v)}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Hogar quick links */}
        {hasPermission('purchases', 'view') && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🏡 Hogar</h2>
            <div className="space-y-1">
              {[
                { href: '/purchases', icon: <ShoppingCart className="w-4 h-4" />, label: 'Lista de la Compra', sub: 'Mercado, precios, totales por lugar' },
                { href: '/registro-gastos', icon: <BookOpen className="w-4 h-4" />, label: 'Registro de Gastos', sub: 'Salidas y gastos del hogar' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-150 group active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 group-hover:text-primary-500 transition-colors duration-150">{l.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{l.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all duration-150" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Insights ── */}
      {isInsightsError && (
        <div className="mb-6"><ErrorState message="No se pudo cargar el resumen inteligente" onRetry={() => refetchInsights()} /></div>
      )}
      {insights && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Resumen inteligente</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Promedio mensual"     value={`$${fmt((insights as any).monthlyAverageExpenses)}`}            icon="📊" color="yellow" />
            <StatCard title="Tasa de ahorro"       value={`${(insights as any).savingsRate?.toFixed(1) ?? 0}%`}           icon="💹" color="green" />
            <StatCard title="Fondo emergencia"     value={`${(insights as any).monthsOfEmergencyFund?.toFixed(1) ?? 0} m`} icon="🛡️" color="blue" />
            <StatCard title="Transacciones mes"    value={`${(insights as any).transactionCount ?? 0}`}                   icon="🔢" color="gray" />
          </div>
        </div>
      )}

    </Layout>
  );
}
