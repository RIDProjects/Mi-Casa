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

    service = new EmergencyFundService(fundRepo, catRepo, transactionsService);
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
