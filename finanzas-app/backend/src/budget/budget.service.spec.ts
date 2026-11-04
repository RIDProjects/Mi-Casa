import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BudgetService } from './budget.service';
import {
  Budget,
  BudgetCategory,
  BudgetExpense,
  IncomeSource,
} from '../database/entities/budget.entity';
import { SavingsGoal } from '../database/entities/savings-goal.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { HousesService } from '../houses/houses.service';

/**
 * Regression test for the IDOR fix on BudgetService.findOne.
 *
 * Before the fix, findOne(id, houseId) queried budgetRepo.findOne({ where: { id } })
 * WITHOUT filtering by house, so any authenticated user could read another
 * house's budget by guessing/enumerating its id. The fix adds
 * `house: { id: houseId }` to the where clause.
 */
describe('BudgetService.findOne (IDOR regression)', () => {
  let service: BudgetService;
  let budgetRepo: jest.Mocked<Repository<Budget>>;

  const HOUSE_A = 'house-a-id';
  const HOUSE_B = 'house-b-id';
  const BUDGET_ID = 'budget-1';

  beforeEach(() => {
    budgetRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Budget>>;

    const noop = {} as any;
    const notificationsService = {
      sendBudgetAlert: jest.fn(),
    } as unknown as NotificationsService;
    const inAppNotificationsService = {
      createIfNotRecent: jest.fn(),
    } as unknown as InAppNotificationsService;

    service = new BudgetService(
      budgetRepo,
      noop as Repository<BudgetCategory>,
      noop as Repository<BudgetExpense>,
      noop as Repository<IncomeSource>,
      noop as Repository<SavingsGoal>,
      notificationsService,
      inAppNotificationsService,
      { getHouseAdminEmails: jest.fn().mockResolvedValue([]) } as unknown as HousesService,
    );
  });

  it('queries with the house filter included in the where clause', async () => {
    budgetRepo.findOne.mockResolvedValue({
      id: BUDGET_ID,
      incomeSources: [],
      categories: [],
      savingsTargetPercent: 20,
    } as any);

    await service.findOne(BUDGET_ID, HOUSE_A);

    expect(budgetRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BUDGET_ID, house: { id: HOUSE_A } },
      }),
    );
  });

  it('throws NotFoundException when the budget belongs to a different house', async () => {
    // Simulate the repo correctly filtering by house: a budget owned by
    // House A is not returned when House B asks for it.
    budgetRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne(BUDGET_ID, HOUSE_B)).rejects.toThrow(
      NotFoundException,
    );

    expect(budgetRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BUDGET_ID, house: { id: HOUSE_B } },
      }),
    );
  });

  it('returns the budget with computed summary when it belongs to the requesting house', async () => {
    budgetRepo.findOne.mockResolvedValue({
      id: BUDGET_ID,
      incomeSources: [{ amount: 1000 }],
      categories: [],
      savingsTargetPercent: 20,
    } as any);

    const result = await service.findOne(BUDGET_ID, HOUSE_A);

    expect(result.id).toBe(BUDGET_ID);
    expect(result.summary).toBeDefined();
  });
});

