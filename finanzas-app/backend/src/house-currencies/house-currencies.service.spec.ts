import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HouseCurrenciesService } from './house-currencies.service';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';

/**
 * Unit tests for `resolveRateToLocal`, the strict rate lookup used by the
 * household-expenses write path (create/update). Unlike `getRates()`
 * (display-only, silently falls back to rate 1), this method must hard-fail
 * when no exchange rate is configured for the entered→local currency pair.
 *
 * These cases also document the rate-resolution precedence (dated rate →
 * newest rate → 400) used by the migration backfill in
 * `1790598294601-HouseholdExpenseCurrency.ts`.
 */
describe('HouseCurrenciesService.resolveRateToLocal', () => {
  let service: HouseCurrenciesService;
  let repo: jest.Mocked<Repository<HouseCurrency>>;
  let ratesRepo: jest.Mocked<Repository<ExchangeRate>>;

  const HOUSE_ID = 'house-1';
  const LOCAL = { id: 'cur-cup', currencyCode: 'CUP', isLocal: true, isActive: true };
  const USD_CURRENCY = { id: 'cur-usd', currencyCode: 'USD', isLocal: false, isActive: true };

  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    repo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<HouseCurrency>>;

    ratesRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<ExchangeRate>>;

    service = new HouseCurrenciesService(repo, ratesRepo);
    (service as any).getLocalCurrency = jest.fn().mockResolvedValue(LOCAL);
  });

  it('returns rate 1 when the entered currency is already the local currency', async () => {
    const result = await service.resolveRateToLocal(HOUSE_ID, 'CUP', '2026-01-15');

    expect(result).toEqual({ localCode: 'CUP', rate: 1 });
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('uses the newest rate with date <= the expense date when one exists', async () => {
    repo.findOne.mockResolvedValue(USD_CURRENCY as any);
    queryBuilder.getOne.mockResolvedValue({ rate: 380 });

    const result = await service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15');

    expect(result).toEqual({ localCode: 'CUP', rate: 380 });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('er.date <= :onDate', {
      onDate: '2026-01-15',
    });
    expect(ratesRepo.findOne).not.toHaveBeenCalled();
  });

  it('falls back to the newest overall rate when no dated rate exists on/before the expense date', async () => {
    repo.findOne.mockResolvedValue(USD_CURRENCY as any);
    queryBuilder.getOne.mockResolvedValue(null);
    ratesRepo.findOne.mockResolvedValue({ rate: 400 } as any);

    const result = await service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15');

    expect(result).toEqual({ localCode: 'CUP', rate: 400 });
    expect(ratesRepo.findOne).toHaveBeenCalledWith({
      where: { house: { id: HOUSE_ID }, fromCurrency: 'USD', toCurrency: 'CUP' },
      order: { date: 'DESC' },
    });
  });

  it('scopes the dated rate query by house', async () => {
    repo.findOne.mockResolvedValue(USD_CURRENCY as any);
    queryBuilder.getOne.mockResolvedValue({ rate: 380 });

    await service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15');

    expect(queryBuilder.where).toHaveBeenCalledWith('er.house_id = :houseId', {
      houseId: HOUSE_ID,
    });
  });

  it('throws 400 when no exchange rate exists at all for the pair', async () => {
    repo.findOne.mockResolvedValue(USD_CURRENCY as any);
    queryBuilder.getOne.mockResolvedValue(null);
    ratesRepo.findOne.mockResolvedValue(null);

    await expect(
      service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when the currency is not active in the house', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.resolveRateToLocal(HOUSE_ID, 'EUR', '2026-01-15'),
    ).rejects.toThrow(BadRequestException);
    expect(queryBuilder.getOne).not.toHaveBeenCalled();
  });

  it('throws 400 when the house has no local currency configured', async () => {
    (service as any).getLocalCurrency = jest.fn().mockResolvedValue(null);

    await expect(
      service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('HouseCurrenciesService rate scoping by house', () => {
  let service: HouseCurrenciesService;
  let repo: jest.Mocked<Repository<HouseCurrency>>;
  let ratesRepo: jest.Mocked<Repository<ExchangeRate>>;

  const HOUSE_ID = 'house-1';

  beforeEach(() => {
    repo = { find: jest.fn() } as unknown as jest.Mocked<Repository<HouseCurrency>>;
    ratesRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    } as unknown as jest.Mocked<Repository<ExchangeRate>>;
    service = new HouseCurrenciesService(repo, ratesRepo);
  });

  it('getRates only reads rates belonging to the house', async () => {
    repo.find.mockResolvedValue([
      { currencyCode: 'CUP', isLocal: true },
      { currencyCode: 'USD', isLocal: false },
    ] as any);
    ratesRepo.findOne.mockResolvedValue({ rate: 380 } as any);

    const rates = await service.getRates(HOUSE_ID);

    expect(rates).toEqual({ CUP: 1, USD: 380 });
    expect(ratesRepo.findOne).toHaveBeenCalledWith({
      where: { house: { id: HOUSE_ID }, fromCurrency: 'USD', toCurrency: 'CUP' },
      order: { date: 'DESC' },
    });
  });

  it('upsertRate looks up today\'s row within the house only', async () => {
    ratesRepo.findOne.mockResolvedValue(null);

    await service.upsertRate(HOUSE_ID, { fromCurrency: 'USD', toCurrency: 'CUP', rate: 400 });

    expect(ratesRepo.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        house: { id: HOUSE_ID },
        fromCurrency: 'USD',
        toCurrency: 'CUP',
      }),
    });
  });

  it('upsertRate saves new rows attached to the house', async () => {
    ratesRepo.findOne.mockResolvedValue(null);

    await service.upsertRate(HOUSE_ID, { fromCurrency: 'USD', toCurrency: 'CUP', rate: 400 });

    expect(ratesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ house: { id: HOUSE_ID }, rate: 400 }),
    );
  });
});
