import { computeStrategy, DebtSnapshot } from '../debts/debts.service';
import { DebtLine } from '../debt-lines/debt-lines.service';

export type DebtHealthStatus = 'sin_deudas' | 'bien' | 'atencion' | 'riesgo';
export type DebtHorizon = 'ninguno' | 'corto' | 'mediano' | 'largo' | 'no_alcanza';

export interface DebtHealth {
  status: DebtHealthStatus;
  /** Debt service (automatic lines + manual "Deudas" budget expenses) / monthly income, in %. */
  debtToIncomePercent: number | null;
  monthlyIncome: number;
  monthlyDebtService: number;
  /** Budget margin after all expenses (can be negative). */
  available: number;
  /** Margin above the savings target that can go to the debts. */
  extraPayment: number;
  totalBalance: number;
  /** Months to clear every listed debt paying their service plus the extra (avalanche). */
  monthsToPayoff: number;
  horizon: DebtHorizon;
  feasible: boolean;
  lines: DebtLine[];
}

// Debt-to-income thresholds: below WARNING is fine, above RISK is risky.
const WARNING_PERCENT = 20;
const RISK_PERCENT = 35;
const SHORT_TERM_MONTHS = 12;
const MEDIUM_TERM_MONTHS = 36;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DebtHealthInput {
  income: number;
  /** Budget income minus all budget expenses (automatic debt lines included). */
  available: number;
  savingsTarget: number;
  /** Monthly amount of the manual expenses in the "Deudas" budget category. */
  manualDebtMonthly: number;
  lines: DebtLine[];
}

export function computeDebtHealth(input: DebtHealthInput): DebtHealth {
  const { income, available, savingsTarget, manualDebtMonthly, lines } = input;
  const autoMonthly = lines.reduce((s, l) => s + l.monthlyAmount, 0);
  const monthlyDebtService = round2(autoMonthly + manualDebtMonthly);
  const totalBalance = round2(lines.reduce((s, l) => s + l.balance, 0));
  const extraPayment = round2(Math.max(0, available - savingsTarget));
  const debtToIncomePercent = income > 0 ? round1((monthlyDebtService / income) * 100) : null;

  const common = { monthlyIncome: round2(income), monthlyDebtService, available: round2(available), extraPayment, totalBalance, debtToIncomePercent, lines };

  if (lines.length === 0 && manualDebtMonthly <= 0) {
    return { ...common, status: 'sin_deudas', monthsToPayoff: 0, horizon: 'ninguno', feasible: true };
  }

  const snapshots: DebtSnapshot[] = lines.map((l) => ({
    id: l.id,
    label: l.label,
    balance: l.balance,
    interestRate: l.interestRate ?? 0,
    minimumPayment: l.monthlyAmount,
  }));
  const payoff = snapshots.length > 0
    ? computeStrategy(snapshots, 'avalanche', extraPayment)
    : { monthsToPayoff: 0, feasible: true };

  let horizon: DebtHorizon;
  if (!payoff.feasible) horizon = 'no_alcanza';
  else if (payoff.monthsToPayoff <= SHORT_TERM_MONTHS) horizon = 'corto';
  else if (payoff.monthsToPayoff <= MEDIUM_TERM_MONTHS) horizon = 'mediano';
  else horizon = 'largo';

  let status: DebtHealthStatus;
  if (debtToIncomePercent === null || available < 0 || !payoff.feasible || debtToIncomePercent > RISK_PERCENT) {
    status = 'riesgo';
  } else if (debtToIncomePercent >= WARNING_PERCENT) {
    status = 'atencion';
  } else {
    status = 'bien';
  }

  return { ...common, status, monthsToPayoff: payoff.monthsToPayoff, horizon, feasible: payoff.feasible };
}