describe('BudgetService.findByHouse alert emails', () => {
  const HOUSE_ID = 'house-1';
  const overBudget = {
    id: 'b1',
    savingsTargetPercent: 20,
    incomeSources: [{ amount: 100 }],
    categories: [{ expenses: [{ amount: 500, periodicity: 'monthly', isAntExpense: false }] }],
  };

  function build(adminEmails: string[], createResults: Array<object | null>) {
    const budgetRepo = { find: jest.fn().mockResolvedValue([overBudget]) } as any;
    const sendBudgetAlert = jest.fn().mockResolvedValue(true);
    const createIfNotRecent = jest.fn();
    createResults.forEach((r) => createIfNotRecent.mockResolvedValueOnce(r));
    const getHouseAdminEmails = jest.fn().mockResolvedValue(adminEmails);
    const noop = {} as any;
    const service = new BudgetService(
      budgetRepo, noop, noop, noop, noop,
      { sendBudgetAlert } as any,
      { createIfNotRecent } as any,
      { getHouseAdminEmails } as any,
    );
    return { service, sendBudgetAlert, createIfNotRecent, getHouseAdminEmails };
  }

  const flush = () => new Promise((r) => setImmediate(r));

  beforeEach(() => {
    process.env.SMTP_USER = 'smtp-user@example.com';
  });

  it('emails each house admin and never SMTP_USER', async () => {
    const { service, sendBudgetAlert, getHouseAdminEmails } = build(
      ['a1@x.com', 'a2@x.com'], [{ id: 'n1' }],
    );
    await service.findByHouse(HOUSE_ID);
    await flush();
    expect(getHouseAdminEmails).toHaveBeenCalledWith(HOUSE_ID);
    const recipients = sendBudgetAlert.mock.calls.map((c) => c[0]);
    expect(recipients).toEqual(['a1@x.com', 'a2@x.com']);
    expect(recipients).not.toContain('smtp-user@example.com');
  });

  it('sends nothing when the house has no admins (no fallback address)', async () => {
    const { service, sendBudgetAlert } = build([], [{ id: 'n1' }]);
    await service.findByHouse(HOUSE_ID);
    await flush();
    expect(sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('sends no email when the in-app notification was deduplicated', async () => {
    const { service, sendBudgetAlert, createIfNotRecent } = build(['a1@x.com'], [null]);
    await service.findByHouse(HOUSE_ID);
    await flush();
    expect(createIfNotRecent).toHaveBeenCalled();
    expect(sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('a second GET inside the dedup window sends no additional email', async () => {
    const { service, sendBudgetAlert } = build(['a1@x.com'], [{ id: 'n1' }, null]);
    await service.findByHouse(HOUSE_ID);
    await flush();
    const afterFirst = sendBudgetAlert.mock.calls.length;
    expect(afterFirst).toBe(1);
    await service.findByHouse(HOUSE_ID);
    await flush();
    expect(sendBudgetAlert.mock.calls.length).toBe(afterFirst);
  });

  it('does not throw to the caller when email sending fails', async () => {
    const { service, sendBudgetAlert } = build(['a1@x.com'], [{ id: 'n1' }]);
    sendBudgetAlert.mockRejectedValue(new Error('smtp down'));
    await expect(service.findByHouse(HOUSE_ID)).resolves.toHaveLength(1);
    await flush();
  });
});

describe('BudgetService.create defaults', () => {
  const build = () => {
    const budgetRepo: any = {
      create: jest.fn((d) => d),
      save: jest.fn(async (b) => ({ id: 'b1', ...b })),
      findOne: jest.fn().mockResolvedValue({ id: 'b1', incomeSources: [], categories: [] }),
    };
    const noop = {} as any;
    const service = new BudgetService(budgetRepo, noop, noop, noop, noop, noop, noop, noop);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
    return { service, budgetRepo };
  };

  it('keeps an intentional savingsTargetPercent of 0', async () => {
    const { service, budgetRepo } = build();
    await service.create({ savingsTargetPercent: 0 } as any, 'h1');
    expect(budgetRepo.create).toHaveBeenCalledWith(expect.objectContaining({ savingsTargetPercent: 0 }));
  });

  it('defaults savingsTargetPercent to 20 when omitted', async () => {
    const { service, budgetRepo } = build();
    await service.create({} as any, 'h1');
    expect(budgetRepo.create).toHaveBeenCalledWith(expect.objectContaining({ savingsTargetPercent: 20 }));
  });
});

describe('BudgetService FI savings goal', () => {
  it('creates the FI goal with a 7% annual rate stored as percent', async () => {
    const savingsGoalRepo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d),
      save: jest.fn(async (g) => g),
    };
    const noop = {} as any;
    const service = new BudgetService(noop, noop, noop, noop, savingsGoalRepo, noop, noop, noop);
    await (service as any).syncFiGoal('h1', 1000);
    expect(savingsGoalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ annualInterestRate: 7 }));
  });
});

describe('BudgetService monthly normalization', () => {
  const { Periodicity } = jest.requireActual('../database/entities/budget.entity');
  const noop = {} as any;
  const service = new BudgetService(noop, noop, noop, noop, noop, noop, noop, noop);
  const monthly = (amount: number, p: any) => (service as any).computeMonthlyAmount(amount, p);

  it('weekly uses 52 weeks / 12 months', () => {
    expect(monthly(1000, Periodicity.WEEKLY)).toBeCloseTo((1000 * 52) / 12, 2);
  });

  it('biweekly means every 15 days: 365 / 15 / 12 payments per month', () => {
    expect(monthly(1000, Periodicity.BIWEEKLY)).toBeCloseTo((1000 * 365) / 15 / 12, 2);
  });

  it('monthly is unchanged', () => {
    expect(monthly(1000, Periodicity.MONTHLY)).toBe(1000);
  });
});

describe('BudgetService.findByHouse limit', () => {
  it('passes take to the query only when a limit is given', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const noop = {} as any;
    const service = new BudgetService({ find } as any, noop, noop, noop, noop, noop, noop, noop);

    await service.findByHouse('h1');
    expect(find.mock.calls[0][0]).not.toHaveProperty('take');

    await service.findByHouse('h1', 1);
    expect(find.mock.calls[1][0]).toMatchObject({ take: 1, order: { createdAt: 'DESC' } });
  });
});

describe('BudgetService plan parameters', () => {
  const incomeSources = [{ amount: 1000 }];
  const build = (budget: any) => {
    const budgetRepo: any = {
      findOne: jest.fn().mockResolvedValue(budget),
      save: jest.fn(async (b) => b),
    };
    const noop = {} as any;
    return { service: new BudgetService(budgetRepo, noop, noop, noop, noop, noop, noop, noop), budgetRepo };
  };

  it('keeps the previous plan numbers when no overrides are set', () => {
    const { service } = build(null);
    const { plan } = (service as any).computeSummary({ incomeSources, categories: [], savingsTargetPercent: 20, rule: '50-30-20' });
    expect(plan).toEqual({
      rule: '50-30-20',
      fiTarget: 150000,
      minMonthlyInvestment: 200,
      emergencyFundTarget: 6000,
      entertainmentBudget: 300,
      fixedExpensesCap: 500,
    });
  });

  it('uses the overrides stored on the budget', () => {
    const { service } = build(null);
    const { plan } = (service as any).computeSummary({
      incomeSources, categories: [], savingsTargetPercent: 20, rule: '50-30-20',
      fiMultiplier: 100, minInvestmentPercent: 10, emergencyFundMonths: 3,
      entertainmentPercent: 15, fixedExpensesCapPercent: 40,
    });
    expect(plan).toMatchObject({
      fiTarget: 100000, minMonthlyInvestment: 100, emergencyFundTarget: 3000,
      entertainmentBudget: 150, fixedExpensesCap: 400,
    });
  });

  it('update persists the plan parameters and null resets one to its default', async () => {
    const budget: any = { id: 'b1', fiMultiplier: 100 };
    const { service, budgetRepo } = build(budget);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
    await service.update('b1', 'h1', { fiMultiplier: null, emergencyFundMonths: 9 } as any);
    expect(budgetRepo.save).toHaveBeenCalledWith(expect.objectContaining({ fiMultiplier: null, emergencyFundMonths: 9 }));
  });

  it('syncFiGoalForBudget uses the budget multiplier', async () => {
    const { service } = build({ id: 'b1', incomeSources, fiMultiplier: 100 });
    const spy = jest.spyOn(service as any, 'syncFiGoal').mockResolvedValue({} as any);
    await service.syncFiGoalForBudget('b1', 'h1');
    expect(spy).toHaveBeenCalledWith('h1', 100000);
  });
});

describe('BudgetService.getEmergencyFundBasis', () => {
  function build(budget: any) {
    const budgetRepo = { findOne: jest.fn().mockResolvedValue(budget) };
    const sendBudgetAlert = jest.fn();
    const createIfNotRecent = jest.fn();
    const noop = {} as any;
    const service = new BudgetService(
      budgetRepo as any,
      noop,
      noop,
      noop,
      noop,
      { sendBudgetAlert } as any,
      { createIfNotRecent } as any,
      { getHouseAdminEmails: jest.fn().mockResolvedValue([]) } as any,
    );
    return { service, budgetRepo, sendBudgetAlert, createIfNotRecent };
  }

  it('returns only fixed expenses converted to monthly amounts', async () => {
    const { service, budgetRepo } = build({
      emergencyFundMonths: '9.00',
      categories: [
        {
          expenses: [
            { name: 'Rent', amount: '1000', periodicity: 'monthly', isFixed: true },
            { name: 'Insurance', amount: '1200', periodicity: 'annual', isFixed: true },
            { name: 'Gym', amount: '100', periodicity: 'weekly', isFixed: true },
            { name: 'Cinema', amount: '50', periodicity: 'monthly', isFixed: false },
          ],
        },
      ],
    });

    const basis = await service.getEmergencyFundBasis('h1');

    expect(budgetRepo.findOne).toHaveBeenCalledWith({
      where: { house: { id: 'h1' } },
      order: { createdAt: 'DESC' },
      relations: ['categories', 'categories.expenses'],
    });
    expect(basis).toEqual({
      lines: [
        { name: 'Rent', monthlyAmount: 1000 },
        { name: 'Insurance', monthlyAmount: 100 },
        { name: 'Gym', monthlyAmount: 433.33 },
      ],
      emergencyFundMonths: 9,
    });
  });

  it('returns null when the house has no budget', async () => {
    const { service } = build(null);
    expect(await service.getEmergencyFundBasis('h1')).toBeNull();
  });

  it('returns null emergencyFundMonths when unset', async () => {
    const { service } = build({ emergencyFundMonths: null, categories: [] });
    expect(await service.getEmergencyFundBasis('h1')).toEqual({ lines: [], emergencyFundMonths: null });
  });

  it('does not trigger notification side effects', async () => {
    const { service, sendBudgetAlert, createIfNotRecent } = build({ categories: [] });
    await service.getEmergencyFundBasis('h1');
    expect(sendBudgetAlert).not.toHaveBeenCalled();
    expect(createIfNotRecent).not.toHaveBeenCalled();
  });
});

describe('BudgetService FI goal auto-refresh', () => {
  const build = (opts: { budget?: any; goal?: any; goalRepoFails?: boolean } = {}) => {
    const budget = opts.budget === undefined ? { id: 'b1', fiMultiplier: null, incomeSources: [{ amount: 400 }, { amount: 600 }] } : opts.budget;
    const budgetRepo: any = {
      findOne: jest.fn().mockResolvedValue(budget),
      save: jest.fn(async (b) => b),
    };
    const income: any = { id: 'i1', amount: 1, budget: { id: 'b1' } };
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(income),
    };
    const incomeRepo: any = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      remove: jest.fn(async (x) => x),
      createQueryBuilder: jest.fn(() => qb),
    };
    const savingsGoalRepo: any = {
      findOne: opts.goalRepoFails
        ? jest.fn().mockRejectedValue(new Error('db down'))
        : jest.fn().mockResolvedValue(opts.goal ?? null),
      save: jest.fn(async (g) => g),
      create: jest.fn(),
    };
    const noop = {} as any;
    const service = new BudgetService(budgetRepo, noop, noop, incomeRepo, savingsGoalRepo, noop, noop, noop);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
    return { service, savingsGoalRepo, budgetRepo };
  };

  it.each([
    ['addIncome', (s: BudgetService) => s.addIncome('b1', 'h1', { name: 'x', amount: 1 } as any)],
    ['updateIncome', (s: BudgetService) => s.updateIncome('i1', 'h1', { amount: 1 } as any)],
    ['removeIncome', (s: BudgetService) => s.removeIncome('i1', 'h1')],
  ])('%s updates an existing FI goal amount', async (_n, run) => {
    const goal = { name: 'Independencia Financiera', goalAmount: 1 };
    const { service, savingsGoalRepo } = build({ goal });
    await run(service);
    expect(savingsGoalRepo.save).toHaveBeenCalledWith(expect.objectContaining({ goalAmount: 150000 }));
  });

  it('uses the budget multiplier', async () => {
    const goal = { name: 'Independencia Financiera', goalAmount: 1 };
    const { service, savingsGoalRepo } = build({
      goal,
      budget: { id: 'b1', fiMultiplier: 100, incomeSources: [{ amount: 1000 }] },
    });
    await service.addIncome('b1', 'h1', { name: 'x', amount: 1 } as any);
    expect(savingsGoalRepo.save).toHaveBeenCalledWith(expect.objectContaining({ goalAmount: 100000 }));
  });

  it('never creates the goal when it does not exist', async () => {
    const { service, savingsGoalRepo } = build({ goal: null });
    await service.addIncome('b1', 'h1', { name: 'x', amount: 1 } as any);
    expect(savingsGoalRepo.save).not.toHaveBeenCalled();
    expect(savingsGoalRepo.create).not.toHaveBeenCalled();
  });

  it('leaves the goal untouched when total income is 0', async () => {
    const goal = { name: 'Independencia Financiera', goalAmount: 5 };
    const { service, savingsGoalRepo } = build({ goal, budget: { id: 'b1', incomeSources: [] } });
    await service.removeIncome('i1', 'h1');
    expect(savingsGoalRepo.save).not.toHaveBeenCalled();
    expect(goal.goalAmount).toBe(5);
  });

  it('update with fiMultiplier refreshes the goal', async () => {
    const goal = { name: 'Independencia Financiera', goalAmount: 1 };
    const { service, savingsGoalRepo } = build({ goal });
    await service.update('b1', 'h1', { fiMultiplier: 100 } as any);
    expect(savingsGoalRepo.save).toHaveBeenCalledWith(expect.objectContaining({ goalAmount: 100000 }));
  });

  it('update without fiMultiplier does not touch the savings goal repo', async () => {
    const { service, savingsGoalRepo } = build({ goal: { goalAmount: 1 } });
    await service.update('b1', 'h1', { name: 'New' } as any);
    expect(savingsGoalRepo.findOne).not.toHaveBeenCalled();
    expect(savingsGoalRepo.save).not.toHaveBeenCalled();
  });

  it('a failing savings goal repo does not fail addIncome', async () => {
    const { service } = build({ goalRepoFails: true });
    await expect(service.addIncome('b1', 'h1', { name: 'x', amount: 1 } as any)).resolves.toBeDefined();
  });
});

