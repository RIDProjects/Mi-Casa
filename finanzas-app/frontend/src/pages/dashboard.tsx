import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { debtsAPI, inventoryAPI } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { useAuthStore } from '../store/auth.store';
import { CheckCircle, AlertTriangle, Package } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n || 0);

const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const currentYear = new Date().getFullYear();

interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface MonthData {
  products: Product[];
  montoUSD: number;
  tasaCambio: number;
}

type StorageData = Record<string, MonthData>;

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission, isAdminGlobal, isAuthenticated } = useAuthStore();

  // Redirect admin global to admin dashboard
  useEffect(() => {
    if (isAuthenticated && isAdminGlobal()) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isAdminGlobal, router]);
  const [purchasesData, setPurchasesData] = useState<StorageData>({});
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonth}`);

  // Cargar datos de compras desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem('purchases-data');
    if (stored) {
      const data = JSON.parse(stored);
      setPurchasesData(data);
    }
  }, []);

  const { data: debtsSummary, isLoading: loadingDebts } = useQuery('debtsSummary', () => debtsAPI.getSummary(), {
    enabled: hasPermission('debts', 'view'),
    select: d => d.data,
  });

  const { data: inventoryDash, isLoading: loadingInventory } = useQuery('inventoryDash', () => inventoryAPI.getDashboard(), {
    enabled: hasPermission('inventory', 'view'),
    select: d => d.data,
  });

  const inventoryStats = inventoryDash?.stats;
  const balance = debtsSummary?.balance ?? 0;

  // Calcular compras del mes actual desde localStorage
  const currentMonthData = purchasesData[selectedMonth] || { products: [], montoUSD: 0, tasaCambio: 515 };
  const products = currentMonthData.products || [];
  const tasaCambio = currentMonthData.tasaCambio || 515;
  const montoUSD = currentMonthData.montoUSD || 0;

  // Cálculos: igual que en purchases.tsx
  const totalRealCUP = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const totalRealUSD = tasaCambio > 0 ? totalRealCUP / tasaCambio : 0;
  const presupuestoCUP = montoUSD * tasaCambio;
  const presupuestoUSD = montoUSD;
  const diferenciaUSD = presupuestoUSD - totalRealUSD;
  const budgetPercentage = presupuestoUSD > 0 ? (totalRealUSD / presupuestoUSD) * 100 : 0;

  const currentMonthName = MONTHS.find(m => `${currentYear}-${m.value}` === selectedMonth)?.label || '';

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {hasPermission('debts', 'view') && debtsSummary && (
          <>
            <StatCard title="Me deben" value={`$${fmt(debtsSummary.totalTheyOweMe)}`} icon="💙" color="green" />
            <StatCard title="Debo" value={`$${fmt(debtsSummary.totalIOwe)}`} icon="❤️" color="red" />
            <StatCard title="Balance" value={`$${fmt(balance)}`} icon={balance >= 0 ? '✅' : '⚠️'} color={balance >= 0 ? 'green' : 'red'} />
          </>
        )}
        {hasPermission('inventory', 'view') && inventoryStats && (
          <StatCard title="Productos inventario" value={inventoryStats.total} icon="📦" color="blue"
            subtitle={`${inventoryStats.last} en último stock`} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {hasPermission('purchases', 'view') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🛒 Compras de {currentMonthName}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total gastado (USD)</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">${fmt(totalRealUSD)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Presupuesto (USD)</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">${fmt(presupuestoUSD)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Productos</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{products.length}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Diferencia</span>
                  <span className={`font-bold ${diferenciaUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {diferenciaUSD >= 0 ? '+' : ''}${fmt(Math.abs(diferenciaUSD))}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${budgetPercentage > 100 ? 'bg-red-500' : budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, budgetPercentage)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {budgetPercentage.toFixed(0)}% del presupuesto usado
                </p>
              </div>
            </div>
          </div>
        )}

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
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
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
    </Layout>
  );
}
