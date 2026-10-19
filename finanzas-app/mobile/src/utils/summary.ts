import { MonthlySummary } from '../types';

const num = (value: unknown): number => Number(value) || 0;

/**
 * GET /summary returns a nested payload (budget, emergencyFund, localCurrency…).
 * The dashboard consumes a flat shape; reading the raw response directly left
 * every field undefined and the screen stuck on zeros.
 */
export function toMonthlySummary(raw: any): MonthlySummary {
  const now = new Date();
  const totalIngresos = num(raw?.budget?.totalIncome);
  const totalGastos = num(raw?.budget?.totalExpenses);
  const balance = raw?.budget?.available != null
    ? num(raw.budget.available)
    : totalIngresos - totalGastos;

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    totalIngresos,
    totalGastos,
    balance,
    emergencyFund: num(raw?.emergencyFund?.current),
    savingsRate: totalIngresos > 0 ? (balance / totalIngresos) * 100 : undefined,
    currency: raw?.localCurrency || undefined,
  };
}
