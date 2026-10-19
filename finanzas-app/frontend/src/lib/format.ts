import { parseLocalDate } from './dates';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormatter = new Intl.NumberFormat('es-ES');

/**
 * Amounts: large whole numbers drop the meaningless ",00" (1.254.300), while small or fractional
 * amounts keep two decimals so cents stay aligned in a column (17,94 / 20,00).
 */
export const fmt = (n: number | string | null | undefined): string => {
  const value = Number(n) || 0;
  return Number.isInteger(value) && Math.abs(value) >= 1000
    ? intFormatter.format(value)
    : currencyFormatter.format(value);
};

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
  parseLocalDate(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
