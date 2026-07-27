import Link from 'next/link';
import { ArrowRight, Wallet, TrendingUp, Target, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    num: 1, done: false, icon: <Wallet size={20} />, title: 'Creá tu presupuesto',
    desc: 'Definí tus ingresos mensuales y distribuí en categorías de gastos.',
    href: '/presupuesto', cta: 'Ir a Presupuesto',
  },
  {
    num: 2, done: false, icon: <TrendingUp size={20} />, title: 'Registrá transacciones',
    desc: 'Llevá un registro de tus ingresos y gastos reales cada mes.',
    href: '/transacciones', cta: 'Ver Transacciones',
  },
  {
    num: 3, done: false, icon: <Target size={20} />, title: 'Establecé metas de ahorro',
    desc: 'Definí objetivos concretos y hacé seguimiento de tu progreso.',
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
  if (allDone) return null;

  const completedCount = steps.filter(s => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👋</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bienvenido a Mi Casa Pro</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Completá estos pasos para empezar a controlar tus finanzas.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pct}%</div>
          <div className="text-xs text-gray-500">{completedCount}/{steps.length} listo</div>
        </div>
      </div>

      <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2 mb-5">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map(step => (
          <div
            key={step.num}
            className={`rounded-xl p-4 border transition-all ${
              step.done
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 opacity-75'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                step.done
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              }`}>
                {step.done ? <CheckCircle size={20} /> : step.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                step.done
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.done ? 'Listo' : `Paso ${step.num}`}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{step.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{step.desc}</p>
            {!step.done && (
              <Link
                href={step.href}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
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
