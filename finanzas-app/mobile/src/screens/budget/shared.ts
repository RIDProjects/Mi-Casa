import type { QueryClient } from '@tanstack/react-query';
import { BudgetCategory, Periodicity } from '../../types';

// Mirrors backend PERIODICITY_FACTOR (backend/src/budget/budget.service.ts)
export const PERIODICITY_FACTOR: Record<Periodicity, number> = {
  daily: 1 / 30,
  weekly: 12 / 52,
  biweekly: (12 * 15) / 365,
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  fourmonthly: 4,
  semiannual: 6,
  annual: 12,
};

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  fourmonthly: 'Cuatrimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export const PERIODICITY_OPTIONS = (Object.keys(PERIODICITY_LABELS) as Periodicity[]).map((value) => ({
  value,
  label: PERIODICITY_LABELS[value],
}));

export const INCOME_TYPE_LABELS: Record<string, string> = {
  salary: 'Salario',
  investment: 'Inversiones',
  business: 'Negocio',
  rental: 'Alquiler',
  freelance: 'Freelance',
  extras: 'Extras',
  other: 'Otro',
  // legacy values the web still renders
  fixed: 'Fijo',
  variable: 'Variable',
  salario_estatal: 'Salario',
  tcp: 'Freelance',
  remesas: 'Extras',
  mipyme: 'Negocio',
};

export const INCOME_TYPE_OPTIONS = ['salary', 'investment', 'business', 'rental', 'freelance', 'extras', 'other'].map(
  (value) => ({ value, label: INCOME_TYPE_LABELS[value] }),
);

export const toMonthly = (amount: number, periodicity: Periodicity) =>
  Number(amount) / PERIODICITY_FACTOR[periodicity];

export const categoryMonthlyTotal = (cat: BudgetCategory) =>
  cat.expenses.reduce((s, e) => s + toMonthly(e.amount, e.periodicity), 0);

export const errorMessage = (err: any): string => {
  const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

/** Parses a user-typed amount; returns NaN for empty or malformed input. */
export const parseAmount = (raw: string): number => (raw.trim() === '' ? NaN : Number(raw.replace(',', '.')));

export const invalidateBudget = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ['budget'] });
  qc.invalidateQueries({ queryKey: ['summary'] });
};
