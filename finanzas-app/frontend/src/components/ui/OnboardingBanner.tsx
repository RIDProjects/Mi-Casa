import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Wallet, TrendingUp, Target, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    num: 1, done: false, icon: <Wallet size={20} />, title: 'Crea tu presupuesto',
    desc: 'Define tus ingresos mensuales y distribuye en categorías de gastos.',
    href: '/presupuesto', cta: 'Ir a Presupuesto',
  },
  {
    num: 2, done: false, icon: <TrendingUp size={20} />, title: 'Registra transacciones',
    desc: 'Lleva un registro de tus ingresos y gastos reales cada mes.',
    href: '/transacciones', cta: 'Ver Transacciones',
  },
  {
    num: 3, done: false, icon: <Target size={20} />, title: 'Establece metas de ahorro',
    desc: 'Define objetivos concretos y haz seguimiento de tu progreso.',
    href: '/metas', cta: 'Crear Meta',
  },
];

interface Props {
  hasBudget: boolean;
  hasTransactions: boolean;
  hasGoals: boolean;
}

export function OnboardingBanner({ hasBudget, hasTransactions, hasGoals }: Props) {
  const steps = [
    { ...STEPS[0], done: hasBudget },
    { ...STEPS[1], done: hasTransactions },
    { ...STEPS[2], done: hasGoals },
  ];

  const allDone = steps.every(s => s.done);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!allDone) return;
    const timer = setTimeout(() => setDismissed(true), 1800);
    return () => clearTimeout(timer);
  }, [allDone]);

  if (dismissed) return null;

  const completedCount = steps.filter(s => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-6 bg-primary-container/[0.06] border border-primary-container/25 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👋</span>
            <h2 className="text-lg font-bold text-on-surface">Bienvenido a Mi Casa Pro</h2>
          </div>
          <p className="text-sm text-on-surface-variant">
            Completa estos pasos para empezar a controlar tus finanzas.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-info-ink">{pct}%</div>
          <div className="text-xs text-on-surface-variant">{completedCount}/{steps.length} listo</div>
        </div>
      </div>

      <div className="w-full bg-primary-container/15 rounded-full h-2 mb-5">
        <div
          className="bg-primary-container h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map(step => (
          <div
            key={step.num}
            className={`rounded-xl p-4 border transition-all ${
              step.done
                ? 'bg-success/10 border-success/25 opacity-75'
                : 'bg-panel border-border-light hover:border-primary-container/25 '
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                step.done
                  ? 'bg-success/15 text-ok-ink '
                  : 'bg-primary-container/15 text-info-ink '
              }`}>
                {step.done ? <CheckCircle size={20} /> : step.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                step.done
                  ? 'bg-success/15 text-ok-ink '
                  : 'bg-surface-container text-on-surface-variant '
              }`}>
                {step.done ? 'Listo' : `Paso ${step.num}`}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-1">{step.title}</h3>
            <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">{step.desc}</p>
            {!step.done && (
              <Link
                href={step.href}
                className="flex items-center gap-1 text-xs font-semibold text-info-ink hover:gap-2 transition-all"
              >
                {step.cta} <ArrowRight size={13} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
