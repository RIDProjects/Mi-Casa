import { invalidateDebtDerived } from '../lib/debt-cache';

describe('invalidateDebtDerived', () => {
  it('invalidates every view derived from the debt modules', () => {
    const qc = { invalidateQueries: jest.fn() };
    invalidateDebtDerived(qc);
    const keys = qc.invalidateQueries.mock.calls.map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(['debt-health', 'globalSummary', 'budgetDashboard', 'budgets', 'budget']));
  });
});
