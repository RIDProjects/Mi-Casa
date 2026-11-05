import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../database/entities/transaction.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

/**
 * Multi-currency transactions: `amount` always holds the house local-currency
 * value (so every aggregate stays correct); the original amount, currency and
 * the rate of the transaction date are kept as a snapshot.
 */
describe('TransactionsService (multi-currency)', () => {
  let service: TransactionsService;
  let repo: jest.Mocked<Repository<Transaction>>;
  let houseCurrencies: jest.Mocked<HouseCurrenciesService>;

  const HOUSE_ID = 'house-1';
  const base = { tipo: 'gasto', concepto: 'Taxi', fecha: '2026-01-15', metodoPago: 'efectivo' };

  beforeEach(() => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'tx-1', createdAt: new Date(), ...data })),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;
    houseCurrencies = {
      resolveRateToLocal: jest.fn(),
    } as unknown as jest.Mocked<HouseCurrenciesService>;
    service = new TransactionsService(repo, houseCurrencies);
  });

  it('converts a foreign amount to local with the rate of the transaction date', async () => {
    // 1 CUP = 0.0025 USD (local = USD)
    houseCurrencies.resolveRateToLocal.mockResolvedValue({ localCode: 'USD', rate: 0.0025 });

    const result = await service.create({ ...base, monto: 4000, moneda: 'CUP' }, HOUSE_ID);

    expect(houseCurrencies.resolveRateToLocal).toHaveBeenCalledWith(HOUSE_ID, 'CUP', '2026-01-15');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10, originalAmount: 4000, currencyCode: 'CUP', exchangeRate: 0.0025 }),
    );
    expect(result.monto).toBe(10);
    expect(result.montoOriginal).toBe(4000);
    expect(result.moneda).toBe('CUP');
    expect(result.tasaCambio).toBe(0.0025);
  });

  it('keeps a local-currency transaction free of snapshot fields', async () => {
    houseCurrencies.resolveRateToLocal.mockResolvedValue({ localCode: 'USD', rate: 1 });

    const result = await service.create({ ...base, monto: 25, moneda: 'USD' }, HOUSE_ID);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25, originalAmount: null, currencyCode: null, exchangeRate: null }),
    );
    expect(result.monto).toBe(25);
    expect(result.moneda).toBeNull();
  });

  it('behaves as before when no currency is sent (older clients)', async () => {
    const result = await service.create({ ...base, monto: 30 }, HOUSE_ID);

    expect(houseCurrencies.resolveRateToLocal).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 30 }));
    expect(result.monto).toBe(30);
  });

  it('rejects the write and persists nothing when the rate cannot be resolved', async () => {
    houseCurrencies.resolveRateToLocal.mockRejectedValue(new Error('no rate'));

    await expect(service.create({ ...base, monto: 100, moneda: 'EUR' }, HOUSE_ID)).rejects.toThrow('no rate');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('recomputes the snapshot on update using the new date and currency', async () => {
    const existing = { id: 'tx-1', amount: 10, originalAmount: 4000, currencyCode: 'CUP', exchangeRate: 0.0025, date: '2026-01-15' };
    repo.findOne.mockResolvedValue(existing as any);
    houseCurrencies.resolveRateToLocal.mockResolvedValue({ localCode: 'USD', rate: 0.005 });

    const result = await service.update('tx-1', HOUSE_ID, { ...base, fecha: '2026-02-01', monto: 4000, moneda: 'CUP' });

    expect(houseCurrencies.resolveRateToLocal).toHaveBeenCalledWith(HOUSE_ID, 'CUP', '2026-02-01');
    expect(result.monto).toBe(20);
    expect(result.tasaCambio).toBe(0.005);
  });

  it('clears the snapshot when an update switches back to the local currency', async () => {
    const existing = { id: 'tx-1', amount: 10, originalAmount: 4000, currencyCode: 'CUP', exchangeRate: 0.0025, date: '2026-01-15' };
    repo.findOne.mockResolvedValue(existing as any);
    houseCurrencies.resolveRateToLocal.mockResolvedValue({ localCode: 'USD', rate: 1 });

    const result = await service.update('tx-1', HOUSE_ID, { ...base, monto: 12, moneda: 'USD' });

    expect(result.monto).toBe(12);
    expect(result.moneda).toBeNull();
    expect(result.montoOriginal).toBeNull();
  });
});
