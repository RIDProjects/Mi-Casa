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

    service = new BudgetService(
      budgetRepo,
      noop as Repository<BudgetCategory>,
      noop as Repository<BudgetExpense>,
      noop as Repository<IncomeSource>,
      noop as Repository<SavingsGoal>,
      notificationsService,
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
