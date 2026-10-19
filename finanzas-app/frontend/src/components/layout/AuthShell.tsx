import React from 'react';
import { ArrowLeft, Moon, PiggyBank, Receipt, Sun, TrendingDown } from 'lucide-react';
import MiCasaProLogo from '../ui/MiCasaProLogo';
import { useThemeStore } from '../../store/theme.store';

interface AuthShellProps {
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

const HIGHLIGHTS = [
  { icon: Receipt,      title: 'Presupuesto y gastos al día',  text: 'Registra cada movimiento y sabe cuánto te queda del mes.' },
  { icon: TrendingDown, title: 'Deudas y cuotas bajo control', text: 'Simula pagos y elige la estrategia para liquidarlas antes.' },
  { icon: PiggyBank,    title: 'Metas de ahorro e inversión',  text: 'Sigue tu fondo de emergencia y tu patrimonio en un solo lugar.' },
];

export default function AuthShell({ subtitle, children, onBack, backLabel = 'Volver' }: AuthShellProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-surface text-on-surface">
      {/* Brand panel (always dark) */}
      <aside className="auth-brand hidden lg:flex flex-col justify-between p-12 xl:p-16 text-white relative overflow-hidden">
        <MiCasaProLogo size={40} tone="light" />

        <div className="relative z-10 max-w-md">
          <h2 className="text-[40px] leading-[1.1] font-extrabold tracking-tight">
            Las finanzas de tu hogar, claras y en orden.
          </h2>
          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-[#9db8ff]">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{title}</p>
                  <p className="text-sm text-white/65 mt-0.5 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">© {new Date().getFullYear()} Mi Casa Pro · Gestión financiera del hogar</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft size={16} /> {backLabel}
            </button>
          ) : <span />}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2.5 rounded-full border border-border-light bg-surface-container-lowest hover:bg-surface-container transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} className="text-warn-ink" /> : <Moon size={18} className="text-on-surface-variant" />}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <MiCasaProLogo size={44} />
          </div>
          <p className="hidden lg:block text-xs font-semibold uppercase tracking-[0.12em] text-info-ink mb-3">{subtitle}</p>
          <div className="bg-panel border border-border-light rounded-2xl shadow-lift p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