describe('BudgetService shopping budget expense', () => {
  function build(opts: { catName?: string; categoryCount?: number; flaggedCount?: number; budget?: any } = {}) {
    const cat = { id: 'c1', name: opts.catName ?? 'Comida', budget: { id: 'b1' } };
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(cat),
    };
    const categoryRepo = { createQueryBuilder: jest.fn(() => qb) };
    const expenseRepo: any = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn(async (arg: any) =>
        arg?.where?.isShoppingBudget ? opts.flaggedCount ?? 0 : opts.categoryCount ?? 0,
      ),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'e1', name: 'x' }),
      })),
    };
    const budgetRepo = { find: jest.fn().mockResolvedValue(opts.budget ? [opts.budget] : []) };
    const sendBudgetAlert = jest.fn();
    const createIfNotRecent = jest.fn();
    const noop = {} as any;
    const service = new BudgetService(
      budgetRepo as any,
      categoryRepo as any,
      expenseRepo,
      noop,
      noop,
      { sendBudgetAlert } as any,
      { createIfNotRecent } as any,
      { getHouseAdminEmails: jest.fn().mockResolvedValue([]) } as any,
    );
    return { service, expenseRepo, budgetRepo, sendBudgetAlert, createIfNotRecent };
  }

  const dto: any = { name: 'Super', amount: 100 };

  it.each(['Comida', ' comida '])('flags the first expense in category "%s"', async (catName) => {
    const { service, expenseRepo } = build({ catName });
    await service.addExpense('c1', 'h1', dto);
    expect(expenseRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isShoppingBudget: true, name: 'Presupuesto compra', amount: 100 }),
    );
  });

  it('does not flag the second expense in Comida', async () => {
    const { service, expenseRepo } = build({ categoryCount: 1 });
    await service.addExpense('c1', 'h1', dto);
    const saved = expenseRepo.save.mock.calls[0][0];
    expect(saved.isShoppingBudget).toBeFalsy();
    expect(saved.name).toBe('Super');
  });

  it('does not flag the first expense in another category', async () => {
    const { service, expenseRepo } = build({ catName: 'Hogar' });
    await service.addExpense('c1', 'h1', dto);
    const saved = expenseRepo.save.mock.calls[0][0];
    expect(saved.isShoppingBudget).toBeFalsy();
    expect(saved.name).toBe('Super');
  });

  it('does not flag when the budget already has a flagged expense', async () => {
    const { service, expenseRepo } = build({ flaggedCount: 1 });
    await service.addExpense('c1', 'h1', dto);
    const saved = expenseRepo.save.mock.calls[0][0];
    expect(saved.isShoppingBudget).toBeFalsy();
    expect(saved.name).toBe('Super');
  });

  it('updateExpense cannot set isShoppingBudget', async () => {
    const { service, expenseRepo } = build();
    await service.updateExpense('e1', 'h1', { name: 'y', isShoppingBudget: true } as any);
    const saved = expenseRepo.save.mock.calls[0][0];
    expect(saved.name).toBe('y');
    expect(saved.isShoppingBudget).toBeUndefined();
  });

  it('addExpense ignores a client-sent isShoppingBudget', async () => {
    const { service, expenseRepo } = build({ catName: 'Hogar' });
    await service.addExpense('c1', 'h1', { ...dto, isShoppingBudget: true });
    expect(expenseRepo.save.mock.calls[0][0].isShoppingBudget).toBeFalsy();
  });

  describe('getShoppingBudget', () => {
    it('returns the monthly amount of the flagged expense', async () => {
      const { service, budgetRepo } = build({
        budget: {
          categories: [
            { expenses: [{ amount: '5', periodicity: 'monthly' }, { amount: '100', periodicity: 'weekly', isShoppingBudget: true }] },
          ],
        },
      });
      expect(await service.getShoppingBudget('h1')).toBe(433.33);
      expect(budgetRepo.find).toHaveBeenCalledWith({
        where: { house: { id: 'h1' } },
        order: { createdAt: 'DESC' },
        take: 1,
        relations: ['categories', 'categories.expenses'],
      });
    });

    it('returns null without a budget', async () => {
      const { service } = build({ budget: null });
      expect(await service.getShoppingBudget('h1')).toBeNull();
    });

    it('returns null when no expense is flagged', async () => {
      const { service } = build({ budget: { categories: [{ expenses: [{ amount: '5', periodicity: 'monthly' }] }] } });
      expect(await service.getShoppingBudget('h1')).toBeNull();
    });

    it('has no notification side effects', async () => {
      const { service, sendBudgetAlert, createIfNotRecent } = build({ budget: { categories: [] } });
      await service.getShoppingBudget('h1');
      expect(sendBudgetAlert).not.toHaveBeenCalled();
      expect(createIfNotRecent).not.toHaveBeenCalled();
    });
  });
});

