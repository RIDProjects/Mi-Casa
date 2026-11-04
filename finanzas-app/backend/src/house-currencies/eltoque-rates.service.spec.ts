import { ElToqueRatesService, parseElToqueRates } from './eltoque-rates.service';

describe('parseElToqueRates', () => {
  it('maps elToque keys to ISO codes (ECU → EUR) and drops invalid values', () => {
    expect(parseElToqueRates({ tasas: { USD: 520, ECU: 560.5, MLC: 400, BTC: 'x', TRX: 0 } })).toEqual({
      USD: 520,
      EUR: 560.5,
    });
  });

  it('returns an empty map for an unexpected payload', () => {
    expect(parseElToqueRates(null)).toEqual({});
    expect(parseElToqueRates({ foo: 1 })).toEqual({});
  });
});

describe('ElToqueRatesService', () => {
  const HOUSE = 'house-1';
  let currencies: { findByHouse: jest.Mock; upsertRate: jest.Mock };
  let houses: { find: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  let fetchPayload: jest.Mock;
  let service: ElToqueRatesService;

  const cur = (code: string, isLocal = false) => ({ currencyCode: code, isLocal });

  beforeEach(() => {
    process.env.ELTOQUE_API_KEY = 'token';
    currencies = {
      findByHouse: jest.fn().mockResolvedValue([cur('CUP', true), cur('USD'), cur('EUR'), cur('ARS')]),
      upsertRate: jest.fn().mockResolvedValue(undefined),
    };
    houses = { find: jest.fn(), findOne: jest.fn(), update: jest.fn() };
    fetchPayload = jest.fn().mockResolvedValue({ tasas: { USD: 520, ECU: 560 } });
    service = new ElToqueRatesService(currencies as any, houses as any, fetchPayload);
  });

  afterEach(() => delete process.env.ELTOQUE_API_KEY);

  it('upserts <foreign> → CUP for active currencies elToque quotes, tagged as elToque/informal', async () => {
    const result = await service.refreshHouse(HOUSE);

    expect(currencies.upsertRate).toHaveBeenCalledTimes(2);
    expect(currencies.upsertRate).toHaveBeenCalledWith(HOUSE, {
      fromCurrency: 'USD', toCurrency: 'CUP', rate: 520, rateType: 'informal', source: 'eltoque',
    });
    expect(currencies.upsertRate).toHaveBeenCalledWith(HOUSE, {
      fromCurrency: 'EUR', toCurrency: 'CUP', rate: 560, rateType: 'informal', source: 'eltoque',
    });
    expect(result).toEqual({ updated: ['USD', 'EUR'] });
  });

  it('keeps syncing <foreign> → CUP when another currency (USD) is local, as long as CUP is active', async () => {
    currencies.findByHouse.mockResolvedValue([cur('USD', true), cur('CUP'), cur('EUR')]);
    expect(await service.refreshHouse(HOUSE)).toEqual({ updated: ['USD', 'EUR'] });
    expect(currencies.upsertRate).toHaveBeenCalledWith(HOUSE, {
      fromCurrency: 'USD', toCurrency: 'CUP', rate: 520, rateType: 'informal', source: 'eltoque',
    });
    expect(currencies.upsertRate).not.toHaveBeenCalledWith(HOUSE, expect.objectContaining({ fromCurrency: 'CUP' }));
  });

  it('does nothing when CUP is not an active currency of the house', async () => {
    currencies.findByHouse.mockResolvedValue([cur('USD', true), cur('EUR')]);
    expect(await service.refreshHouse(HOUSE)).toEqual({ updated: [] });
    expect(fetchPayload).not.toHaveBeenCalled();
    expect(currencies.upsertRate).not.toHaveBeenCalled();
  });

  it('refreshes the rates when the server starts, without blocking or throwing', async () => {
    houses.find.mockResolvedValue([{ id: 'a' }]);
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    await new Promise((r) => setImmediate(r));
    expect(currencies.upsertRate).toHaveBeenCalledWith('a', expect.objectContaining({ fromCurrency: 'USD' }));
    houses.find.mockRejectedValue(new Error('db down'));
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });

  it('does nothing when ELTOQUE_API_KEY is not configured', async () => {
    delete process.env.ELTOQUE_API_KEY;
    expect(await service.refreshHouse(HOUSE)).toEqual({ updated: [] });
    expect(fetchPayload).not.toHaveBeenCalled();
  });

  it('the daily job refreshes only houses with automatic rates on and survives a failing house', async () => {
    houses.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    currencies.findByHouse.mockRejectedValueOnce(new Error('boom'));
    await expect(service.refreshAll()).resolves.toBeUndefined();
    expect(houses.find).toHaveBeenCalledWith({ where: { autoExchangeRates: true }, select: ['id'] });
    expect(currencies.upsertRate).toHaveBeenCalledWith('b', expect.objectContaining({ fromCurrency: 'USD' }));
  });

  it('setAuto persists the flag and getStatus reports it with the latest elToque source', async () => {
    houses.findOne.mockResolvedValue({ id: HOUSE, autoExchangeRates: false });
    await service.setAuto(HOUSE, false);
    expect(houses.update).toHaveBeenCalledWith({ id: HOUSE }, { autoExchangeRates: false });
    expect(await service.getStatus(HOUSE)).toEqual({ enabled: false, available: true, managedCodes: [] });
  });

  describe('isManaged (manual edits blocked while elToque keeps the rate)', () => {
    beforeEach(() => houses.findOne.mockResolvedValue({ id: HOUSE, autoExchangeRates: true }));

    it.each(['USD', 'EUR'])('is managed for %s → CUP when auto is on and the token exists', async (code) => {
      expect(await service.isManaged(HOUSE, code, 'CUP')).toBe(true);
    });

    it.each(['USD', 'EUR'])('also blocks the inverse CUP → %s (CUP kept in sync even when USD is local)', async (code) => {
      expect(await service.isManaged(HOUSE, 'CUP', code)).toBe(true);
    });

    it('is not managed for other currencies or other targets', async () => {
      expect(await service.isManaged(HOUSE, 'ARS', 'CUP')).toBe(false);
      expect(await service.isManaged(HOUSE, 'USD', 'EUR')).toBe(false);
    });

    it('is not managed when auto is off', async () => {
      houses.findOne.mockResolvedValue({ id: HOUSE, autoExchangeRates: false });
      expect(await service.isManaged(HOUSE, 'USD', 'CUP')).toBe(false);
    });

    it('is not managed without the token (auto does nothing, so manual must stay possible)', async () => {
      delete process.env.ELTOQUE_API_KEY;
      expect(await service.isManaged(HOUSE, 'USD', 'CUP')).toBe(false);
    });

    it('getStatus lists the managed codes only while auto is effective', async () => {
      expect(await service.getStatus(HOUSE)).toEqual({
        enabled: true, available: true, managedCodes: ['USD', 'EUR'],
      });
    });
  });
});
