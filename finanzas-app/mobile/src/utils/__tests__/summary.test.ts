import { toMonthlySummary } from '../summary';

// Shape returned by GET /summary (backend SummaryService.getSummary).
const rawSummary = {
  budget: { totalIncome: 1000, totalExpenses: 600, available: 400, savingsTarget: 100, advisory: 'ok' },
  emergencyFund: { target: 3000, current: 750, monthsCovered: 1.5 },
  localCurrency: 'CUP',
};

describe('toMonthlySummary', () => {
  it('maps the nested backend payload to the flat dashboard shape', () => {
    expect(toMonthlySummary(rawSummary)).toMatchObject({
      totalIngresos: 1000,
      totalGastos: 600,
      balance: 400,
      emergencyFund: 750,
      savingsRate: 40,
      currency: 'CUP',
    });
  });

  it('coerces numeric strings and leaves savingsRate undefined without income', () => {
    const result = toMonthlySummary({
      budget: { totalIncome: '0', totalExpenses: '25.5', available: '-25.5' },
    });
    expect(result.totalGastos).toBe(25.5);
    expect(result.balance).toBe(-25.5);
    expect(result.savingsRate).toBeUndefined();
    expect(result.emergencyFund).toBe(0);
  });

  it('does not throw on an empty payload', () => {
    expect(toMonthlySummary({})).toMatchObject({ totalIngresos: 0, totalGastos: 0, balance: 0 });
  });
});