describe('BudgetService auto-creates the fund and FI goal on the first income', () => {
  function build(opts: { incomeCount?: number; funds?: number; goal?: any; fail?: boolean } = {}) {
    const budget = { id: 'b1', incomeSources: [{ amount: 1000 }] };
    const budgetRepo: any = { findOne: jest.fn().mockResolvedValue(budget) };
    const incomeRepo: any = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(opts.incomeCount ?? 0),
    };
    const savingsGoalRepo: any = {
      findOne: jest.fn().mockResolvedValue(opts.goal ?? null),
      save: jest.fn(async (g) => g),
      create: jest.fn((x) => x),
    };
    const fundRepo: any = {
      count: opts.fail ? jest.fn().mockRejectedValue(new Error('db down')) : jest.fn().mockResolvedValue(opts.funds ?? 0),
      save: jest.fn(async (f) => f),
      create: jest.fn((x) => x),
    };
    const noop = {} as any;
    const service = new BudgetService(budgetRepo, noop, noop, incomeRepo, savingsGoalRepo, noop, noop, noop, fundRepo);
    return { service, savingsGoalRepo, fundRepo };
  }
  const add = (s: BudgetService) => s.addIncome('b1', 'h1', { name: 'x', amount: 1000 } as any);

  it('creates a budget-synced emergency fund and the FI goal', async () => {
    const { service, savingsGoalRepo, fundRepo } = build();
    await add(service);
    expect(fundRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ syncWithBudget: true, house: { id: 'h1' } }),
    );
    expect(savingsGoalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Independencia Financiera', goalAmount: 150000 }),
    );
  });

  it('does nothing on later incomes (a fund or goal the user deleted stays deleted)', async () => {
    const { service, savingsGoalRepo, fundRepo } = build({ incomeCount: 1 });
    await add(service);
    expect(fundRepo.save).not.toHaveBeenCalled();
    expect(savingsGoalRepo.create).not.toHaveBeenCalled();
  });

  it('never creates a second fund when the house already has one', async () => {
    const { service, savingsGoalRepo, fundRepo } = build({ funds: 1 });
    await add(service);
    expect(fundRepo.save).not.toHaveBeenCalled();
    expect(savingsGoalRepo.save).toHaveBeenCalled();
  });

  it('updates the existing FI goal instead of duplicating it', async () => {
    const goal = { name: 'Independencia Financiera', goalAmount: 1 };
    const { service, savingsGoalRepo } = build({ goal });
    await add(service);
    expect(savingsGoalRepo.create).not.toHaveBeenCalled();
    expect(goal.goalAmount).toBe(150000);
  });

  it('a failure while creating the plan does not fail addIncome', async () => {
    const { service } = build({ fail: true });
    await expect(add(service)).resolves.toBeDefined();
  });
});

