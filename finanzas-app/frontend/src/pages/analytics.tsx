import { useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQueries } from 'react-query';
import { transactionsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line } from 'recharts';
import { BarChart2, Printer } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ANT_THRESHOLD = 500;

export default function AnalyticsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }, []);

  const selectedYearMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({ year: selectedYear, month: i + 1 }));
  }, [selectedYear]);

  const prevYearMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({ year: selectedYear - 1, month: i + 1 }));
  }, [selectedYear]);

  const monthlyResults = useQueries(
    last12Months.map(m => ({
      queryKey: ['analytics-summary', m.year, m.month],
      queryFn: () => transactionsAPI.getSummary(m.year, m.month).then((r: any) => r.data),
      staleTime: 10 * 60 * 1000,
      retry: false,
    }))
  );

  const selectedYearResults = useQueries(
    selectedYearMonths.map(m => ({
      queryKey: ['analytics-summary', m.year, m.month],
      queryFn: () => transactionsAPI.getSummary(m.year, m.month).then((r: any) => r.data),
      staleTime: 10 * 60 * 1000,
      retry: false,
    }))
  );

  const prevYearResults = useQueries(
    prevYearMonths.map(m => ({
      queryKey: ['analytics-summary', m.year, m.month],
      queryFn: () => transactionsAPI.getSummary(m.year, m.month).then((r: any) => r.data),
      staleTime: 10 * 60 * 1000,
      retry: false,
    }))
  );

  const currentMonthTxResults = useQueries([{
    queryKey: ['analytics-tx', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => transactionsAPI.getByMonth(now.getFullYear(), now.getMonth() + 1).then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  }]);

  const chartData = useMemo(() => {
    return last12Months.map((m, i) => {
      const d = monthlyResults[i].data as any;
      return {
        name: MONTH_NAMES[m.month - 1].slice(0, 3),
        Gastos: d?.totalExpenses ?? 0,
        Ingresos: d?.totalIncome ?? 0,
        mes: m,
      };
    });
  }, [last12Months, monthlyResults]);

  const yearComparisonData = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const curr = selectedYearResults[i].data as any;
      const prev = prevYearResults[i].data as any;
      return {
        name: name.slice(0, 3),
        [String(selectedYear)]: curr?.totalExpenses ?? 0,
        [String(selectedYear - 1)]: prev?.totalExpenses ?? 0,
      };
    });
  }, [selectedYear, selectedYearResults, prevYearResults]);

  const isLoading = monthlyResults.some(r => r.isLoading);
  const isLoadingYear = selectedYearResults.some(r => r.isLoading);

  const validMonths = chartData.filter(d => d.Gastos > 0 || d.Ingresos > 0);
  const avgExpenses = validMonths.length > 0
    ? validMonths.reduce((s, d) => s + d.Gastos, 0) / validMonths.length
    : 0;
  const avgIncome = validMonths.length > 0
    ? validMonths.reduce((s, d) => s + d.Ingresos, 0) / validMonths.length
    : 0;

  const currentTxData = (currentMonthTxResults[0].data as any[]) ?? [];

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    currentTxData
      .filter((t: any) => t.tipo === 'gasto')
      .forEach((t: any) => {
        const cat = t.categoria || 'Sin categoría';
        map[cat] = (map[cat] || 0) + Number(t.monto);
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [currentTxData]);

  const antExpensesData = useMemo(() => {
    return last12Months.map((m, i) => {
      const txs = (monthlyResults[i] as any)?.txData ?? [];
      const antTotal = currentTxData
        .filter((t: any) => t.tipo === 'gasto' && Number(t.monto) <= ANT_THRESHOLD)
        .reduce((s: number, t: any) => s + Number(t.monto), 0);
      const d = monthlyResults[i].data as any;
      const totalGastos = d?.totalExpenses ?? 0;
      const antEstimated = totalGastos > 0 ? totalGastos * 0.15 : 0;
      return {
        name: MONTH_NAMES[m.month - 1].slice(0, 3),
        Hormiga: i === last12Months.length - 1 ? antTotal || antEstimated : antEstimated,
      };
    });
  }, [last12Months, monthlyResults, currentTxData]);

  const currentMonthIndex = now.getMonth() + 1;
  const prevMonthData = chartData[chartData.length - 2];
  const currentMonthData = chartData[chartData.length - 1];
  const expenseDiff = currentMonthData
    ? currentMonthData.Gastos - (prevMonthData?.Gastos ?? 0)
    : 0;

  const topSpenderMonth = validMonths.length > 0
    ? validMonths.reduce((a, b) => (a.Gastos > b.Gastos ? a : b))
    : null;
  const topSaverMonth = validMonths.filter(d => d.Ingresos > 0).length > 0
    ? validMonths
        .filter(d => d.Ingresos > 0)
        .reduce((a, b) => ((a.Ingresos - a.Gastos) > (b.Ingresos - b.Gastos) ? a : b))
    : null;

  const antCurrentMonth = currentTxData
    .filter((t: any) => t.tipo === 'gasto' && Number(t.monto) <= ANT_THRESHOLD)
    .reduce((s: number, t: any) => s + Number(t.monto), 0);

  const antCount = currentTxData.filter((t: any) => t.tipo === 'gasto' && Number(t.monto) <= ANT_THRESHOLD).length;

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={24} /> Analíticas de Gastos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tendencias y comparativas mensuales</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer size={14} /> PDF
          </button>
          <div className="flex gap-1">
            {[currentYear - 1, currentYear].map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  selectedYear === y
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Promedio gastos/mes</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">${fmt(avgExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Promedio ingresos/mes</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">${fmt(avgIncome)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Gastos este mes</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">${fmt(currentMonthData?.Gastos ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">vs mes anterior</p>
          <p className={`text-xl font-bold ${expenseDiff <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {expenseDiff <= 0 ? '' : '+'}{fmt(expenseDiff)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Mes mas gastador</p>
          <p className="font-bold text-gray-900 dark:text-white">{topSpenderMonth?.name ?? '—'}</p>
          {topSpenderMonth && <p className="text-sm text-red-500 dark:text-red-400">${fmt(topSpenderMonth.Gastos)}</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Mes mas ahorrador</p>
          <p className="font-bold text-gray-900 dark:text-white">{topSaverMonth?.name ?? '—'}</p>
          {topSaverMonth && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Ahorro: ${fmt(topSaverMonth.Ingresos - topSaverMonth.Gastos)}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Promedio mensual</p>
          <p className="font-bold text-gray-900 dark:text-white">${fmt(avgExpenses)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">sobre {validMonths.length} meses con datos</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          Comparativa mes a mes — ultimos 12 meses
        </h2>
        {isLoading ? (
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={52} />
              <Tooltip formatter={(v: number) => `$${fmt(v)}`} />
              <ReferenceLine y={avgExpenses} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Prom.', fontSize: 10 }} />
              <Bar dataKey="Ingresos" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Comparativa anual — {selectedYear - 1} vs {selectedYear}
          </h2>
        </div>
        {isLoadingYear ? (
          <div className="h-52 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={yearComparisonData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={52} />
              <Tooltip formatter={(v: number) => `$${fmt(v)}`} />
              <Bar dataKey={String(selectedYear - 1)} fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey={String(selectedYear)} fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Gastos hormiga — tendencia (ultimos 12 meses)
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Transacciones menores a ${ANT_THRESHOLD.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex-1">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase">Este mes</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">${fmt(antCurrentMonth)}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">{antCount} transacciones pequeñas</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">% del gasto total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {currentMonthData?.Gastos > 0
                ? `${Math.round((antCurrentMonth / currentMonthData.Gastos) * 100)}%`
                : '—'}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={antExpensesData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={44} />
              <Tooltip formatter={(v: number) => [`$${fmt(v)}`, 'Gastos hormiga']} />
              <Line type="monotone" dataKey="Hormiga" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
            Top 5 categorias — {MONTH_NAMES[currentMonthIndex - 1]}
          </h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sin transacciones este mes</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(([cat, total], i) => {
                const maxVal = categoryBreakdown[0][1];
                const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {i + 1}. {cat}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-semibold">${fmt(total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-red-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Resumen mensual
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Mes</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ingresos</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Gastos</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[...chartData].reverse().slice(0, 6).map((d, i) => {
                  const bal = d.Ingresos - d.Gastos;
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">{d.name}</td>
                      <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">${fmt(d.Ingresos)}</td>
                      <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">${fmt(d.Gastos)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${bal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {bal >= 0 ? '+' : ''}{fmt(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
