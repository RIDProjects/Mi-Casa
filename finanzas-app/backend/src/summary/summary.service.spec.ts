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
