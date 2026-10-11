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
