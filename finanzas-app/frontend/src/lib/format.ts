const currencyFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormatter = new Intl.NumberFormat('es-ES');

export const fmt = (n: number | string | null | undefined): string =>
  currencyFormatter.format(Number(n) || 0);

/** Formatea un número como entero sin decimales (ej: contadores, cantidades). */
export const fmtInt = (n: number | string | null | undefined): string =>
  intFormatter.format(Number(n) || 0);

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTHS = MONTH_NAMES.map((label, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label,
}));

export const fmtDate = (d: string | Date): string =>
  new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
