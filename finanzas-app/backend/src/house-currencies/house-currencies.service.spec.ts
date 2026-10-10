import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HouseCurrenciesService } from './house-currencies.service';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { House } from '../database/entities/house.entity';

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

    service = new HouseCurrenciesService(repo, ratesRepo, {} as any);
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
    service = new HouseCurrenciesService(repo, ratesRepo, {} as any);
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

describe('HouseCurrenciesService inverse-rate fallback', () => {
  let service: HouseCurrenciesService;
  let repo: jest.Mocked<Repository<HouseCurrency>>;
  let ratesRepo: jest.Mocked<Repository<ExchangeRate>>;
  let queryBuilder: { where: jest.Mock; andWhere: jest.Mock; orderBy: jest.Mock; getOne: jest.Mock };

  const HOUSE_ID = 'house-1';

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repo = { find: jest.fn(), findOne: jest.fn() } as unknown as jest.Mocked<Repository<HouseCurrency>>;
    ratesRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<ExchangeRate>>;
    service = new HouseCurrenciesService(repo, ratesRepo, {} as any);
  });

  it('resolveRateToLocal inverts the opposite-direction rate when only local → X exists', async () => {
    (service as any).getLocalCurrency = jest
      .fn()
      .mockResolvedValue({ currencyCode: 'CUP', isLocal: true });
    repo.findOne.mockResolvedValue({ currencyCode: 'USD', isActive: true } as any);
    // USD → CUP: nothing (dated or overall); CUP → USD: 0.0025
    ratesRepo.findOne.mockImplementation((async (opts: any) =>
      opts.where.fromCurrency === 'CUP' ? { rate: 0.0025 } : null) as any);

    const result = await service.resolveRateToLocal(HOUSE_ID, 'USD', '2026-01-15');

    expect(result.localCode).toBe('CUP');
    expect(result.rate).toBeCloseTo(400, 6);
  });

  it('getRates returns null (not 1) for a currency without any rate', async () => {
    repo.find.mockResolvedValue([
      { currencyCode: 'CUP', isLocal: true },
      { currencyCode: 'USD', isLocal: false },
    ] as any);
    ratesRepo.findOne.mockResolvedValue(null);

    const rates = await service.getRates(HOUSE_ID);

    expect(rates).toEqual({ CUP: 1, USD: null });
  });

  it('getRates inverts the opposite-direction rate when only local → X exists', async () => {
    repo.find.mockResolvedValue([
      { currencyCode: 'CUP', isLocal: true },
      { currencyCode: 'USD', isLocal: false },
    ] as any);
    ratesRepo.findOne.mockImplementation((async (opts: any) =>
      opts.where.fromCurrency === 'CUP' ? { rate: 0.004 } : null) as any);

    const rates = await service.getRates(HOUSE_ID);

    expect(rates.CUP).toBe(1);
    expect(rates.USD).toBeCloseTo(250, 6);
  });
});

