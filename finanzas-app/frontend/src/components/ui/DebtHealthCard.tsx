import { useQuery } from 'react-query';
import Link from 'next/link';
import { summaryAPI } from '../../services/api';
import { useCurrencyFormatter } from '../../lib/currency';

export type DebtHealthStatus = 'sin_deudas' | 'bien' | 'atencion' | 'riesgo';
export type DebtHorizon = 'ninguno' | 'corto' | 'mediano' | 'largo' | 'no_alcanza';

export interface DebtHealth {
  status: DebtHealthStatus;
  debtToIncomePercent: number | null;
  monthlyIncome: number;
  monthlyDebtService: number;
  available: number;
  extraPayment: number;
  totalBalance: number;
  monthsToPayoff: number;
  horizon: DebtHorizon;
  feasible: boolean;
  lines: unknown[];
}

const VERDICT: Record<Exclude<DebtHealthStatus, 'sin_deudas'>, { title: string; tone: string; bar: string }> = {
  bien:     { title: 'Vas bien con tus deudas',    tone: 'text-ok-ink',     bar: 'bg-success' },
  atencion: { title: 'Atención con tus deudas',    tone: 'text-warn-ink',   bar: 'bg-warning' },
  riesgo:   { title: 'Tus deudas están en riesgo', tone: 'text-danger-ink', bar: 'bg-danger' },
};

const HORIZON_LABEL: Record<'corto' | 'mediano' | 'largo', string> = {
  corto: 'corto plazo',
  mediano: 'mediano plazo',
  largo: 'largo plazo',
};

function payoffText(data: DebtHealth): string {
  if (data.horizon === 'no_alcanza') {
    return 'Con tu margen actual los pagos no cubren los intereses: la deuda no baja.';
  }
  if (data.horizon === 'ninguno') return '';
  return `Podrías saldarlas en ${data.monthsToPayoff} meses (${HORIZON_LABEL[data.horizon]}).`;
}

export function DebtHealthView({ data, fmt }: { data: DebtHealth; fmt: (n: number) => string }) {
  if (data.status === 'sin_deudas') return null;
  const verdict = VERDICT[data.status];
  const ratio = data.debtToIncomePercent;
  const barWidth = ratio === null ? 100 : Math.min(100, Math.max(0, ratio));

  return (
    <section
      aria-label="Salud de tus deudas"
      className="rounded-[14px] border border-border-light bg-surface-container-lowest dark:bg-surface-container-low shadow-soft p-5"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-label-upper text-label-upper uppercase text-on-surface-variant">Salud de tus deudas</h3>
          <p className={`text-sm font-semibold mt-1 ${verdict.tone}`}>{verdict.title}</p>
        </div>
        <Link href="/payoff" className="text-xs font-semibold text-info-ink hover:underline shrink-0">Ver plan de pago</Link>
      </div>

      <div className="h-2 bg-surface-variant rounded-full overflow-hidden mb-4" aria-hidden="true">
        <div className={`h-2 rounded-full transition-all duration-700 ${verdict.bar}`} style={{ width: `${barWidth}%` }} />
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <dt className="text-on-surface-variant">Deuda / ingreso</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{ratio === null ? '—' : `${ratio}%`}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Pago mensual de deudas</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{fmt(data.monthlyDebtService)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Margen para abonar extra</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{fmt(data.extraPayment)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Total adeudado</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{fmt(data.totalBalance)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-on-surface-variant">{payoffText(data)}</p>
      {data.available < 0 && (
        <p className="mt-1 text-xs text-danger-ink">Tus gastos superan tus ingresos: no queda margen para abonar a las deudas.</p>
      )}
    </section>
  );
}

export function DebtHealthCard() {
  const { fmt } = useCurrencyFormatter();
  const { data, isLoading } = useQuery<DebtHealth>(
    'debt-health',
    () => summaryAPI.getDebtHealth().then(r => r.data),
    { retry: false, staleTime: 60000 },
  );

  if (isLoading) return <div className="skeleton h-32 rounded-[14px]" />;
  if (!data) return null;
  return <DebtHealthView data={data} fmt={fmt} />;
}