describe('BudgetService.getOutingsBudget', () => {
  const build = (budget: any) => {
    const budgetRepo: any = { find: jest.fn().mockResolvedValue(budget ? [budget] : []) };
    const noop = {} as any;
    return new BudgetService(budgetRepo, noop, noop, noop, noop, noop, noop, noop);
  };
  const withExpense = (catName: string, e: any) => ({
    id: 'b1',
    categories: [{ name: catName, expenses: [e] }],
  });

  it('returns the monthly amount of the "Salidas" expense in the Comida category', async () => {
    const svc = build(withExpense('Comida', { name: 'Salidas', amount: 120, periodicity: 'monthly' }));
    expect(await svc.getOutingsBudget('h1')).toBe(120);
  });

  it('matches the name ignoring case and spaces, and converts other periodicities to monthly', async () => {
    const svc = build(withExpense(' comida ', { name: '  SALIDAS ', amount: 1200, periodicity: 'annual' }));
    expect(await svc.getOutingsBudget('h1')).toBe(100);
  });

  it('is null without a budget, without the expense, or when it is in another category', async () => {
    expect(await build(null).getOutingsBudget('h1')).toBeNull();
    expect(await build(withExpense('Comida', { name: 'Mercado', amount: 50, periodicity: 'monthly' })).getOutingsBudget('h1')).toBeNull();
    expect(await build(withExpense('Casa', { name: 'Salidas', amount: 50, periodicity: 'monthly' })).getOutingsBudget('h1')).toBeNull();
  });
});
