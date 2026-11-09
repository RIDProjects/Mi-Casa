import { BadRequestException } from '@nestjs/common';
import { BudgetService } from './budget.service';

/**
 * Budget lines carry an optional currency (null = house local currency). Totals convert
 * each line to local with the latest rate at read time; a line with no rate is flagged
 * in summary.missingRates and left out of the sums.
 */
describe('BudgetService multi-currency', () => {
  const HOUSE = 'house-1';
  const noop = {} as any;
  const RATES = { CUP: 1, USD: 450, EUR: null };

  const makeBudget = (income: any[], categories: any[]) => ({
    id: 'b1',
    savingsTargetPercent: 10,
    incomeSources: income,
    categories,
  });

  const build = (budget: any, rates?: Record<string, number | null>, extra: any = {}) => {
    const budgetRepo: any = {
      find: jest.fn().mockResolvedValue([budget]),
      findOne: jest.fn().mockResolvedValue(budget),
    };
    const houseCurrencies: any = rates
      ? {
          getRates: jest.fn().mockResolvedValue(rates),
          findByHouse: jest.fn().mockResolvedValue([
            { currencyCode: 'CUP', isLocal: true },
            { currencyCode: 'USD', isLocal: false },
          ]),
          ...extra,
        }
      : undefined;
    return new BudgetService(budgetRepo, noop, noop, noop, noop, noop, noop, noop, undefined, undefined, houseCurrencies);
  };

  describe('summary conversion', () => {
    it('converts a USD income so CUP expenses no longer produce a huge negative', async () => {
      const budget = makeBudget(
        [{ amount: 1000, currencyCode: 'USD' }],
        [{ name: 'Casa', expenses: [{ amount: 200000, periodicity: 'monthly', currencyCode: null }] }],
      );
      const [result] = await build(budget, RATES).findByHouse(HOUSE);

      expect(result.summary.totalMonthlyIncome).toBe(450000);
      expect(result.summary.totalMonthlyExpenses).toBe(200000);
      expect(result.summary.available).toBe(250000);
      expect(result.summary.missingRates).toEqual([]);
    });

    it('applies periodicity before converting mixed lines (findOne)', async () => {
      const budget = makeBudget(
        [{ amount: 1000, currencyCode: 'USD' }, { amount: 50000, currencyCode: null }],
        [
          {
            name: 'Casa',
            expenses: [
              { amount: 100, periodicity: 'biweekly', currencyCode: 'USD' }, // 200 USD/month
              { amount: 30000, periodicity: 'monthly', currencyCode: 'CUP' },
            ],
          },
          { name: 'Deudas', expenses: [{ amount: 10, periodicity: 'monthly', currencyCode: 'USD', isAntExpense: true }] },
        ],
      );
      const result = await build(budget, RATES).findOne('b1', HOUSE);

      expect(result.summary.totalMonthlyIncome).toBe(500000);
      expect(result.summary.totalMonthlyExpenses).toBe(90000 + 30000 + 4500);
      expect(result.summary.manualDebtMonthly).toBe(4500);
      expect(result.summary.antExpensesTotal).toBe(4500);
      expect(result.summary.available).toBe(500000 - 124500);
    });

    it('keeps the currency of each returned line', async () => {
      const budget = makeBudget(
        [{ amount: 1, currencyCode: 'USD' }],
        [{ name: 'Casa', expenses: [{ amount: 1, periodicity: 'monthly', currencyCode: 'USD' }] }],
      );
      const [result] = await build(budget, RATES).findByHouse(HOUSE);
      expect(result.incomeSources[0].currencyCode).toBe('USD');
      expect(result.categories[0].expenses[0].currencyCode).toBe('USD');
    });

    it('excludes lines whose currency has no rate and reports them', async () => {
      const budget = makeBudget(
        [{ amount: 1000, currencyCode: 'USD' }, { amount: 999, currencyCode: 'EUR' }],
        [
          {
            name: 'Casa',
            expenses: [
              { amount: 500, periodicity: 'monthly', currencyCode: 'EUR' },
              { amount: 100, periodicity: 'monthly', currencyCode: 'GBP' }, // not in rates at all
              { amount: 1000, periodicity: 'monthly', currencyCode: null },
            ],
          },
        ],
      );
      const [result] = await build(budget, RATES).findByHouse(HOUSE);

      expect(result.summary.totalMonthlyIncome).toBe(450000);
      expect(result.summary.totalMonthlyExpenses).toBe(1000);
      expect([...result.summary.missingRates].sort()).toEqual(['EUR', 'GBP']);
    });

    it('behaves as before for lines without currency, even when rates are available', async () => {
      const budget = makeBudget(
        [{ amount: 3000 }],
        [{ name: 'Casa', expenses: [{ amount: 500, periodicity: 'monthly' }] }],
      );
      const [result] = await build(budget, RATES).findByHouse(HOUSE);
      expect(result.summary.totalMonthlyExpenses).toBe(500);
      expect(result.summary.available).toBe(2500);
      expect(result.summary.missingRates).toEqual([]);
    });

    it('uses amounts as is when there is no currencies service', async () => {
      const budget = makeBudget(
        [{ amount: 1000, currencyCode: 'USD' }],
        [{ name: 'Casa', expenses: [{ amount: 200, periodicity: 'monthly', currencyCode: 'USD' }] }],
      );
      const [result] = await build(budget, undefined).findByHouse(HOUSE);
      expect(result.summary.totalMonthlyIncome).toBe(1000);
      expect(result.summary.totalMonthlyExpenses).toBe(200);
      expect(result.summary.missingRates).toEqual([]);
    });
  });

  describe('local-currency budgets for other modules', () => {
    const budget = () =>
      makeBudget(
        [],
        [
          {
            name: 'Comida',
            expenses: [
              { name: 'Salidas', amount: 10, periodicity: 'monthly', currencyCode: 'USD' },
              { name: 'Compra', amount: 20, periodicity: 'monthly', isShoppingBudget: true, currencyCode: 'USD' },
            ],
          },
          { name: 'Casa', expenses: [{ name: 'Renta', amount: 100, periodicity: 'monthly', isFixed: true, currencyCode: 'USD' }] },
        ],
      );

    it('getOutingsBudget converts to local', async () => {
      expect(await build(budget(), RATES).getOutingsBudget(HOUSE)).toBe(4500);
    });

    it('getShoppingBudget converts to local', async () => {
      expect(await build(budget(), RATES).getShoppingBudget(HOUSE)).toBe(9000);
    });

    it('getEmergencyFundBasis converts fixed lines to local', async () => {
      const basis = await build(budget(), RATES).getEmergencyFundBasis(HOUSE);
      expect(basis.lines).toEqual([{ name: 'Renta', monthlyAmount: 45000 }]);
    });
  });

  describe('write validation', () => {
    const buildWrite = () => {
      const budgetRepo: any = { findOne: jest.fn().mockResolvedValue({ id: 'b1' }) };
      const incomeRepo: any = {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn((v) => v),
        save: jest.fn(async (v) => v),
      };
      const expenseRepo: any = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((v) => v),
        save: jest.fn(async (v) => v),
      };
      const found: any = { current: null };
      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => found.current),
      };
      incomeRepo.createQueryBuilder = jest.fn(() => qb);
      expenseRepo.createQueryBuilder = jest.fn(() => qb);
      const categoryRepo: any = { createQueryBuilder: jest.fn(() => qb) };
      const houseCurrencies: any = {
        findByHouse: jest.fn().mockResolvedValue([
          { currencyCode: 'CUP', isLocal: true },
          { currencyCode: 'USD', isLocal: false },
        ]),
        getRates: jest.fn().mockResolvedValue(RATES),
      };
      const service = new BudgetService(
        budgetRepo, categoryRepo, expenseRepo, incomeRepo, noop, noop, noop, noop, undefined, undefined, houseCurrencies,
      );
      return { service, incomeRepo, expenseRepo, found };
    };

    it('stores an active foreign currency on income and expense', async () => {
      const { service, found } = buildWrite();
      const income = await service.addIncome('b1', HOUSE, { name: 'Sueldo', amount: 1, currencyCode: 'USD' });
      expect(income.currencyCode).toBe('USD');

      found.current = { id: 'c1', name: 'Casa', budget: { id: 'b1' } };
      const expense = await service.addExpense('c1', HOUSE, { name: 'Renta', amount: 1, currencyCode: 'USD' });
      expect(expense.currencyCode).toBe('USD');
    });

    it('rejects a currency that is not active in the house', async () => {
      const { service, found } = buildWrite();
      await expect(service.addIncome('b1', HOUSE, { name: 'x', amount: 1, currencyCode: 'XYZ' })).rejects.toThrow(
        new BadRequestException('La moneda XYZ no está activa en esta casa'),
      );
      found.current = { id: 'c1', name: 'Casa', budget: { id: 'b1' } };
      await expect(service.addExpense('c1', HOUSE, { name: 'x', amount: 1, currencyCode: 'XYZ' })).rejects.toThrow(
        BadRequestException,
      );
      found.current = { id: 'e1' };
      await expect(service.updateExpense('e1', HOUSE, { currencyCode: 'XYZ' })).rejects.toThrow(BadRequestException);
      found.current = { id: 'i1', budget: { id: 'b1' } };
      await expect(service.updateIncome('i1', HOUSE, { currencyCode: 'XYZ' })).rejects.toThrow(BadRequestException);
    });

    it('stores null when the code is the local currency or empty', async () => {
      const { service } = buildWrite();
      expect((await service.addIncome('b1', HOUSE, { name: 'x', amount: 1, currencyCode: 'CUP' })).currencyCode).toBeNull();
      expect((await service.addIncome('b1', HOUSE, { name: 'x', amount: 1, currencyCode: '' })).currencyCode).toBeNull();
    });

    it('updates: sets a currency, and null resets to local', async () => {
      const { service, found } = buildWrite();
      found.current = { id: 'e1', currencyCode: null };
      expect((await service.updateExpense('e1', HOUSE, { currencyCode: 'USD' })).currencyCode).toBe('USD');
      found.current = { id: 'e1', currencyCode: 'USD' };
      expect((await service.updateExpense('e1', HOUSE, { currencyCode: null })).currencyCode).toBeNull();
      found.current = { id: 'i1', currencyCode: 'USD', budget: { id: 'b1' } };
      expect((await service.updateIncome('i1', HOUSE, { currencyCode: 'CUP' })).currencyCode).toBeNull();
    });

    it('leaves the stored currency alone when the update omits it', async () => {
      const { service, found } = buildWrite();
      found.current = { id: 'e1', currencyCode: 'USD' };
      expect((await service.updateExpense('e1', HOUSE, { name: 'Nuevo' })).currencyCode).toBe('USD');
    });
  });
});
