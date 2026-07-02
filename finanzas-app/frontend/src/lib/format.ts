const currencyFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmt = (n: number | string | null | undefined): string =>
  currencyFormatter.format(Number(n) || 0);

export const DAYS_PER_MONTH = 30;

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTHS = MONTH_NAMES.map((label, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label,
}));

export const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
};

export const fmtPct = (n: number): string => `${n.toFixed(1)}%`;

export const fmtDate = (d: string | Date): string =>
  new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
