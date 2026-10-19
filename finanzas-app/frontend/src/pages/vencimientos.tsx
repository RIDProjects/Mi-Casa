import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery } from 'react-query';
import { upcomingBillsAPI } from '../services/api';
import { Calendar, AlertTriangle, RefreshCw, CheckCircle, CreditCard, Landmark, Package, ClipboardList } from 'lucide-react';

import { useCurrencyFormatter } from '../lib/currency';
import { parseLocalDate } from '../lib/dates';

const FILTER_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
  { label: '60 días', value: 60 },
];

const TYPE_ICONS: Record<string, JSX.Element> = {
  credit_card: <CreditCard size={18} />,
  loan: <Landmark size={18} />,
  cuota: <Package size={18} />,
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyClasses(days: number) {
  if (days <= 3) return { badge: 'bg-danger/15 text-danger-ink ', border: 'border-danger/25 ', dot: 'bg-danger' };
  if (days <= 7) return { badge: 'bg-warning/15 text-warn-ink ', border: 'border-warning/25 ', dot: 'bg-warning' };
  return { badge: 'bg-success/15 text-ok-ink ', border: 'border-outline-variant', dot: 'bg-success' };
}

export default function VencimientosPage() {
  const { fmt: cfmt } = useCurrencyFormatter();
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery(
    ['upcoming-bills', days],
    () => upcomingBillsAPI.get(days).then(r => r.data),
    { staleTime: 5 * 60 * 1000 }
  );

  const bills: any[] = Array.isArray(data?.bills ?? data) ? (data?.bills ?? data) : [];
  const sorted = [...bills].sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
  const totalDue = sorted.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface flex items-center gap-2">
            <Calendar size={24} /> Próximos Vencimientos
          </h1>
          <p className="text-on-surface-variant mt-1">Pagos pendientes ordenados por fecha</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDays(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              days === opt.value
                ? 'bg-primary-container text-white'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary-container'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger-ink" />
          <p className="text-on-surface-variant">Error al cargar los vencimientos</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="icon-emerald !p-4 !rounded-2xl mb-4 inline-flex"><CheckCircle size={32} /></div>
          <h3 className="text-lg font-semibold text-on-surface">Sin vencimientos próximos</h3>
          <p className="font-body-default text-on-surface-variant mt-1">No hay pagos pendientes en los próximos {days} días</p>
        </div>
      ) : (
        <>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 mb-4 shadow-sm flex items-center justify-between">
            <p className="font-body-default text-on-surface-variant">
              <span className="font-semibold text-on-surface">{sorted.length}</span> vencimiento{sorted.length !== 1 ? 's' : ''} en los próximos <span className="font-semibold">{days} días</span>
            </p>
            <div className="text-right">
              <p className="text-xs text-on-surface-variant uppercase tracking-wide">Total a pagar</p>
              <p className="text-xl font-bold text-danger-ink">{cfmt(totalDue)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {sorted.map((bill: any, idx: number) => {
              const d = daysUntil(bill.dueDate);
              const { badge, border, dot } = urgencyClasses(d);
              const icon = TYPE_ICONS[bill.type] ?? <ClipboardList size={18} />;
              const dateLabel = parseLocalDate(bill.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

              return (
                <div key={bill.id ?? idx} className={`bg-surface-container-lowest rounded-xl border ${border} shadow-sm p-4 flex items-center gap-4`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface truncate">{bill.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{dateLabel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-on-surface">{cfmt(Number(bill.amount || 0))}</p>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
                      {d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `en ${d} días`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
