import type { QueryClient } from 'react-query';

/**
 * Anything built from the debt modules (debts, loans, cards, cuotas): the
 * dashboard verdict and totals, and the budget with its automatic Deudas lines.
 * Call after any create/update/delete in those modules so those views do not
 * lag behind what was just saved.
 */
export function invalidateDebtDerived(qc: Pick<QueryClient, 'invalidateQueries'>) {
  ['debt-health', 'globalSummary', 'budgetDashboard', 'budgets', 'budget', 'debtsSummary'].forEach((key) =>
    qc.invalidateQueries(key),
  );
}
