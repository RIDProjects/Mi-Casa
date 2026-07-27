import { useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQueries } from 'react-query';
import { transactionsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line } from 'recharts';
import { BarChart2, Printer } from 'lucide-react';
import { fmt, MONTH_NAMES } from '../lib/format';

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
          <h1 className="font-page-title text-page-title text-on-surface flex items-center gap-2">
            <BarChart2 size={24} /> Analíticas de Gastos
          </h1>
          <p className="text-on-surface-variant mt-1">Tendencias y comparativas mensuales</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-outline-variant rounded-lg hover:bg-surface-gray transition-colors text-on-surface-variant"
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
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Promedio gastos/mes</p>
          <p className="text-xl font-bold text-danger">${fmt(avgExpenses)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Promedio ingresos/mes</p>
          <p className="text-xl font-bold text-success">${fmt(avgIncome)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Gastos este mes</p>
          <p className="text-xl font-bold text-on-surface">${fmt(currentMonthData?.Gastos ?? 0)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">vs mes anterior</p>
          <p className={`text-xl font-bold ${expenseDiff <= 0 ? 'text-success' : 'text-danger'}`}>
            {expenseDiff <= 0 ? '' : '+'}{fmt(expenseDiff)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Mes mas gastador</p>
          <p className="font-bold text-on-surface">{topSpenderMonth?.name ?? '—'}</p>
          {topSpenderMonth && <p className="text-sm text-danger">${fmt(topSpenderMonth.Gastos)}</p>}
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Mes mas ahorrador</p>
          <p className="font-bold text-on-surface">{topSaverMonth?.name ?? '—'}</p>
          {topSaverMonth && (
            <p className="text-sm text-success">
              Ahorro: ${fmt(topSaverMonth.Ingresos - topSaverMonth.Gastos)}
            </p>
          )}
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Promedio mensual</p>
          <p className="font-bold text-on-surface">${fmt(avgExpenses)}</p>
          <p className="text-xs text-outline">sobre {validMonths.length} meses con datos</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 mb-6 shadow-sm">
        <h2 className="font-label-upper text-label-upper text-on-surface-variant mb-4">
          Comparativa mes a mes — ultimos 12 meses
        </h2>
        {isLoading ? (
          <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
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

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-label-upper text-label-upper text-on-surface-variant">
            Comparativa anual — {selectedYear - 1} vs {selectedYear}
          </h2>
        </div>
        {isLoadingYear ? (
          <div className="h-52 bg-surface-container rounded-xl animate-pulse" />
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

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="font-label-upper text-label-upper text-on-surface-variant">
            Gastos hormiga — tendencia (ultimos 12 meses)
          </h2>
          <span className="text-xs text-outline">
            Transacciones menores a ${ANT_THRESHOLD.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex-1">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase">Este mes</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">${fmt(antCurrentMonth)}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">{antCount} transacciones pequeñas</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 flex-1">
            <p className="font-label-upper text-label-upper text-on-surface-variant">% del gasto total</p>
            <p className="text-lg font-bold text-on-surface">
              {currentMonthData?.Gastos > 0
                ? `${Math.round((antCurrentMonth / currentMonthData.Gastos) * 100)}%`
                : '—'}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="h-32 bg-surface-container rounded-xl animate-pulse" />
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
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <h2 className="font-label-upper text-label-upper text-on-surface-variant mb-4">
            Top 5 categorias — {MONTH_NAMES[currentMonthIndex - 1]}
          </h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-outline text-center py-8">Sin transacciones este mes</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(([cat, total], i) => {
                const maxVal = categoryBreakdown[0][1];
                const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-on-surface-variant">
                        {i + 1}. {cat}
                      </span>
                      <span className="text-danger font-semibold">${fmt(total)}</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-2">
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

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <h2 className="font-label-upper text-label-upper text-on-surface-variant">
              Resumen mensual
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant">Mes</th>
                  <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Ingresos</th>
                  <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Gastos</th>
                  <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {[...chartData].reverse().slice(0, 6).map((d, i) => {
                  const bal = d.Ingresos - d.Gastos;
                  return (
                    <tr key={i} className="hover:bg-surface-gray">
                      <td className="px-4 py-2 text-on-surface-variant font-medium">{d.name}</td>
                      <td className="px-4 py-2 text-right text-success">${fmt(d.Ingresos)}</td>
                      <td className="px-4 py-2 text-right text-danger">${fmt(d.Gastos)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${bal >= 0 ? 'text-success' : 'text-danger'}`}>
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
