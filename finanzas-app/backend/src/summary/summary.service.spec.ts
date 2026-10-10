import { SummaryService } from './summary.service';

/**
 * Regression test proving `getSummary()` wires household expenses through
 * `HouseholdExpensesService.sumLocalForMonth()` — which sums the persisted
 * local-currency snapshot (`amountLocal`) — instead of re-deriving any
 * currency conversion at read time. The conversion math itself (mixed
 * USD/CUP expenses) is exercised by household-expenses.service.spec.ts;
 * this test only asserts the summary layer never re-converts.
 */
describe('SummaryService.getSummary — household expenses via local snapshot', () => {
  const HOUSE_ID = 'house-1';

  function buildService(sumLocalForMonthResult: number) {
    const budgetService = { findByHouse: jest.fn().mockResolvedValue([]) } as any;
    const debtsService = {
      getSummary: jest.fn().mockResolvedValue({ totalIOwe: 0, activeDebts: 0 }),
    } as any;
    const creditCardsService = { findByHouse: jest.fn().mockResolvedValue([]) } as any;
    const loansService = { findByHouse: jest.fn().mockResolvedValue([]) } as any;
    const savingsGoalsService = { findByHouse: jest.fn().mockResolvedValue([]) } as any;
    const netWorthService = {
      getNetWorthSummary: jest
        .fn()
        .mockResolvedValue({ netWorth: 0, totalAssets: 0, totalDebts: 0 }),
    } as any;
    const emergencyFundService = {
      findAll: jest.fn().mockResolvedValue([]),
      getLatest: jest.fn().mockResolvedValue(null),
    } as any;
    const cuotasService = {
      getMonthlyCommitment: jest.fn().mockResolvedValue({}),
    } as any;
    const transactionsService = {} as any;
    const investmentsService = { findAll: jest.fn().mockResolvedValue([]) } as any;
    const houseCurrenciesService = {
      getLocalCurrency: jest.fn().mockResolvedValue({ currencyCode: 'CUP', symbol: '$' }),
      getRates: jest.fn().mockResolvedValue({}),
    } as any;
    const householdExpensesService = {
      sumLocalForMonth: jest.fn().mockResolvedValue(sumLocalForMonthResult),
    } as any;

    const service = new SummaryService(
      budgetService,
      debtsService,
      creditCardsService,
      loansService,
      savingsGoalsService,
      netWorthService,
      emergencyFundService,
      cuotasService,
      transactionsService,
      investmentsService,
      houseCurrenciesService,
      householdExpensesService,
    );

    return { service, householdExpensesService };
  }

  it('includes householdExpenses.total from sumLocalForMonth, never re-converting at read time', async () => {
    // 3800 CUP represents a USD-10 expense (rate 380) plus a 500 CUP expense
    // in the same month — the sum is already local-denominated because it
    // comes straight from the persisted amountLocal snapshots.
    const { service, householdExpensesService } = buildService(4300);

    const result = await service.getSummary(HOUSE_ID);

    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(householdExpensesService.sumLocalForMonth).toHaveBeenCalledWith(HOUSE_ID, currentMonth);
    expect(result.householdExpenses).toEqual({ month: currentMonth, total: 4300 });
  });
});

describe('SummaryService.getUpcomingBills — app timezone calendar days', () => {
  function build(opts: { cards?: any[]; loans?: any[]; cuotas?: any[] }) {
    const none = {} as any;
    return new SummaryService(
      none,
      none,
      { findByHouse: jest.fn().mockResolvedValue(opts.cards ?? []) } as any,
      { findByHouse: jest.fn().mockResolvedValue(opts.loans ?? []) } as any,
      none,
      none,
      none,
      { getActiveCuotas: jest.fn().mockResolvedValue(opts.cuotas ?? []) } as any,
      none,
      none,
      none,
      none,
    );
  }

  afterEach(() => jest.useRealTimers());

  // 2026-11-01T02:00Z is Oct 31 22:00 in Havana.
  it('includes a bill due on the Havana "today" with daysUntilDue 0', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-01T02:00:00Z'));
    const service = build({
      cards: [{ fechaPago: '31', banco: 'B', nombreTarjeta: 'C', saldoActual: 10 }],
      cuotas: [{ nextPaymentDate: '2026-10-31', description: 'TV', installmentAmount: 5 }],
    });
    const bills = await service.getUpcomingBills('h', 3);
    expect(bills.map(b => [b.type, b.dueDate, b.daysUntilDue])).toEqual([
      ['credit_card', '2026-10-31', 0],
      ['cuota', '2026-10-31', 0],
    ]);
  });

  it('clamps loan diaPago 31 to the end of February', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-02-10T15:00:00Z'));
    const service = build({
      loans: [{ diaPago: 31, cuotaMensual: 50, tipo: 'Auto', institucion: 'X' }],
    });
    const bills = await service.getUpcomingBills('h', 30);
    expect(bills).toHaveLength(1);
    expect(bills[0].dueDate).toBe('2027-02-28');
    expect(bills[0].daysUntilDue).toBe(18);
  });

  it('rolls a passed day to next month and counts calendar days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-12-20T15:00:00Z'));
    const service = build({
      cards: [{ fechaPago: '5', banco: 'B', nombreTarjeta: 'C', saldoActual: 1 }],
    });
    const bills = await service.getUpcomingBills('h', 30);
    expect(bills[0].dueDate).toBe('2027-01-05');
    expect(bills[0].daysUntilDue).toBe(16);
  });
});
