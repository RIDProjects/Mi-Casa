import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { debtsAPI, inventoryAPI, budgetAPI, transactionsAPI } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { useAuthStore } from '../store/auth.store';
import {
  CheckCircle,
  AlertTriangle,
  Package,
  TrendingUp,
  Receipt,
  Target,
  CreditCard,
  Landmark,
  Calculator,
  ArrowRight,
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n || 0);

const MONTHS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();
const currentMonthPadded = String(currentMonth).padStart(2, '0');
const currentMonthName =
  MONTHS.find(m => m.value === currentMonthPadded)?.label ?? '';

// ─── Quick-nav config ────────────────────────────────────────────────────────

interface NavCard {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_CARDS: NavCard[] = [
  { label: 'Presupuesto',   href: '/budget',        icon: <TrendingUp  className="w-5 h-5" /> },
  { label: 'Transacciones', href: '/transactions',  icon: <Receipt     className="w-5 h-5" /> },
  { label: 'Metas',         href: '/savings-goals', icon: <Target      className="w-5 h-5" /> },
  { label: 'Tarjetas',      href: '/credit-cards',  icon: <CreditCard  className="w-5 h-5" /> },
  { label: 'Créditos',      href: '/loans',         icon: <Landmark    className="w-5 h-5" /> },
  { label: 'Patrimonio',    href: '/net-worth',     icon: <Calculator  className="w-5 h-5" /> },
];

// ─── Advisory badge ──────────────────────────────────────────────────────────

type AdvisoryStatus = 'ok' | 'warning' | 'danger';

const ADVISORY: Record<AdvisoryStatus, { label: string; className: string }> = {
  ok:      { label: '✅ En camino con tus metas',     className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' },
  warning: { label: '⚠️ Cuidado con los gastos',      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  danger:  { label: '❌ Gastos superan ingresos',     className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' },
};

// ─── Thermometer helpers ─────────────────────────────────────────────────────

function thermometerColor(pct: number): string {
  if (pct > 100) return 'bg-red-500';
  if (pct > 80)  return 'bg-amber-500';
  return 'bg-green-500';
}

function thermometerLabel(pct: number): string {
  if (pct > 100) return '¡Gastos superaron el presupuesto!';
  if (pct > 80)  return 'Acercándose al límite';
  return 'Todo bajo control';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission, isAdminGlobal, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && isAdminGlobal()) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isAdminGlobal, router]);

  // Debts
  const { data: debtsSummary, isLoading: loadingDebts } = useQuery(
    'debtsSummary',
    () => debtsAPI.getSummary(),
    { enabled: hasPermission('debts', 'view'), select: d => d.data },
  );

  // Inventory
  const { data: inventoryDash, isLoading: loadingInventory } = useQuery(
    'inventoryDash',
    () => inventoryAPI.getDashboard(),
    { enabled: hasPermission('inventory', 'view'), select: d => d.data },
  );

  // Budget KPIs — first budget returned
  const { data: budgetData } = useQuery(
    'budgetDashboard',
    () => budgetAPI.getAll(),
    { select: d => d.data },
  );

  const firstBudget = Array.isArray(budgetData) ? budgetData[0] : undefined;
  const budgetSummary = firstBudget?.summary as
    | { totalMonthlyIncome: number; totalMonthlyExpenses: number; available: number; status?: AdvisoryStatus }
    | undefined;

  // Transactions thermometer
  const { data: txSummary } = useQuery(
    'transactionsDashboard',
    () =>
      transactionsAPI.getSummary(
        currentYear,
        currentMonth,
        budgetSummary?.totalMonthlyIncome,
        budgetSummary?.totalMonthlyExpenses,
      ),
    {
      select: d => d.data as {
        totalIncome: number;
        totalExpenses: number;
        expectedExpenses: number;
      },
    },
  );

  const inventoryStats = inventoryDash?.stats;
  const balance = debtsSummary?.balance ?? 0;

  const txPct =
    txSummary && txSummary.expectedExpenses > 0
      ? (txSummary.totalExpenses / txSummary.expectedExpenses) * 100
      : 0;

  const advisoryStatus: AdvisoryStatus = budgetSummary?.status
    ?? (budgetSummary
        ? budgetSummary.available < 0
          ? 'danger'
          : budgetSummary.totalMonthlyExpenses / budgetSummary.totalMonthlyIncome > 0.8
            ? 'warning'
            : 'ok'
        : 'ok');

  if (loadingDebts || loadingInventory) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Cargando dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen general de tus finanzas</p>
      </div>

      {/* ── Budget KPIs row ──────────────────────────────────────────────── */}
      {budgetSummary && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <StatCard
              title="Ingreso mensual"
              value={`$${fmt(budgetSummary.totalMonthlyIncome)}`}
              icon="💰"
              color="green"
            />
            <StatCard
              title="Gastos presupuestados"
              value={`$${fmt(budgetSummary.totalMonthlyExpenses)}`}
              icon="💸"
              color="yellow"
            />
            <StatCard
              title="Disponible"
              value={`$${fmt(Math.abs(budgetSummary.available))}`}
              icon="🏦"
              color={budgetSummary.available >= 0 ? 'green' : 'red'}
              subtitle={budgetSummary.available < 0 ? 'En déficit' : undefined}
            />
          </div>

          {/* Advisory badge */}
          <div className="flex">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${ADVISORY[advisoryStatus].className}`}
            >
              {ADVISORY[advisoryStatus].label}
            </span>
          </div>
        </div>
      )}

      {/* ── Existing stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {hasPermission('debts', 'view') && debtsSummary && (
          <>
            <StatCard
              title="Me deben"
              value={`$${fmt(debtsSummary.totalTheyOweMe)}`}
              icon="💙"
              color="green"
            />
            <StatCard
              title="Debo"
              value={`$${fmt(debtsSummary.totalIOwe)}`}
              icon="❤️"
              color="red"
            />
            <StatCard
              title="Balance"
              value={`$${fmt(balance)}`}
              icon={balance >= 0 ? '✅' : '⚠️'}
              color={balance >= 0 ? 'green' : 'red'}
            />
          </>
        )}
        {hasPermission('inventory', 'view') && inventoryStats && (
          <StatCard
            title="Productos inventario"
            value={inventoryStats.total}
            icon="📦"
            color="blue"
            subtitle={`${inventoryStats.last} en último stock`}
          />
        )}
      </div>

      {/* ── Grid: inventory + transactions thermometer + alerts ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Inventory status */}
        {hasPermission('inventory', 'view') && inventoryStats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" /> Estado del inventario
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{inventoryStats.ok}</div>
                <div className="text-xs text-green-700 dark:text-green-400 font-medium">OK</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inventoryStats.last}</div>
                <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Último</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{inventoryStats.outOfStock}</div>
                <div className="text-xs text-red-700 dark:text-red-400 font-medium">Sin stock</div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions thermometer */}
        {txSummary && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              📊 Transacciones de {currentMonthName}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos reales</span>
                <span className="font-semibold text-green-600 dark:text-green-400">${fmt(txSummary.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Gastos reales</span>
                <span className="font-semibold text-red-600 dark:text-red-400">${fmt(txSummary.totalExpenses)}</span>
              </div>

              {txSummary.expectedExpenses > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>{thermometerLabel(txPct)}</span>
                    <span>{txPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${thermometerColor(txPct)}`}
                      style={{ width: `${Math.min(100, txPct)}%` }}
                    />
                  </div>
                  {txPct > 100 && (
                    <div
                      className="mt-1 h-1 rounded-full bg-red-300 dark:bg-red-700 transition-all duration-500"
                      style={{ width: `${Math.min(100, (txPct - 100) * 2)}%` }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchases link card */}
        {hasPermission('purchases', 'view') && (
          <Link
            href="/purchases"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between group hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">Compras</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ver listas de compras</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </Link>
        )}

        {/* Inventory alerts */}
        {hasPermission('inventory', 'view') && inventoryDash?.stats.last > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-yellow-600 dark:text-yellow-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Alertas de stock
            </h2>
            <div className="space-y-2">
              {inventoryDash.items
                .filter(i => i.status === 'last' || i.status === 'out_of_stock')
                .slice(0, 8)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                    <span className={item.status === 'last' ? 'badge-last' : 'badge-out'}>
                      {item.status === 'last' ? '⚠️ Último' : '❌ Sin stock'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick navigation cards ───────────────────────────────────────── */}
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {NAV_CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="
                bg-white dark:bg-gray-800
                rounded-xl shadow-sm
                border border-gray-200 dark:border-gray-700
                p-3 flex flex-col items-center gap-2
                group hover:border-blue-400 dark:hover:border-blue-500
                hover:shadow-md hover:-translate-y-0.5
                transition-all duration-150
              "
            >
              <span className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {card.icon}
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                {card.label}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
