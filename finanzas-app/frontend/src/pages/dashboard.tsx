import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { debtsAPI, inventoryAPI, purchasesAPI, emergencyFundAPI } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { useAuthStore } from '../store/auth.store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n);

export default function Dashboard() {
  const { hasPermission } = useAuthStore();

  const { data: debtsSummary, isLoading: loadingDebts } = useQuery('debtsSummary', () => debtsAPI.getSummary(), {
    enabled: hasPermission('debts', 'view'),
    select: d => d.data,
  });

  const { data: inventoryDash, isLoading: loadingInventory } = useQuery('inventoryDash', () => inventoryAPI.getDashboard(), {
    enabled: hasPermission('inventory', 'view'),
    select: d => d.data,
  });

  const { data: purchaseLists, isLoading: loadingPurchases } = useQuery('purchaseLists', () => purchasesAPI.getLists(), {
    enabled: hasPermission('purchases', 'view'),
    select: d => d.data,
  });

  if (loadingDebts || loadingInventory || loadingPurchases) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando dashboard...</div>
        </div>
      </Layout>
    );
  }

  const inventoryStats = inventoryDash?.stats;
  const inventoryPieData = inventoryStats ? [
    { name: 'OK', value: inventoryStats.ok, color: '#22c55e' },
    { name: 'Último', value: inventoryStats.last, color: '#f59e0b' },
    { name: 'Sin stock', value: inventoryStats.outOfStock, color: '#ef4444' },
  ] : [];

  const balance = debtsSummary?.balance ?? 0;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general de tus finanzas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Estado del inventario</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={inventoryPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                  {inventoryPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {hasPermission('inventory', 'view') && inventoryDash?.stats.last > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">⚠️ Alertas de stock</h2>
            <div className="space-y-2">
              {inventoryDash.items
                .filter(i => i.status === 'last' || i.status === 'out_of_stock')
                .slice(0, 8)
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-gray-700">{item.name}</span>
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