import { HouseholdExpensesService } from './household-expenses.service';

describe('HouseholdExpensesService.getMonthData — market purchases in local currency', () => {
  const HOUSE_ID = 'house-1';
  const item = (lugar: string, unitPrice: number, quantity: number, currency: string | null) =>
    ({ lugar, unitPrice, quantity, currency }) as any;

  const build = (items: any[], rates: Record<string, number | null>, salidas: any[] = []) => {
    const repo = { find: jest.fn().mockResolvedValue(salidas) } as any;
    const listRepo = { findOne: jest.fn().mockResolvedValue({ items }) } as any;
    const houseCurrenciesService = {
      findByHouse: jest.fn().mockResolvedValue([
        { currencyCode: 'CUP', symbol: '$', isLocal: true },
        { currencyCode: 'USD', symbol: 'US$', isLocal: false },
      ]),
      getRates: jest.fn().mockResolvedValue(rates),
    } as any;
    return { service: new HouseholdExpensesService(repo, listRepo, houseCurrenciesService), houseCurrenciesService };
  };

  it('converts USD with the house rate and keeps CUP as-is', async () => {
    const { service, houseCurrenciesService } = build(
      [item('Mercado', 10, 2, 'USD'), item('Mercado', 100, 1, 'CUP'), item('Bodega', 50, 1, null)],
      { CUP: 1, USD: 380 },
    );
    const res = await service.getMonthData(HOUSE_ID, '2026-01');

    const mercado = res.comprasMercado.find(c => c.lugar === 'Mercado');
    expect(mercado.totalCUP).toBe(7700);
    expect(mercado.totalLocal).toBe(7700);
    expect(res.comprasMercado.find(c => c.lugar === 'Bodega').totalLocal).toBe(50);
    expect(res.totalCompras).toBe(7750);
    expect(res.total).toBe(7750);
    expect(res.unconvertedItems).toBe(0);
    expect(res.monedaLocal).toBe('CUP');
    expect(houseCurrenciesService.getRates).toHaveBeenCalledTimes(1);
  });

  it('excludes items without a rate and counts them', async () => {
    const { service } = build(
      [item('Mercado', 10, 1, 'USD'), item('Mercado', 5, 2, 'EUR'), item('Mercado', 100, 1, 'CUP')],
      { CUP: 1, USD: null },
    );
    const res = await service.getMonthData(HOUSE_ID, '2026-01');

    expect(res.comprasMercado[0].totalLocal).toBe(100);
    expect(res.comprasMercado[0].unconvertedItems).toBe(2);
    expect(res.unconvertedItems).toBe(2);
    expect(res.totalCompras).toBe(100);
  });

  it('month total adds converted purchases to salidas', async () => {
    const { service } = build(
      [item('Mercado', 1, 1, 'USD')],
      { CUP: 1, USD: 400 },
      [{ amountLocal: 50, category: 'Otros' }],
    );
    const res = await service.getMonthData(HOUSE_ID, '2026-01');
    expect(res.total).toBe(450);
  });
});
