import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DebtsService, DebtSnapshot, computeStrategy } from './debts.service';
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

describe('computeStrategy', () => {
  const debt = (id: string, balance: number, interestRate: number, minimumPayment: number): DebtSnapshot => ({
    id,
    label: id,
    balance,
    interestRate,
    minimumPayment,
  });
  const twoZeroRate = [debt('A', 1000, 0, 100), debt('B', 1000, 0, 50)];

  it('minimum strategy pays only minimums and does not roll freed money (20 months)', () => {
    const result = computeStrategy(twoZeroRate, 'minimum', 0);
    expect(result.feasible).toBe(true);
    expect(result.monthsToPayoff).toBe(20);
    expect(result.debtDetails.find(d => d.id === 'A').payoffMonth).toBe(10);
    expect(result.debtDetails.find(d => d.id === 'B').payoffMonth).toBe(20);
  });

  it('snowball rolls the freed minimum into the next debt even with extraPayment 0 (14 months)', () => {
    // Months 1-10: A 100 + B 50. B left with 500. Months 11-14: 150/month -> 450, then 50.
    const result = computeStrategy(twoZeroRate, 'snowball', 0);
    expect(result.feasible).toBe(true);
    expect(result.monthsToPayoff).toBe(14);
    expect(result.debtDetails.find(d => d.id === 'B').payoffMonth).toBe(14);
  });

  it('avalanche rolls the freed minimum into the next debt (14 months)', () => {
    const result = computeStrategy(twoZeroRate, 'avalanche', 0);
    expect(result.feasible).toBe(true);
    expect(result.monthsToPayoff).toBe(14);
  });

  it('applies extraPayment on top of the rolled budget', () => {
    // Budget 200/month, total 2000 -> 10 months.
    const result = computeStrategy(twoZeroRate, 'snowball', 50);
    expect(result.monthsToPayoff).toBe(10);
    expect(result.payoffTimeline[result.payoffTimeline.length - 1].totalBalance).toBe(0);
  });

  it('cascades leftover to the next target when the target is paid off', () => {
    // Budget 70 + 500. Month 1: mins A 60, B 10; leftover 500 -> A (40 left) paid, 460 cascades to B.
    const result = computeStrategy([debt('A', 100, 0, 60), debt('B', 1000, 0, 10)], 'snowball', 500);
    expect(result.debtDetails.find(d => d.id === 'A').payoffMonth).toBe(1);
    expect(result.payoffTimeline[0].totalBalance).toBe(1100 - 60 - 10 - 500);
  });

  it('flags a debt with minimum 0 and positive rate as not feasible instead of running 600 months', () => {
    const result = computeStrategy([debt('A', 1000, 20, 0)], 'minimum', 0);
    expect(result.feasible).toBe(false);
    expect(result.monthsToPayoff).toBeLessThan(600);
  });

  it('flags a minimum that does not cover monthly interest as not feasible', () => {
    // Monthly interest 1000 * 24% / 12 = 20 > min 10
    const result = computeStrategy([debt('A', 1000, 24, 10)], 'avalanche', 0);
    expect(result.feasible).toBe(false);
  });

  it('becomes feasible when extraPayment covers the interest', () => {
    const result = computeStrategy([debt('A', 1000, 24, 10)], 'avalanche', 100);
    expect(result.feasible).toBe(true);
  });

  it('avalanche pays no more total interest than snowball', () => {
    const debts = [debt('Small', 500, 10, 25), debt('Big', 5000, 24, 100)];
    const avalanche = computeStrategy(debts, 'avalanche', 200);
    const snowball = computeStrategy(debts, 'snowball', 200);
    expect(avalanche.feasible).toBe(true);
    expect(snowball.feasible).toBe(true);
    expect(avalanche.totalInterestPaid).toBeLessThan(snowball.totalInterestPaid);
  });

  it('exposes feasible in the frontend payload', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        { id: 'x', type: 'i_owe', personName: 'X', amount: 1000, interestRate: 20, minimumPayment: 0 },
      ]),
    } as unknown as jest.Mocked<Repository<Debt>>;
    const res = await new DebtsService(repo).getPayoffStrategies('h', 0);
    expect(res.strategies.minimum.feasible).toBe(false);
    expect(res.strategies.avalanche.feasible).toBe(false);
    expect(res.strategies.snowball.feasible).toBe(false);
  });
});
