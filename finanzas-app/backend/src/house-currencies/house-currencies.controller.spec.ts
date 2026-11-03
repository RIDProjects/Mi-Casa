import { ForbiddenException } from '@nestjs/common';
import { HouseCurrenciesController } from './house-currencies.controller';
import { HouseCurrenciesService } from './house-currencies.service';
import { ElToqueRatesService } from './eltoque-rates.service';

/**
 * Regression tests for the IDOR fix on house-currencies.
 *
 * Before the fix, the controller trusted the `:houseId` route param blindly
 * and never checked it against the authenticated user's house. This allowed
 * a user from House A to read/write currency data belonging to House B by
 * simply changing the houseId in the URL.
 *
 * These tests exercise the controller through its public methods (which
 * internally call assertHouseAccess) using a mocked req.user, without
 * needing a running HTTP server.
 */
describe('HouseCurrenciesController (IDOR regression)', () => {
  let controller: HouseCurrenciesController;
  let svc: jest.Mocked<HouseCurrenciesService>;
  let eltoque: jest.Mocked<ElToqueRatesService>;

  const HOUSE_A = 'house-a-id';
  const HOUSE_B = 'house-b-id';

  const userOfHouseA = {
    id: 'user-1',
    house: { id: HOUSE_A },
    houses: [{ id: HOUSE_A }],
    roles: [{ name: 'user' }],
  };

  const adminUser = {
    id: 'admin-1',
    house: { id: HOUSE_A },
    houses: [{ id: HOUSE_A }],
    roles: [{ name: 'admin' }],
  };

  const houseAdminOfHouseA = {
    id: 'house-admin-1',
    house: { id: HOUSE_A },
    houses: [{ id: HOUSE_A }],
    roles: [{ name: 'house_admin' }],
  };

  beforeEach(() => {
    svc = {
      getRates: jest.fn().mockResolvedValue([]),
      upsertRate: jest.fn().mockResolvedValue({}),
      findByHouse: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({}),
      setLocal: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({ message: 'ok' }),
    } as unknown as jest.Mocked<HouseCurrenciesService>;

    eltoque = {
      getStatus: jest.fn().mockResolvedValue({ enabled: true, available: true }),
      setAuto: jest.fn().mockResolvedValue(undefined),
      refreshHouse: jest.fn().mockResolvedValue({ updated: ['USD'] }),
    } as unknown as jest.Mocked<ElToqueRatesService>;

    controller = new HouseCurrenciesController(svc, eltoque);
  });

  describe('elToque automatic rates', () => {
    it('blocks a foreign house and non-admin members from changing or refreshing', async () => {
      expect(() => controller.getAutoRates(HOUSE_B, { user: userOfHouseA } as any)).toThrow(ForbiddenException);
      await expect(
        controller.setAutoRates(HOUSE_A, { enabled: false }, { user: userOfHouseA } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(() => controller.refreshRates(HOUSE_A, { user: userOfHouseA } as any)).toThrow(ForbiddenException);
      expect(eltoque.setAuto).not.toHaveBeenCalled();
      expect(eltoque.refreshHouse).not.toHaveBeenCalled();
    });

    it('lets a house admin toggle the flag and trigger a refresh', async () => {
      await controller.setAutoRates(HOUSE_A, { enabled: false }, { user: houseAdminOfHouseA } as any);
      expect(eltoque.setAuto).toHaveBeenCalledWith(HOUSE_A, false);
      expect(await controller.refreshRates(HOUSE_A, { user: houseAdminOfHouseA } as any)).toEqual({ updated: ['USD'] });
    });
  });

  describe('cross-house access is blocked', () => {
    it('getAll: throws 403 when user of House A requests House B currencies', () => {
      expect(() =>
        controller.getAll(HOUSE_B, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.findByHouse).not.toHaveBeenCalled();
    });

    it('getRates: throws 403 for a foreign houseId', () => {
      expect(() =>
        controller.getRates(HOUSE_B, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.getRates).not.toHaveBeenCalled();
    });

    it('upsertRate: throws 403 for a foreign houseId', () => {
      const dto = { currencyCode: 'USD', rate: 1 } as any;
      expect(() =>
        controller.upsertRate(HOUSE_B, dto, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.upsertRate).not.toHaveBeenCalled();
    });

    it('add: throws 403 for a foreign houseId', () => {
      const dto = { currencyCode: 'EUR' } as any;
      expect(() =>
        controller.add(HOUSE_B, dto, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.add).not.toHaveBeenCalled();
    });

    it('setLocal: throws 403 for a foreign houseId', () => {
      expect(() =>
        controller.setLocal(HOUSE_B, 'currency-id', { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.setLocal).not.toHaveBeenCalled();
    });

    it('remove: throws 403 for a foreign houseId', () => {
      expect(() =>
        controller.remove(HOUSE_B, 'currency-id', { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.remove).not.toHaveBeenCalled();
    });
  });

  describe('own-house access is allowed', () => {
    it('getAll: resolves for the user own house', async () => {
      await controller.getAll(HOUSE_A, { user: userOfHouseA } as any);
      expect(svc.findByHouse).toHaveBeenCalledWith(HOUSE_A);
    });

    it('getRates: resolves for the user own house', async () => {
      await controller.getRates(HOUSE_A, { user: userOfHouseA } as any);
      expect(svc.getRates).toHaveBeenCalledWith(HOUSE_A);
    });

    it('add: resolves for a house_admin of their own house', async () => {
      const dto = { currencyCode: 'EUR' } as any;
      await controller.add(HOUSE_A, dto, { user: houseAdminOfHouseA } as any);
      expect(svc.add).toHaveBeenCalledWith(HOUSE_A, dto);
    });
  });

  describe('mutating routes require house_admin or global admin', () => {
    it('add: throws 403 for a plain user role, even on their own house', () => {
      const dto = { currencyCode: 'EUR' } as any;
      expect(() =>
        controller.add(HOUSE_A, dto, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.add).not.toHaveBeenCalled();
    });

    it('setLocal: throws 403 for a plain user role', () => {
      expect(() =>
        controller.setLocal(HOUSE_A, 'currency-id', { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.setLocal).not.toHaveBeenCalled();
    });

    it('remove: throws 403 for a plain user role', () => {
      expect(() =>
        controller.remove(HOUSE_A, 'currency-id', { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('upsertRate: throws 403 for a plain user role', () => {
      const dto = { currencyCode: 'USD', rate: 1 } as any;
      expect(() =>
        controller.upsertRate(HOUSE_A, dto, { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.upsertRate).not.toHaveBeenCalled();
    });
  });

  describe('admin bypass', () => {
    it('allows an admin to access any house currencies', async () => {
      await controller.getAll(HOUSE_B, { user: adminUser } as any);
      expect(svc.findByHouse).toHaveBeenCalledWith(HOUSE_B);
    });
  });
});
