import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Wallet, TrendingUp, Target, Check, X } from 'lucide-react';

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
    <section
      aria-label="Primeros pasos"
      className="mb-8 rounded-2xl border border-border-light bg-panel shadow-premium p-5 animate-fade-up"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-on-surface tracking-tight">Primeros pasos en Mi Casa Pro</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Completa estos pasos para empezar a controlar tus finanzas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-lg font-bold text-info-ink fin-number">{pct}%</span>
            <span className="block text-[11px] text-on-surface-variant -mt-0.5">{completedCount} de {steps.length}</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Ocultar primeros pasos"
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-variant transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className="mt-4 h-1.5 bg-surface-variant rounded-full overflow-hidden"
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      >
        <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map(step => {
          const inner = (
            <>
              <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                step.done ? 'bg-success text-white' : 'bg-primary-container/10 text-info-ink'
              }`}>
                {step.done ? <Check size={18} strokeWidth={3} /> : step.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${step.done ? 'text-on-surface-variant line-through decoration-outline-variant' : 'text-on-surface'}`}>
                  {step.title}
                </span>
                <span className="block text-xs text-on-surface-variant mt-0.5 leading-relaxed">{step.desc}</span>
              </span>
              {!step.done && <ArrowRight size={16} className="shrink-0 mt-2 text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all" />}
            </>
          );
          const cls = `group flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
            step.done ? 'border-border-light bg-surface-gray' : 'border-border-light hover:border-primary-container/40 hover:bg-surface-low'
          }`;
          return (
            <li key={step.num}>
              {step.done
                ? <div className={cls}>{inner}</div>
                : <Link href={step.href} className={cls} aria-label={step.cta}>{inner}</Link>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
