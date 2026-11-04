import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmergencyFundService } from './emergency-fund.service';
import { EmergencyFund, ExpenseCategory } from '../database/entities/emergency-fund.entity';
import { TransactionsService } from '../transactions/transactions.service';

/**
 * Regression test for the IDOR fix on EmergencyFundService.findOne.
 *
 * Before the fix, findOne(id, houseId) did not filter by house, so a user
 * could read another house's emergency fund by id. The fix adds
 * `house: { id: houseId }` to the where clause.
 */
describe('EmergencyFundService.findOne (IDOR regression)', () => {
  let service: EmergencyFundService;
  let fundRepo: jest.Mocked<Repository<EmergencyFund>>;

  const HOUSE_A = 'house-a-id';
  const HOUSE_B = 'house-b-id';
  const FUND_ID = 'fund-1';

  beforeEach(() => {
    fundRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<EmergencyFund>>;

    const catRepo = {} as Repository<ExpenseCategory>;
    const transactionsService = {} as TransactionsService;

    service = new EmergencyFundService(fundRepo, catRepo, transactionsService, { getEmergencyFundBasis: jest.fn() } as any);
  });

  it('queries with the house filter included in the where clause', async () => {
    fundRepo.findOne.mockResolvedValue({
      id: FUND_ID,
      categories: [],
      targetMonths: 6,
      minimumMonths: 3,
      savingPeriodMonths: 12,
    } as any);

    await service.findOne(FUND_ID, HOUSE_A);

    expect(fundRepo.findOne).toHaveBeenCalledWith({
      where: { id: FUND_ID, house: { id: HOUSE_A } },
      relations: ['categories'],
    });
  });

  it('throws NotFoundException when the fund belongs to a different house', async () => {
    fundRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne(FUND_ID, HOUSE_B)).rejects.toThrow(
      NotFoundException,
    );

    expect(fundRepo.findOne).toHaveBeenCalledWith({
      where: { id: FUND_ID, house: { id: HOUSE_B } },
      relations: ['categories'],
    });
  });

  it('returns the fund with calculations when it belongs to the requesting house', async () => {
    fundRepo.findOne.mockResolvedValue({
      id: FUND_ID,
      categories: [{ monthlyAmount: 100 }],
      targetMonths: 6,
      minimumMonths: 3,
      savingPeriodMonths: 12,
    } as any);

    const result = await service.findOne(FUND_ID, HOUSE_A);

    expect(result.id).toBe(FUND_ID);
    expect(result.calculations).toBeDefined();
  });
});

