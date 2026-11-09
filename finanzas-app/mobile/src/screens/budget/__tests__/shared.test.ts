import { QueryClient } from '@tanstack/react-query';
import { categoryMonthlyTotal, invalidateBudget } from '../shared';

describe('invalidateBudget', () => {
  it('invalidates the budget and every module that derives from it', () => {
    const qc = new QueryClient();
    const spy = jest.spyOn(qc, 'invalidateQueries');
    invalidateBudget(qc);
    const keys = spy.mock.calls.map(([arg]: any) => arg.queryKey[0]);
    expect(keys).toEqual(expect.arrayContaining([
      'budget', 'summary', 'emergency-fund', 'emergency-fund-coverage', 'savings-goals', 'purchaseLists',
    ]));
  });
});

describe('categoryMonthlyTotal with currencies', () => {
  const exp = (amount: number, currencyCode: string | null, periodicity: any = 'monthly') => ({
    id: String(amount), name: 'x', amount, periodicity, isFixed: false, isCreditCard: false, isAntExpense: false, currencyCode,
  });
  const cat = (expenses: any[]) => ({ id: 'c', name: 'Casa', sortOrder: 0, isDefault: false, expenses }) as any;

  it('converts each line to local with the rates (periodicity first)', () => {
    const rates = { CUP: 1, USD: 450 };
    expect(categoryMonthlyTotal(cat([exp(1000, null), exp(10, 'USD'), exp(120, 'USD', 'annual')]), rates)).toBe(1000 + 4500 + 4500);
  });

  it('leaves out lines whose currency has no rate and keeps raw sums without rates', () => {
    expect(categoryMonthlyTotal(cat([exp(1000, null), exp(10, 'EUR')]), { CUP: 1, EUR: null })).toBe(1000);
    expect(categoryMonthlyTotal(cat([exp(1000, null), exp(10, 'USD')]))).toBe(1010);
  });
});
