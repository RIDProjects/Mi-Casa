import { computeDebtHealth } from './debt-health';
import { DebtLine } from '../debt-lines/debt-lines.service';

const line = (over: Partial<DebtLine> = {}): DebtLine => ({
  source: 'loan', id: 'l1', label: 'Prestamo', monthlyAmount: 300, balance: 3600, estimated: false, interestRate: 0, ...over,
});

const base = { income: 3000, available: 600, savingsTarget: 300, manualDebtMonthly: 0 };

describe('computeDebtHealth', () => {
  it('reports sin_deudas when there is nothing to pay', () => {
    const r = computeDebtHealth({ ...base, lines: [] });
    expect(r.status).toBe('sin_deudas');
    expect(r.monthlyDebtService).toBe(0);
    expect(r.monthsToPayoff).toBe(0);
  });

  it('is bien under 20% of the income and pays off short term using the margin above the savings target', () => {
    // 300 / 3000 = 10%; extra = 600 - 300 = 300; budget = 300 + 300 = 600/month for 3600 -> 6 months
    const r = computeDebtHealth({ ...base, lines: [line()] });
    expect(r.debtToIncomePercent).toBe(10);
    expect(r.status).toBe('bien');
    expect(r.extraPayment).toBe(300);
    expect(r.monthsToPayoff).toBe(6);
    expect(r.horizon).toBe('corto');
    expect(r.feasible).toBe(true);
  });

  it('is atencion between 20% and 35%', () => {
    const r = computeDebtHealth({ ...base, lines: [line({ monthlyAmount: 750, balance: 7500 })] });
    expect(r.debtToIncomePercent).toBe(25);
    expect(r.status).toBe('atencion');
  });

  it('is riesgo above 35% of the income', () => {
    const r = computeDebtHealth({ ...base, lines: [line({ monthlyAmount: 1200, balance: 12000 })] });
    expect(r.debtToIncomePercent).toBe(40);
    expect(r.status).toBe('riesgo');
  });

  it('counts the manual Deudas expenses in the debt-to-income ratio', () => {
    const r = computeDebtHealth({ ...base, manualDebtMonthly: 600, lines: [line()] });
    expect(r.monthlyDebtService).toBe(900);
    expect(r.debtToIncomePercent).toBe(30);
    expect(r.status).toBe('atencion');
  });

  it('is riesgo when the budget has no margin left (available below zero)', () => {
    const r = computeDebtHealth({ ...base, available: -50, lines: [line()] });
    expect(r.status).toBe('riesgo');
    expect(r.extraPayment).toBe(0);
  });

  it('classifies the horizon: mediano between 12 and 36 months', () => {
    // 300/month, no extra (available == savings target) over 7200 -> 24 months
    const r = computeDebtHealth({ ...base, available: 300, lines: [line({ balance: 7200 })] });
    expect(r.monthsToPayoff).toBe(24);
    expect(r.horizon).toBe('mediano');
  });

  it('classifies the horizon: largo above 36 months', () => {
    const r = computeDebtHealth({ ...base, available: 300, lines: [line({ balance: 18000 })] });
    expect(r.monthsToPayoff).toBe(60);
    expect(r.horizon).toBe('largo');
  });

  it('reports no_alcanza and riesgo when the payments do not cover the interest', () => {
    const r = computeDebtHealth({
      ...base, available: 300,
      lines: [line({ source: 'card', monthlyAmount: 10, balance: 10000, interestRate: 60, estimated: true })],
    });
    expect(r.feasible).toBe(false);
    expect(r.horizon).toBe('no_alcanza');
    expect(r.status).toBe('riesgo');
  });

  it('has no ratio and is riesgo when there is debt but no income', () => {
    const r = computeDebtHealth({ ...base, income: 0, available: 0, lines: [line()] });
    expect(r.debtToIncomePercent).toBeNull();
    expect(r.status).toBe('riesgo');
  });
});
