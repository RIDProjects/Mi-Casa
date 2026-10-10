import { SavingsGoalsService } from './savings-goals.service';

describe('SavingsGoalsService monthly contribution', () => {
  const build = (goal: Record<string, unknown>) => {
    const repo = { find: jest.fn().mockResolvedValue([goal]) };
    return new SavingsGoalsService(repo as any);
  };

  it('treats the stored annual rate as a percent (5% on 1200 over 12 months)', async () => {
    const service = build({
      id: 'g1', name: 'Viaje', goalAmount: '1200.00', currentSavings: '0.00',
      months: 12, annualInterestRate: '5.0000', emoji: '🎯',
    });
    const [goal] = await service.findByHouse('h1');
    expect(goal.monthlyContribution).toBeCloseTo(97.73, 2);
  });

  it('splits evenly when the rate is zero', async () => {
    const service = build({
      id: 'g1', name: 'Viaje', goalAmount: '1200.00', currentSavings: '0.00',
      months: 12, annualInterestRate: '0.0000', emoji: '🎯',
    });
    const [goal] = await service.findByHouse('h1');
    expect(goal.monthlyContribution).toBe(100);
  });
});
