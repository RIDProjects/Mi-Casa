import { HouseholdExpensesService } from './household-expenses.service';

describe('HouseholdExpensesService outings budget', () => {
  const HOUSE = 'house-1';
  const MONTH = '2026-11';

  const exp = (over: any) => ({
    id: over.id ?? 'e', date: '2026-11-03', description: 'x', category: 'Salidas', amount: 0,
    currencyCode: 'CUP', exchangeRate: 1, amountLocal: 0, place: null, month: MONTH, createdAt: new Date(), ...over,
  });

  function build(opts: { rows?: any[]; budget?: number | null } = {}) {
    const rows = opts.rows ?? [];
    const repo: any = {
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => {
        const saved = { id: 'new', createdAt: new Date(), ...d };
        rows.push(saved);
        return saved;
      }),
      find: jest.fn(async () => rows),
      findOne: jest.fn(),
    };
    const listRepo: any = { findOne: jest.fn().mockResolvedValue(null) };
    const currencies: any = {
      resolveRateToLocal: jest.fn().mockResolvedValue({ localCode: 'CUP', rate: 1 }),
      findByHouse: jest.fn().mockResolvedValue([{ currencyCode: 'CUP', isLocal: true, symbol: '$' }]),
      getRates: jest.fn().mockResolvedValue({ CUP: 1 }),
    };
    const budget: any = {
      getOutingsBudget: jest.fn().mockResolvedValue(opts.budget === undefined ? 100 : opts.budget),
    };
    const service = new HouseholdExpensesService(repo, listRepo, currencies, budget);
    return { service, repo, budget };
  }

  const create = (s: HouseholdExpensesService, categoria: string, monto: number) =>
    s.create({ fecha: '2026-11-05', descripcion: 'Cena', categoria, monto, moneda: 'CUP', mes: MONTH }, HOUSE);

  it('splits the month into outings (category Salidas) and other expenses, with the budget on the outings', async () => {
    const { service } = build({
      rows: [
        exp({ id: 'a', category: 'Salidas', amountLocal: 30 }),
        exp({ id: 'b', category: 'Transporte', amountLocal: 20 }),
        exp({ id: 'c', category: 'Salidas', amountLocal: 25 }),
      ],
    });
    const data: any = await service.getMonthData(HOUSE, MONTH);

    expect(data.outings.items.map((i: any) => i.id)).toEqual(['a', 'c']);
    expect(data.outings).toMatchObject({ total: 55, budget: 100, remaining: 45, exceeded: false });
    expect(data.otros.items.map((i: any) => i.id)).toEqual(['b']);
    expect(data.otros.total).toBe(20);
  });

  it('keeps the legacy fields: salidas holds every manual expense and totalSalidas their sum', async () => {
    const { service } = build({ rows: [exp({ id: 'a', amountLocal: 30 }), exp({ id: 'b', category: 'Hogar', amountLocal: 20 })] });
    const data: any = await service.getMonthData(HOUSE, MONTH);
    expect(data.salidas).toHaveLength(2);
    expect(data.totalSalidas).toBe(50);
  });

  it('flags the outings as exceeded and reports how much, and has no limit without a budget', async () => {
    const over: any = await build({ rows: [exp({ amountLocal: 130 })] }).service.getMonthData(HOUSE, MONTH);
    expect(over.outings).toMatchObject({ budget: 100, remaining: -30, exceeded: true });
    const none: any = await build({ rows: [exp({ amountLocal: 130 })], budget: null }).service.getMonthData(HOUSE, MONTH);
    expect(none.outings).toMatchObject({ budget: null, remaining: null, exceeded: false });
  });

  it('warns on create when an outing pushes the month past the budget, and still saves it', async () => {
    const { service, repo } = build({ rows: [exp({ amountLocal: 80 })] });
    const result: any = await create(service, 'Salidas', 50);
    expect(repo.save).toHaveBeenCalled();
    expect(result.budgetWarning).toEqual({ budget: 100, spent: 130, exceededBy: 30 });
  });

  it('gives no warning within the budget, for other categories, or without a budget', async () => {
    expect(((await create(build({ rows: [exp({ amountLocal: 10 })] }).service, 'Salidas', 20)) as any).budgetWarning).toBeNull();
    expect(((await create(build({ rows: [exp({ amountLocal: 90 })] }).service, 'Transporte', 500)) as any).budgetWarning).toBeNull();
    expect(((await create(build({ rows: [], budget: null }).service, 'Salidas', 500)) as any).budgetWarning).toBeNull();
  });
});
