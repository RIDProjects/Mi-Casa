import { BudgetService } from './budget.service';

/**
 * The "Deudas" category is fed automatically by the debt modules: their
 * monthly service is added to the budget expenses (and so to what is left
 * available), without touching the manual expenses the user already entered.
 */
describe('BudgetService automatic debt lines', () => {
  const HOUSE = 'house-1';
  const noop = {} as any;
  const lines = [
    { source: 'loan', id: 'l1', label: 'Hipoteca - Banco A', monthlyAmount: 400, balance: 20000, estimated: false },
    { source: 'card', id: 'k1', label: 'Visa Gold', monthlyAmount: 100, balance: 2000, estimated: true },
  ];
  const budget = () => ({
    id: 'b1',
    savingsTargetPercent: 10,
    incomeSources: [{ amount: 3000 }],
    categories: [
      { id: 'c1', name: 'Casa', expenses: [{ amount: 500, periodicity: 'monthly' }] },
      { id: 'c2', name: 'Deudas', expenses: [{ amount: 50, periodicity: 'monthly' }] },
    ],
  });

  const build = (debtLines: any) => {
    const budgetRepo: any = {
      find: jest.fn().mockResolvedValue([budget()]),
      findOne: jest.fn().mockResolvedValue(budget()),
    };
    return new BudgetService(budgetRepo, noop, noop, noop, noop, noop, noop, noop, undefined, debtLines);
  };

  it('adds the monthly debt service to the expenses and exposes the lines (findByHouse)', async () => {
    const service = build({ getLines: jest.fn().mockResolvedValue(lines) });

    const [result] = await service.findByHouse(HOUSE);

    expect(result.autoDebtLines).toEqual(lines);
    expect(result.summary.autoDebtMonthly).toBe(500);
    expect(result.summary.manualDebtMonthly).toBe(50);
    // 500 (Casa) + 50 (manual Deudas) + 500 (automatic)
    expect(result.summary.totalMonthlyExpenses).toBe(1050);
    expect(result.summary.available).toBe(1950);
  });

  it('does the same for a single budget (findOne)', async () => {
    const service = build({ getLines: jest.fn().mockResolvedValue(lines) });

    const result = await service.findOne('b1', HOUSE);

    expect(result.summary.totalMonthlyExpenses).toBe(1050);
    expect(result.autoDebtLines).toHaveLength(2);
  });

  it('leaves the numbers untouched when the house has no debt obligations', async () => {
    const service = build({ getLines: jest.fn().mockResolvedValue([]) });

    const [result] = await service.findByHouse(HOUSE);

    expect(result.autoDebtLines).toEqual([]);
    expect(result.summary.autoDebtMonthly).toBe(0);
    expect(result.summary.totalMonthlyExpenses).toBe(550);
  });

  it('keeps working without the debt lines service (lightweight constructions)', async () => {
    const service = build(undefined);

    const [result] = await service.findByHouse(HOUSE);

    expect(result.summary.totalMonthlyExpenses).toBe(550);
    expect(result.autoDebtLines).toEqual([]);
  });
});
