import { DebtHealthService } from './debt-health.service';

describe('DebtHealthService', () => {
  const HOUSE = 'house-1';
  const lines = [{ source: 'loan', id: 'l1', label: 'Prestamo', monthlyAmount: 300, balance: 3600, estimated: false, interestRate: 0 }];

  it('builds the verdict from the latest budget summary and its automatic debt lines', async () => {
    const budgetService = {
      findByHouse: jest.fn().mockResolvedValue([
        { autoDebtLines: lines, summary: { totalMonthlyIncome: 3000, available: 600, savingsTargetAmount: 300, manualDebtMonthly: 0 } },
      ]),
    };
    const service = new DebtHealthService(budgetService as any);

    const result = await service.getDebtHealth(HOUSE);

    expect(budgetService.findByHouse).toHaveBeenCalledWith(HOUSE, 1);
    expect(result.status).toBe('bien');
    expect(result.monthsToPayoff).toBe(6);
    expect(result.lines).toEqual(lines);
  });

  it('reports sin_deudas when the house has no budget yet', async () => {
    const service = new DebtHealthService({ findByHouse: jest.fn().mockResolvedValue([]) } as any);

    const result = await service.getDebtHealth(HOUSE);

    expect(result.status).toBe('sin_deudas');
    expect(result.monthlyIncome).toBe(0);
  });
});
