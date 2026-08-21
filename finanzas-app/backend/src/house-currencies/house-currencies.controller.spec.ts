import { ForbiddenException } from '@nestjs/common';
import { HouseCurrenciesController } from './house-currencies.controller';
import { HouseCurrenciesService } from './house-currencies.service';

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

  beforeEach(() => {
    svc = {
      getRates: jest.fn().mockResolvedValue([]),
      upsertRate: jest.fn().mockResolvedValue({}),
      findByHouse: jest.fn().mockResolvedValue([]),
      add: jest.fn().mockResolvedValue({}),
      setBase: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({ message: 'ok' }),
    } as unknown as jest.Mocked<HouseCurrenciesService>;

    controller = new HouseCurrenciesController(svc);
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

    it('setBase: throws 403 for a foreign houseId', () => {
      expect(() =>
        controller.setBase(HOUSE_B, 'currency-id', { user: userOfHouseA } as any),
      ).toThrow(ForbiddenException);
      expect(svc.setBase).not.toHaveBeenCalled();
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

    it('add: resolves for the user own house', async () => {
      const dto = { currencyCode: 'EUR' } as any;
      await controller.add(HOUSE_A, dto, { user: userOfHouseA } as any);
      expect(svc.add).toHaveBeenCalledWith(HOUSE_A, dto);
    });
  });

  describe('admin bypass', () => {
    it('allows an admin to access any house currencies', async () => {
      await controller.getAll(HOUSE_B, { user: adminUser } as any);
      expect(svc.findByHouse).toHaveBeenCalledWith(HOUSE_B);
    });
  });
});