describe('EmergencyFundService live budget sync', () => {
  const HOUSE = 'house-1';
  const lines = [
    { name: 'Rent', monthlyAmount: 1000 },
    { name: 'Food', monthlyAmount: 500.5 },
  ];

  function build() {
    const fundRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'f1', ...x })),
    };
    const catRepo = {
      delete: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
    };
    const budgetService = { getEmergencyFundBasis: jest.fn() };
    const service = new EmergencyFundService(
      fundRepo as any,
      catRepo as any,
      {} as any,
      budgetService as any,
    );
    return { service, fundRepo, catRepo, budgetService };
  }

  const fund = (over: any = {}) => ({
    id: 'f1',
    categories: [{ name: 'Manual', monthlyAmount: 100 }],
    targetMonths: 6,
    minimumMonths: 3,
    savingPeriodMonths: 12,
    syncWithBudget: false,
    ...over,
  });

  it('derives categories, target months and calculations from the budget when sync is on', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true }));
    budgetService.getEmergencyFundBasis.mockResolvedValue({ lines, emergencyFundMonths: 9 });

    const result: any = await service.findOne('f1', HOUSE);

    expect(budgetService.getEmergencyFundBasis).toHaveBeenCalledWith(HOUSE);
    expect(result.categories).toEqual(lines);
    expect(result.targetMonths).toBe(9);
    expect(result.budgetSynced).toBe(true);
    expect(result.calculations.totalMonthlyExpenses).toBe(1500.5);
    expect(result.calculations.optimalFund).toBe(1500.5 * 9);
  });

  it('falls back to stored data when the house has no budget', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true }));
    budgetService.getEmergencyFundBasis.mockResolvedValue(null);

    const result: any = await service.findOne('f1', HOUSE);

    expect(result.categories).toEqual([{ name: 'Manual', monthlyAmount: 100 }]);
    expect(result.targetMonths).toBe(6);
    expect(result.budgetSynced).toBe(false);
  });

  it('falls back to stored data when the budget has no fixed expenses', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true }));
    budgetService.getEmergencyFundBasis.mockResolvedValue({ lines: [], emergencyFundMonths: 9 });

    const result: any = await service.findOne('f1', HOUSE);

    expect(result.categories).toEqual([{ name: 'Manual', monthlyAmount: 100 }]);
    expect(result.targetMonths).toBe(6);
    expect(result.budgetSynced).toBe(false);
  });

  it('uses the plan default months when the budget defines none, ignoring the fund value', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true, targetMonths: 8 }));
    budgetService.getEmergencyFundBasis.mockResolvedValue({ lines, emergencyFundMonths: null });

    const result: any = await service.findOne('f1', HOUSE);

    expect(result.targetMonths).toBe(6);
    expect(result.budgetSynced).toBe(true);
  });

  it('never queries the budget when sync is off', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund());

    const result: any = await service.findOne('f1', HOUSE);

    expect(budgetService.getEmergencyFundBasis).not.toHaveBeenCalled();
    expect(result.categories).toEqual([{ name: 'Manual', monthlyAmount: 100 }]);
    expect(result.budgetSynced).toBe(false);
  });

  it('findAll fetches the basis once for several synced funds', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.find.mockResolvedValue([
      fund({ id: 'a', syncWithBudget: true }),
      fund({ id: 'b', syncWithBudget: true }),
      fund({ id: 'c' }),
    ]);
    budgetService.getEmergencyFundBasis.mockResolvedValue({ lines, emergencyFundMonths: 9 });

    const result: any[] = await service.findAll(HOUSE);

    expect(budgetService.getEmergencyFundBasis).toHaveBeenCalledTimes(1);
    expect(result.map((f) => f.budgetSynced)).toEqual([true, true, false]);
  });

  it('findAll does not fetch the basis when no fund is synced', async () => {
    const { service, fundRepo, budgetService } = build();
    fundRepo.find.mockResolvedValue([fund({ id: 'a' }), fund({ id: 'b' })]);

    await service.findAll(HOUSE);

    expect(budgetService.getEmergencyFundBasis).not.toHaveBeenCalled();
  });

  it('update ignores sent categories when the fund is synced', async () => {
    const { service, fundRepo, catRepo, budgetService } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true }));
    budgetService.getEmergencyFundBasis.mockResolvedValue({ lines, emergencyFundMonths: 9 });

    await service.update('f1', HOUSE, { categories: [{ name: 'X', monthlyAmount: 1 }] });

    expect(catRepo.delete).not.toHaveBeenCalled();
    expect(catRepo.save).not.toHaveBeenCalled();
  });

  it('update ignores sent categories when the same call turns sync on', async () => {
    const { service, fundRepo, catRepo } = build();
    fundRepo.findOne.mockResolvedValue(fund());

    await service.update('f1', HOUSE, { syncWithBudget: true, categories: [{ name: 'X', monthlyAmount: 1 }] });

    expect(catRepo.delete).not.toHaveBeenCalled();
    expect(catRepo.save).not.toHaveBeenCalled();
  });

  it('update still replaces categories when sync is off', async () => {
    const { service, fundRepo, catRepo } = build();
    fundRepo.findOne.mockResolvedValue(fund());

    await service.update('f1', HOUSE, { categories: [{ name: 'X', monthlyAmount: 1 }] });

    expect(catRepo.delete).toHaveBeenCalledWith({ fund: { id: 'f1' } });
    expect(catRepo.save).toHaveBeenCalled();
  });

  it('create persists syncWithBudget from the dto', async () => {
    const { service, fundRepo } = build();
    fundRepo.findOne.mockResolvedValue(fund({ syncWithBudget: true }));

    await service.create({ name: 'F', syncWithBudget: true }, HOUSE);

    expect(fundRepo.create).toHaveBeenCalledWith(expect.objectContaining({ syncWithBudget: true }));
  });
});
