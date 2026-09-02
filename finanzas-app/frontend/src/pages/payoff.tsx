import { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { debtPayoffAPI } from '../services/api';
import { TrendingDown, Award, AlertTriangle, RefreshCw } from 'lucide-react';

import { useCurrencyFormatter } from '../lib/currency';

const fmtMonth = (months: number) => {
  if (months === 0) return '0 meses';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} año${y !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} mes${m !== 1 ? 'es' : ''}`);
  return parts.join(' y ');
};

const STRATEGY_META: Record<string, { label: string; subtitle: string; color: string; icon: string }> = {
  minimum: {
    label: 'Solo mínimos',
    subtitle: 'Sin pago extra',
    color: 'border-outline-variant',
    icon: '📉',
  },
  avalanche: {
    label: 'Avalancha',
    subtitle: 'Mayor tasa primero',
    color: 'border-blue-400 dark:border-blue-500',
    icon: '🧊',
  },
  snowball: {
    label: 'Bola de nieve',
    subtitle: 'Menor saldo primero',
    color: 'border-purple-400 dark:border-purple-500',
    icon: '⛄',
  },
};

export default function PayoffPage() {
  const { fmt: cfmt } = useCurrencyFormatter();
  const [extraPayment, setExtraPayment] = useState(0);
  const [debouncedExtra, setDebouncedExtra] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedExtra(extraPayment), 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [extraPayment]);

  const { data, isLoading, isError, refetch } = useQuery(
    ['debt-payoff', debouncedExtra],
    () => debtPayoffAPI.getStrategies(debouncedExtra).then(r => r.data),
    { staleTime: 60_000, keepPreviousData: true }
  );

  const strategies = data?.strategies ?? {};
  const minimumMonths: number = strategies.minimum?.totalMonths ?? 0;
  const avalancheInterestSaved: number = strategies.avalanche?.interestSaved ?? 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-page-title text-page-title text-on-surface flex items-center gap-2">
          <TrendingDown size={24} /> Calculadora de Liquidación de Deudas
        </h1>
        <p className="text-on-surface-variant mt-1">Compará estrategias para salir de deudas más rápido</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6 shadow-sm">
        <label className="block text-sm font-semibold text-on-surface mb-2">
          Pago extra mensual disponible
        </label>
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant text-lg font-medium">$</span>
          <input
            type="number"
            min="0"
            step="100"
            className="input max-w-xs"
            value={extraPayment === 0 ? '' : extraPayment}
            onChange={e => setExtraPayment(Number(e.target.value) || 0)}
            placeholder="0"
          />
          {isLoading && (
            <span className="text-xs text-outline animate-pulse">Calculando...</span>
          )}
        </div>
        <p className="text-xs text-outline mt-1">
          Este monto se aplica adicionalmente a los pagos mínimos de cada deuda
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger" />
          <p className="text-on-surface-variant">Error al calcular estrategias</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      ) : !data && !isLoading ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💸</div>
          <h3 className="text-lg font-semibold text-on-surface">Sin deudas registradas</h3>
          <p className="text-sm text-on-surface-variant mt-1">Registrá tarjetas y créditos para calcular estrategias de pago</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(['minimum', 'avalanche', 'snowball'] as const).map(key => {
              const s = strategies[key];
              const meta = STRATEGY_META[key];
              const isRecommended = key === 'avalanche' && avalancheInterestSaved > 0;
              if (!s) return null;

              const monthsSaved = minimumMonths - (s.totalMonths ?? 0);
              const interestSaved = s.interestSaved ?? 0;

              return (
                <div
                  key={key}
                  className={`bg-surface-container-lowest rounded-xl border-2 ${meta.color} shadow-sm p-5 relative`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        <Award size={11} /> Recomendada
                      </span>
                    </div>
                  )}
                  <div className="text-3xl mb-2">{meta.icon}</div>
                  <h3 className="font-bold text-on-surface">{meta.label}</h3>
                  <p className="text-xs text-on-surface-variant mb-4">{meta.subtitle}</p>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-on-surface-variant">Tiempo total</p>
                      <p className="font-semibold text-on-surface text-sm">{fmtMonth(s.totalMonths ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Total intereses</p>
                      <p className="font-semibold text-danger text-sm">{cfmt(s.totalInterest ?? 0)}</p>
                    </div>
                    {key !== 'minimum' && monthsSaved > 0 && (
                      <div className="pt-2 border-t border-outline-variant">
                        <p className="text-xs text-success font-medium">
                          {fmtMonth(monthsSaved)} menos que solo mínimos
                        </p>
                      </div>
                    )}
                    {key !== 'minimum' && interestSaved > 0 && (
                      <div>
                        <p className="text-xs text-success font-medium">
                          Ahorrás {cfmt(interestSaved)} en intereses
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {(['avalanche', 'snowball'] as const).map(key => {
            const s = strategies[key];
            if (!s?.debtOrder?.length) return null;
            const meta = STRATEGY_META[key];

            return (
              <div key={key} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                  <h2 className="font-label-upper text-label-upper text-on-surface-variant">
                    {meta.icon} Orden de pago — {meta.label}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-container-low border-b border-outline-variant">
                      <tr>
                        <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant">#</th>
                        <th className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant">Deuda</th>
                        <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Saldo</th>
                        <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Tasa</th>
                        <th className="px-4 py-2 text-right font-label-upper text-label-upper text-on-surface-variant">Liquidación estimada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {s.debtOrder.map((d: any, i: number) => (
                        <tr key={d.id ?? i} className="hover:bg-surface-gray">
                          <td className="px-4 py-3 text-on-surface-variant font-bold">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-on-surface">{d.name}</td>
                          <td className="px-4 py-3 text-right text-danger">{cfmt(d.balance ?? d.saldo ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-on-surface-variant">
                            {d.rate != null ? `${d.rate}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-on-surface-variant">
                            {d.payoffDate
                              ? new Date(d.payoffDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                              : d.payoffMonths != null ? fmtMonth(d.payoffMonths) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </Layout>
  );
}
