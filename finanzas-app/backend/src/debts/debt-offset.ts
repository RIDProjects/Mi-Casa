export type OffsetPriority = 'alta' | 'media' | 'baja';
export type OffsetStatus = 'cubierta' | 'parcial' | 'pendiente';

export interface OffsetDebt {
  id: string;
  label: string;
  amount: number;
  priority: OffsetPriority;
  createdAt: Date | string;
}

export interface OffsetItem {
  id: string;
  label: string;
  priority: OffsetPriority;
  amount: number;
  /** Part of this debt paid by what is owed to the house. */
  covered: number;
  /** What is still left; only this goes to the budget. */
  pending: number;
  status: OffsetStatus;
}

export interface DebtOffset {
  owedToMe: number;
  items: OffsetItem[];
  totalCovered: number;
  totalPending: number;
  /** What is owed to the house and was not needed to cover any debt. */
  remainingPool: number;
}

const PRIORITY_RANK: Record<OffsetPriority, number> = { alta: 0, media: 1, baja: 2 };

const toCents = (n: unknown): number => Math.round((Number(n) || 0) * 100);
const fromCents = (c: number): number => c / 100;

/**
 * Applies what is owed to the house ("me deben") against its debts ("debo"),
 * walking them by priority (alta, media, baja; oldest first inside a priority).
 * Each debt is paid in full while the pool lasts; the first one it cannot fully
 * pay keeps only its uncovered remainder, and every later one keeps its full
 * amount. Works in cents to avoid floating point drift.
 */
export function computeDebtOffset(input: { owedToMe: number; debts: OffsetDebt[] }): DebtOffset {
  const ordered = input.debts
    .map((debt, index) => ({ debt, index }))
    .sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.debt.priority] - PRIORITY_RANK[b.debt.priority];
      if (byPriority !== 0) return byPriority;
      const byAge = new Date(a.debt.createdAt).getTime() - new Date(b.debt.createdAt).getTime();
      return byAge !== 0 ? byAge : a.index - b.index;
    })
    .map(({ debt }) => debt);

  let pool = Math.max(0, toCents(input.owedToMe));
  let totalCovered = 0;
  let totalPending = 0;

  const items = ordered.map((debt): OffsetItem => {
    const amount = Math.max(0, toCents(debt.amount));
    const covered = Math.min(pool, amount);
    const pending = amount - covered;
    pool -= covered;
    totalCovered += covered;
    totalPending += pending;
    const status: OffsetStatus = pending === 0 ? 'cubierta' : covered > 0 ? 'parcial' : 'pendiente';
    return {
      id: debt.id,
      label: debt.label,
      priority: debt.priority,
      amount: fromCents(amount),
      covered: fromCents(covered),
      pending: fromCents(pending),
      status,
    };
  });

  return {
    owedToMe: fromCents(Math.max(0, toCents(input.owedToMe))),
    items,
    totalCovered: fromCents(totalCovered),
    totalPending: fromCents(totalPending),
    remainingPool: fromCents(pool),
  };
}
