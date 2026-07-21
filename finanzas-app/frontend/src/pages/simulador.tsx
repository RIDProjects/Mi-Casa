import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { Calculator } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import StatCard from '../components/ui/StatCard';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

function calcPayment(amount: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  if (annualRate === 0) return amount / months;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, months);
  return (amount * r * factor) / (factor - 1);
}

interface AmortRow {
  cuota: number;
  pago: number;
  capital: number;
  interes: number;
  saldo: number;
}

function buildAmortization(amount: number, annualRate: number, months: number, payment: number): AmortRow[] {
  const rows: AmortRow[] = [];
  const r = annualRate === 0 ? 0 : annualRate / 100 / 12;
  let balance = amount;

  for (let i = 1; i <= months; i++) {
    const interes = balance * r;
    const capital = payment - interes;
    balance = Math.max(balance - capital, 0);
    rows.push({
      cuota: i,
      pago: payment,
      capital,
      interes,
      saldo: balance,
    });
    if (balance <= 0) break;
  }
  return rows;
}

export default function SimuladorPage() {
  const [amount, setAmount] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [months, setMonths] = useState<number>(12);
  const [showAll, setShowAll] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(rate) || 0;

  const payment = useMemo(
    () => calcPayment(numAmount, numRate, months),
    [numAmount, numRate, months]
  );

  const totalPago = payment * months;
  const totalIntereses = totalPago - numAmount;
  const pctIntereses = totalPago > 0 ? (totalIntereses / totalPago) * 100 : 0;

  const amortization = useMemo(
    () => (numAmount > 0 && months > 0 ? buildAmortization(numAmount, numRate, months, payment) : []),
    [numAmount, numRate, months, payment]
  );

  const displayedRows = showAll ? amortization : amortization.slice(0, 24);
  const hasMore = amortization.length > 24;

  const hasResults = numAmount > 0 && months > 0;

  return (
    <Layout>
      <PageHeader
        title={<><Calculator size={24} /> Simulador de Crédito</>}
        subtitle="Calculá cuotas, intereses y tabla de amortización"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
          <h2 className="font-label-upper text-label-upper text-on-surface-variant mb-4">
            Parámetros del préstamo
          </h2>

          <div className="space-y-5">
            <CurrencyInput
              id="sim-monto"
              label="Monto del préstamo"
              value={amount}
              onChange={value => setAmount(value)}
              placeholder="100,000.00"
            />

            <Input
              id="sim-tasa"
              label="Tasa de interés anual (%)"
              type="number"
              step="0.01"
              min="0"
              max="200"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="12.00"
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0" htmlFor="sim-plazo">Plazo</label>
                <span className="text-sm font-semibold text-primary">
                  {months} {months === 1 ? 'mes' : 'meses'}
                  {months >= 12 ? ` (${(months / 12).toFixed(1)} años)` : ''}
                </span>
              </div>
              <input
                id="sim-plazo"
                type="range"
                min="1"
                max="360"
                step="1"
                className="w-full accent-blue-500"
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-outline mt-1">
                <span>1 mes</span>
                <span>30 años</span>
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Plazos rápidos</p>
              <div className="flex flex-wrap gap-2">
                {[6, 12, 24, 36, 48, 60, 120, 180, 240].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                      months === m
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-outline-variant text-on-surface-variant hover:border-blue-400'
                    }`}
                  >
                    {m >= 12 ? `${m / 12}a` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
          <h2 className="font-label-upper text-label-upper text-on-surface-variant mb-4">
            Resultados
          </h2>

          {!hasResults ? (
            <div className="flex flex-col items-center justify-center h-40 text-outline">
              <Calculator size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Ingresá un monto y plazo para ver los resultados</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-primary uppercase mb-1">Cuota mensual</p>
                <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">${fmt(payment)}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-container-low rounded-lg p-3 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">Total a pagar</p>
                  <p className="text-base font-bold text-on-surface">${fmt(totalPago)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">Total intereses</p>
                  <p className="text-base font-bold text-danger">${fmt(totalIntereses)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">% intereses</p>
                  <p className="text-base font-bold text-warning">{pctIntereses.toFixed(1)}%</p>
                </div>
              </div>

              {/* Interest bar */}
              <div>
                <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                  <span>Capital: ${fmt(numAmount)}</span>
                  <span>Intereses: ${fmt(totalIntereses)}</span>
                </div>
                <div
                  className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex"
                  role="img"
                  aria-label={`Distribución del préstamo: ${(totalPago > 0 ? (numAmount / totalPago) * 100 : 0).toFixed(1)}% capital, ${pctIntereses.toFixed(1)}% intereses`}
                >
                  <div
                    aria-hidden="true"
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${totalPago > 0 ? (numAmount / totalPago) * 100 : 0}%` }}
                  />
                  <div
                    aria-hidden="true"
                    className="h-full bg-red-400 transition-all duration-500"
                    style={{ width: `${pctIntereses}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="flex items-center gap-1 text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Capital
                  </span>
                  <span className="flex items-center gap-1 text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Intereses
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary StatCards */}
      {hasResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard title="Cuota mensual" value={`$${fmt(payment)}`} color="blue" />
          <StatCard title="Total a pagar" value={`$${fmt(totalPago)}`} color="gray" />
          <StatCard title="Total intereses" value={`$${fmt(totalIntereses)}`} color="red" />
          <StatCard title="Costo financiero" value={`${pctIntereses.toFixed(1)}%`} color="yellow" />
        </div>
      )}

      {/* Amortization table */}
      {amortization.length > 0 && (
        <div className="mt-6 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <h2 className="font-semibold text-on-surface text-sm uppercase tracking-wide">
              Tabla de amortización — {amortization.length} cuotas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-on-surface-variant uppercase">Cuota</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Pago</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Capital</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Interés</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Saldo restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {displayedRows.map(row => (
                  <tr key={row.cuota} className="hover:bg-surface-gray transition-colors">
                    <td className="px-4 py-2 text-center text-on-surface-variant font-medium">{row.cuota}</td>
                    <td className="px-4 py-2 text-right text-on-surface">${fmt(row.pago)}</td>
                    <td className="px-4 py-2 text-right text-primary">${fmt(row.capital)}</td>
                    <td className="px-4 py-2 text-right text-red-500 dark:text-red-400">${fmt(row.interes)}</td>
                    <td className="px-4 py-2 text-right font-medium text-on-surface">${fmt(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="px-4 py-3 border-t border-outline-variant text-center">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {showAll
                  ? 'Ver menos'
                  : `Ver todas las ${amortization.length} cuotas`}
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
