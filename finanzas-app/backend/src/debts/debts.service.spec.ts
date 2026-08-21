import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DebtsService } from './debts.service';
import { Debt } from '../database/entities/debt.entity';

/**
 * Regression test for the IDOR fix on DebtsService.findOne.
 *
 * Before the fix, findOne(id, houseId) did not filter by house, so a user
 * could read another house's debt record by id. The fix adds
 * `house: { id: houseId }` to the where clause.
 */
describe('DebtsService.findOne (IDOR regression)', () => {
  let service: DebtsService;
  let debtRepo: jest.Mocked<Repository<Debt>>;

  const HOUSE_A = 'house-a-id';
  const HOUSE_B = 'house-b-id';
  const DEBT_ID = 'debt-1';

  beforeEach(() => {
    debtRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Debt>>;

    service = new DebtsService(debtRepo);
  });

  it('queries with the house filter included in the where clause', async () => {
    debtRepo.findOne.mockResolvedValue({ id: DEBT_ID } as any);

    await service.findOne(DEBT_ID, HOUSE_A);

    expect(debtRepo.findOne).toHaveBeenCalledWith({
      where: { id: DEBT_ID, house: { id: HOUSE_A } },
    });
  });

  it('throws NotFoundException when the debt belongs to a different house', async () => {
    debtRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne(DEBT_ID, HOUSE_B)).rejects.toThrow(
      NotFoundException,
    );

    expect(debtRepo.findOne).toHaveBeenCalledWith({
      where: { id: DEBT_ID, house: { id: HOUSE_B } },
    });
  });

  it('returns the debt when it belongs to the requesting house', async () => {
    const debt = { id: DEBT_ID, personName: 'Juan' } as any;
    debtRepo.findOne.mockResolvedValue(debt);

    const result = await service.findOne(DEBT_ID, HOUSE_A);

    expect(result).toBe(debt);
  });
});