describe('HouseCurrenciesService.setLocal', () => {
  const HOUSE_ID = 'house-1';
  const USD = { id: 'u', currencyCode: 'USD', isLocal: true, isActive: true };
  const CUP = { id: 'c', currencyCode: 'CUP', isLocal: false, isActive: true };
  const EUR = { id: 'e', currencyCode: 'EUR', isLocal: false, isActive: true };
  const TODAY = new Date().toISOString().split('T')[0];

  let service: HouseCurrenciesService;
  let repo: jest.Mocked<Repository<HouseCurrency>>;
  let manager: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock; query: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let rates: Array<{ fromCurrency: string; toCurrency: string; rate: number; date: string }>;
  let currencies: any[];

  beforeEach(() => {
    rates = [];
    currencies = [USD, CUP, EUR];
    manager = {
      findOne: jest.fn(async (entity: any, opts: any) => {
        const w = opts.where;
        if (entity === House) return { id: w.id };
        if (entity === HouseCurrency) {
          if (w.isLocal) return USD;
          return currencies.find((c) => c.id === w.id) ?? null;
        }
        // ExchangeRate lookups
        const found = rates
          .filter((r) => r.fromCurrency === w.fromCurrency && r.toCurrency === w.toCurrency)
          .filter((r) => (w.date ? r.date === w.date : true))
          .sort((a, b) => b.date.localeCompare(a.date));
        return found[0] ?? null;
      }),
      find: jest.fn(async () => [USD, EUR, CUP]),
      create: jest.fn((_e: any, x: any) => x),
      save: jest.fn(async (_e: any, x: any) => {
        rates.push(x);
        return x;
      }),
      update: jest.fn(async () => undefined),
      query: jest.fn(async () => undefined),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    repo = { findOne: jest.fn(), findOneOrFail: jest.fn() } as unknown as jest.Mocked<Repository<HouseCurrency>>;
    service = new HouseCurrenciesService(repo, {} as any, dataSource as any);
  });

  const newRate = (from: string, to: string) =>
    rates.find((r) => r.fromCurrency === from && r.toCurrency === to && r.date === TODAY);

  it('switching USD → CUP with a CUP→USD rate creates X→CUP and O→N rates, rebases expenses and flips flags in one transaction', async () => {
    // 1 CUP = 0.0025 USD (so 1 USD = 400 CUP); 1 EUR = 1.1 USD
    rates.push({ fromCurrency: 'CUP', toCurrency: 'USD', rate: 0.0025, date: '2026-01-01' });
    rates.push({ fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.1, date: '2026-01-01' });

    await service.setLocal(HOUSE_ID, 'c');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(Number(newRate('USD', 'CUP').rate)).toBeCloseTo(400, 4);
    expect(Number(newRate('EUR', 'CUP').rate)).toBeCloseTo(440, 4);
    // flags flipped through the transactional manager
    expect(manager.update).toHaveBeenCalledWith(
      HouseCurrency,
      { house: { id: HOUSE_ID } },
      { isLocal: false },
    );
    expect(manager.update).toHaveBeenCalledWith(
      HouseCurrency,
      { id: 'c', house: { id: HOUSE_ID } },
      { isLocal: true },
    );
    // expense rebase: one UPDATE for N-denominated, one for the rest
    const sqls = manager.query.mock.calls.map((c) => String(c[0]));
    expect(sqls).toHaveLength(2);
    expect(sqls.every((s) => /UPDATE\s+"household_expenses"/i.test(s))).toBe(true);
    const nCall = manager.query.mock.calls.find((c) => /"amountLocal"\s*=\s*"amount"/.test(c[0]));
    expect(nCall[1]).toEqual([HOUSE_ID, 'CUP']);
    const otherCall = manager.query.mock.calls.find((c) => !/"amountLocal"\s*=\s*"amount"/.test(c[0]));
    expect(otherCall[1][0]).toBe(HOUSE_ID);
    expect(otherCall[1][1]).toBe('CUP');
    expect(Number(otherCall[1][2])).toBeCloseTo(0.0025, 8); // rate(N→O)
  });

  it('creates the O→N rate as 1 / rate(N→O)', async () => {
    rates.push({ fromCurrency: 'CUP', toCurrency: 'USD', rate: 0.0025, date: '2026-01-01' });

    await service.setLocal(HOUSE_ID, 'c');

    expect(Number(newRate('USD', 'CUP').rate)).toBeCloseTo(400, 4);
  });

  it('accepts the inverse O→N rate when N→O does not exist', async () => {
    rates.push({ fromCurrency: 'USD', toCurrency: 'CUP', rate: 400, date: '2026-01-01' });

    await service.setLocal(HOUSE_ID, 'c');

    expect(Number(newRate('USD', 'CUP').rate)).toBeCloseTo(400, 4);
    const otherCall = manager.query.mock.calls.find((c) => !/"amountLocal"\s*=\s*"amount"/.test(c[0]));
    expect(Number(otherCall[1][2])).toBeCloseTo(0.0025, 8);
  });

  it('throws a clear 400 and changes nothing when no N↔O rate exists', async () => {
    rates.push({ fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.1, date: '2026-01-01' });

    await expect(service.setLocal(HOUSE_ID, 'c')).rejects.toThrow(BadRequestException);
    await expect(service.setLocal(HOUSE_ID, 'c')).rejects.toThrow(/CUP → USD/);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('is a no-op when the target is already the local currency', async () => {
    manager.findOne.mockImplementation(async (entity: any, opts: any) =>
      entity === House ? { id: HOUSE_ID } : entity === HouseCurrency ? USD : null,
    );

    const result = await service.setLocal(HOUSE_ID, 'u');

    expect(result).toBe(USD);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('locks the house row (pessimistic_write) before reading the current local currency', async () => {
    rates.push({ fromCurrency: 'CUP', toCurrency: 'USD', rate: 0.0025, date: '2026-01-01' });

    await service.setLocal(HOUSE_ID, 'c');

    const calls = manager.findOne.mock.calls;
    const lockIdx = calls.findIndex(([entity]) => entity === House);
    const localIdx = calls.findIndex(([entity, opts]) => entity === HouseCurrency && opts.where.isLocal);
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(calls[lockIdx][1]).toEqual({
      where: { id: HOUSE_ID },
      lock: { mode: 'pessimistic_write' },
    });
    expect(localIdx).toBeGreaterThan(lockIdx);
  });

  it('does not rebase when the re-read after the lock shows the target is already local (concurrent caller)', async () => {
    const CUP_LOCAL = { ...CUP, isLocal: true };
    rates.push({ fromCurrency: 'CUP', toCurrency: 'USD', rate: 0.0025, date: '2026-01-01' });
    // The first caller switched the house to CUP while this one waited on the lock.
    manager.findOne.mockImplementation(async (entity: any, opts: any) => {
      if (entity === House) return { id: HOUSE_ID };
      if (entity === HouseCurrency) return opts.where.isLocal ? CUP_LOCAL : CUP;
      return null;
    });

    const result = await service.setLocal(HOUSE_ID, 'c');

    expect(result).toBe(CUP);
    expect(manager.query).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('throws NotFound when the house does not exist', async () => {
    manager.findOne.mockImplementation(async () => null);

    await expect(service.setLocal(HOUSE_ID, 'c')).rejects.toThrow(NotFoundException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });
});
