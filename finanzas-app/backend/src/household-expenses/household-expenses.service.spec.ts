import { Repository } from 'typeorm';
import { HouseholdExpensesService } from './household-expenses.service';
import { HouseholdExpense } from '../database/entities/household-expense.entity';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

/**
 * Unit tests for the write-time multi-currency conversion in
 * HouseholdExpensesService: snapshot math on create/update, the legacy
 * `montoCUP` shim, the hard block on missing rates (nothing persisted),
 * recompute-only-on-relevant-change on update, and `sumLocalForMonth`.
 */
describe('HouseholdExpensesService (multi-currency)', () => {
  let service: HouseholdExpensesService;
  let repo: jest.Mocked<Repository<HouseholdExpense>>;
  let listRepo: jest.Mocked<Repository<PurchaseList>>;
  let houseCurrenciesService: jest.Mocked<HouseCurrenciesService>;

  const HOUSE_ID = 'house-1';

  beforeEach(() => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'expense-1', createdAt: new Date(), ...data })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<HouseholdExpense>>;

    listRepo = {} as unknown as jest.Mocked<Repository<PurchaseList>>;

    houseCurrenciesService = {
      resolveRateToLocal: jest.fn(),
    } as unknown as jest.Mocked<HouseCurrenciesService>;

    service = new HouseholdExpensesService(repo, listRepo, houseCurrenciesService);
  });

  describe('create — snapshot math', () => {
    it('computes and persists amountLocal using the resolved rate', async () => {
      houseCurrenciesService.resolveRateToLocal.mockResolvedValue({ localCode: 'CUP', rate: 380 });

      const result = await service.create(
        { fecha: '2026-01-15', descripcion: 'Cena', monto: 10, moneda: 'USD', mes: '2026-01' },
        HOUSE_ID,
      );

      expect(houseCurrenciesService.resolveRateToLocal).toHaveBeenCalledWith(HOUSE_ID, 'USD', '2026-01-15');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10, currencyCode: 'USD', exchangeRate: 380, amountLocal: 3800 }),
      );
      expect(result.montoLocal).toBe(3800);
      expect(result.montoCUP).toBe(3800);
    });

    it('normalizes the legacy montoCUP field to moneda=CUP', async () => {
      houseCurrenciesService.resolveRateToLocal.mockResolvedValue({ localCode: 'CUP', rate: 1 });

      await service.create(
        { fecha: '2026-01-15', descripcion: 'Taxi', montoCUP: 500, mes: '2026-01' },
        HOUSE_ID,
      );

      expect(houseCurrenciesService.resolveRateToLocal).toHaveBeenCalledWith(HOUSE_ID, 'CUP', '2026-01-15');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, currencyCode: 'CUP', amountLocal: 500 }),
      );
    });

    it('does not persist any row when no exchange rate is configured (hard block)', async () => {
      houseCurrenciesService.resolveRateToLocal.mockRejectedValue(new Error('No hay tasa de cambio'));

      await expect(
        service.create(
          { fecha: '2026-01-15', descripcion: 'Cena', monto: 10, moneda: 'EUR', mes: '2026-01' },
          HOUSE_ID,
        ),
      ).rejects.toThrow('No hay tasa de cambio');

      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('update — recompute only on relevant changes', () => {
    const existing = {
      id: 'expense-1',
      date: '2026-01-10',
      description: 'Old',
      category: 'Otros',
      amount: 10,
      currencyCode: 'USD',
      exchangeRate: 380,
      amountLocal: 3800,
      place: null,
      month: '2026-01',
    } as unknown as HouseholdExpense;

    it('recomputes the snapshot when monto changes', async () => {
      repo.findOne.mockResolvedValue({ ...existing });
      houseCurrenciesService.resolveRateToLocal.mockResolvedValue({ localCode: 'CUP', rate: 380 });

      await service.update('expense-1', HOUSE_ID, { monto: 20 });

      expect(houseCurrenciesService.resolveRateToLocal).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 20, amountLocal: 7600 }),
      );
    });

    it('does not recompute (or call resolveRateToLocal) when only lugar changes', async () => {
      repo.findOne.mockResolvedValue({ ...existing });

      await service.update('expense-1', HOUSE_ID, { lugar: 'Nuevo lugar' });

      expect(houseCurrenciesService.resolveRateToLocal).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10, amountLocal: 3800, place: 'Nuevo lugar' }),
      );
    });
  });

  describe('sumLocalForMonth', () => {
    it('sums amountLocal across a house month', async () => {
      repo.find.mockResolvedValue([
        { amountLocal: 100 } as HouseholdExpense,
        { amountLocal: 250.5 } as HouseholdExpense,
      ]);

      const total = await service.sumLocalForMonth(HOUSE_ID, '2026-01');

      expect(total).toBe(350.5);
    });
  });
});
