import { Injectable } from '@nestjs/common';
import { BudgetService } from '../budget/budget.service';
import { DebtsService } from '../debts/debts.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { LoansService } from '../loans/loans.service';
import { SavingsGoalsService } from '../savings-goals/savings-goals.service';
import { NetWorthService } from '../net-worth/net-worth.service';
import { EmergencyFundService } from '../emergency-fund/emergency-fund.service';
import { CuotasService } from '../cuotas/cuotas.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InvestmentsService } from '../investments/investments.service';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';
import { TransactionType } from '../database/entities/transaction.entity';

export interface UpcomingBill {
  type: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

@Injectable()
export class SummaryService {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly debtsService: DebtsService,
    private readonly creditCardsService: CreditCardsService,
    private readonly loansService: LoansService,
    private readonly savingsGoalsService: SavingsGoalsService,
    private readonly netWorthService: NetWorthService,
    private readonly emergencyFundService: EmergencyFundService,
    private readonly cuotasService: CuotasService,
    private readonly transactionsService: TransactionsService,
    private readonly investmentsService: InvestmentsService,
    private readonly houseCurrenciesService: HouseCurrenciesService,
  ) {}

  async getUpcomingBills(houseId: string, days = 30): Promise<UpcomingBill[]> {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    const bills: UpcomingBill[] = [];

    const cards: any[] = await this.creditCardsService.findByHouse(houseId);
    for (const card of cards) {
      const day = parseInt(card.fechaPago, 10);
      if (!day || isNaN(day)) continue;

      const candidate = new Date(now.getFullYear(), now.getMonth(), day);
      if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);

      if (candidate <= cutoff) {
        const dueStr = candidate.toISOString().slice(0, 10);
        const diff = Math.round((candidate.getTime() - now.getTime()) / 86400000);
        bills.push({
          type: 'credit_card',
          name: `${card.banco} - ${card.nombreTarjeta}`,
          amount: Number(card.saldoActual ?? 0),
          dueDate: dueStr,
          daysUntilDue: diff,
        });
      }
    }

    const loans: any[] = await this.loansService.findByHouse(houseId);
    for (const loan of loans) {
      if (!loan.cuotaMensual) continue;
      const payDay = loan.diaPago ?? 1;
      const candidate = new Date(now.getFullYear(), now.getMonth(), payDay);
      if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
      if (candidate <= cutoff) {
        const dueStr = candidate.toISOString().slice(0, 10);
        const diff = Math.round((candidate.getTime() - now.getTime()) / 86400000);
        bills.push({
          type: 'loan',
          name: `${loan.tipo} - ${loan.institucion}`,
          amount: Number(loan.cuotaMensual),
          dueDate: dueStr,
          daysUntilDue: diff,
        });
      }
    }

    const cuotas = await this.cuotasService.getActiveCuotas(houseId);
    for (const cuota of cuotas) {
      const dueDate = new Date(cuota.nextPaymentDate);
      if (dueDate >= now && dueDate <= cutoff) {
        const diff = Math.round((dueDate.getTime() - now.getTime()) / 86400000);
        bills.push({
          type: 'cuota',
          name: cuota.description,
          amount: Number(cuota.installmentAmount),
          dueDate: cuota.nextPaymentDate,
          daysUntilDue: diff,
        });
      }
    }

    return bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async getSummary(houseId: string) {
    const [budgets, debtsSummary, cards, loans, goals, funds] = await Promise.all([
      this.budgetService.findByHouse(houseId),
      this.debtsService.getSummary(houseId),
      this.creditCardsService.findByHouse(houseId),
      this.loansService.findByHouse(houseId),
      this.savingsGoalsService.findByHouse(houseId),
      this.emergencyFundService.findAll(houseId),
    ]);

    const latestBudget = budgets[0];
    const budgetSummary = (latestBudget as any)?.summary ?? {
      totalMonthlyIncome: 0,
      totalMonthlyExpenses: 0,
      available: 0,
      savingsTargetAmount: 0,
      advisory: 'ok' as const,
    };

    const totalCardDebt = cards.reduce((s: number, c: any) => s + Number(c.saldoActual ?? 0), 0);
    const totalCardLimit = cards.reduce((s: number, c: any) => s + Number(c.lineaCredito ?? 0), 0);
    const utilizationPct = totalCardLimit > 0
      ? Math.round((totalCardDebt / totalCardLimit) * 1000) / 10
      : 0;

    const totalLoanDebt = loans.reduce((s: number, l: any) => s + Number(l.deudaActual ?? 0), 0);
    const monthlyLoanPayments = loans.reduce((s: number, l: any) => s + Number(l.cuotaMensual ?? 0), 0);

    const totalGoalTarget = goals.reduce((s: number, g: any) => s + Number(g.montoMeta ?? 0), 0);
    const totalGoalSaved = goals.reduce((s: number, g: any) => s + Number(g.ahorrosActuales ?? 0), 0);

    const netWorth = await this.netWorthService.getNetWorthSummary(houseId, totalCardDebt, totalLoanDebt);

    const latestFund = funds[0] as any;
    const efCalc = latestFund?.calculations ?? {
      optimalFund: 0,
      totalMonthlyExpenses: 0,
    };

    const latestEF = await this.emergencyFundService.getLatest(houseId);
    const efCurrentBalance = Number(latestEF?.currentBalance ?? 0);
    const efMonthlyExpenses = efCalc.totalMonthlyExpenses > 0 ? efCalc.totalMonthlyExpenses : 0;
    const efMonthsCovered = efMonthlyExpenses > 0
      ? Math.round((efCurrentBalance / efMonthlyExpenses) * 10) / 10
      : 0;

    const baseCurrency = await this.houseCurrenciesService.getBaseCurrency(houseId);
    const exchangeRates = await this.houseCurrenciesService.getRates(houseId);

    return {
      budget: {
        totalIncome: budgetSummary.totalMonthlyIncome,
        totalExpenses: budgetSummary.totalMonthlyExpenses,
        available: budgetSummary.available,
        savingsTarget: budgetSummary.savingsTargetAmount,
        advisory: budgetSummary.advisory,
      },
      debts: {
        total: debtsSummary.totalIOwe,
        count: debtsSummary.activeDebts,
      },
      creditCards: {
        totalDebt: Math.round(totalCardDebt * 100) / 100,
        totalLimit: Math.round(totalCardLimit * 100) / 100,
        utilizationPct,
      },
      loans: {
        totalDebt: Math.round(totalLoanDebt * 100) / 100,
        monthlyPayments: Math.round(monthlyLoanPayments * 100) / 100,
      },
      savingsGoals: {
        count: goals.length,
        totalTarget: Math.round(totalGoalTarget * 100) / 100,
        totalSaved: Math.round(totalGoalSaved * 100) / 100,
      },
      netWorth: {
        total: netWorth.netWorth,
        assets: netWorth.totalAssets,
        liabilities: netWorth.totalDebts,
      },
      emergencyFund: {
        target: Math.round(efCalc.optimalFund * 100) / 100,
        current: Math.round(efCurrentBalance * 100) / 100,
        monthsCovered: efMonthsCovered,
      },
      cuotas: await this.cuotasService.getMonthlyCommitment(houseId),
      baseCurrency: baseCurrency?.currencyCode ?? 'CUP',
      baseCurrencySymbol: baseCurrency?.symbol ?? '$',
      exchangeRates,
    };
  }

  async getSpendingInsights(houseId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const startDate = sixMonthsAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const transactions = await this.transactionsService.findByRange(houseId, startDate, endDate);

    const MONTHS = 6;
    const expenseTxs = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const incomeTxs = transactions.filter(
      t => t.type === TransactionType.FIXED_INCOME || t.type === TransactionType.VARIABLE_INCOME,
    );

    const totalExpenses = expenseTxs.reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = incomeTxs.reduce((s, t) => s + Number(t.amount), 0);

    const monthlyAverageExpenses = totalExpenses / MONTHS;
    const monthlyAverageIncome = totalIncome / MONTHS;

    const catMap: Record<string, number> = {};
    for (const t of expenseTxs) {
      const key = t.category || 'Sin categoría';
      catMap[key] = (catMap[key] || 0) + Number(t.amount);
    }
    const topCategories = Object.entries(catMap)
      .map(([name, total]) => ({
        name,
        total: Math.round(total * 100) / 100,
        pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const savingsRate = monthlyAverageIncome > 0
      ? Math.round(((monthlyAverageIncome - monthlyAverageExpenses) / monthlyAverageIncome) * 1000) / 10
      : 0;

    const funds = await this.emergencyFundService.findAll(houseId);
    const latestFund = funds[0] as any;
    const efBalance = latestFund?.calculations?.optimalFund ?? 0;
    const monthsOfEmergencyFund = monthlyAverageExpenses > 0
      ? Math.round((efBalance / monthlyAverageExpenses) * 10) / 10
      : 0;

    return {
      monthlyAverageExpenses: Math.round(monthlyAverageExpenses * 100) / 100,
      monthlyAverageIncome: Math.round(monthlyAverageIncome * 100) / 100,
      topCategories,
      savingsRate,
      monthsOfEmergencyFund,
      transactionCount: transactions.length,
    };
  }

  async getHealthScore(houseId: string) {
    let score = 0;
    const breakdown: Record<string, { points: number; max: number; label: string; status: string }> = {};

    // 1. Savings rate (25 pts)
    const budgets = await this.budgetService.findByHouse(houseId);
    if (budgets.length > 0) {
      const summary = (budgets[0] as any).summary;
      const income = summary?.totalMonthlyIncome ?? 0;
      const available = summary?.available ?? 0;
      const savingsRate = income > 0 ? (available / income) * 100 : 0;
      const savPts = savingsRate >= 20 ? 25 : savingsRate >= 10 ? 15 : savingsRate > 0 ? 5 : 0;
      score += savPts;
      breakdown.savings = {
        points: savPts,
        max: 25,
        label: 'Tasa de ahorro',
        status: savingsRate >= 20 ? 'excelente' : savingsRate >= 10 ? 'bueno' : 'mejorar',
      };
    } else {
      breakdown.savings = { points: 0, max: 25, label: 'Tasa de ahorro', status: 'sin datos' };
    }

    // 2. Emergency fund (25 pts)
    const latestEFRecord = await this.emergencyFundService.getLatest(houseId);
    const efBalance = Number(latestEFRecord?.currentBalance ?? 0);
    const budgetSummaryForEF = budgets.length > 0 ? (budgets[0] as any).summary : null;
    const monthlyExpForEF = budgetSummaryForEF?.totalMonthlyExpenses ?? 0;
    const efMonthsCoveredScore = monthlyExpForEF > 0 ? efBalance / monthlyExpForEF : 0;
    const efPts = efMonthsCoveredScore >= 6 ? 25 : efMonthsCoveredScore >= 3 ? 15 : efMonthsCoveredScore >= 1 ? 5 : 0;
    score += efPts;
    breakdown.emergencyFund = {
      points: efPts,
      max: 25,
      label: 'Fondo de emergencia',
      status: efMonthsCoveredScore >= 6 ? 'excelente' : efMonthsCoveredScore >= 3 ? 'bueno' : efMonthsCoveredScore >= 1 ? 'básico' : 'sin fondo',
    };

    // 3. Credit card utilization (20 pts)
    const cards: any[] = await this.creditCardsService.findByHouse(houseId);
    let cuPts = 0;
    if (cards.length > 0) {
      const totalDebt = cards.reduce((s, c) => s + Number(c.saldoActual ?? 0), 0);
      const totalLimit = cards.reduce((s, c) => s + Number(c.lineaCredito ?? 0), 0);
      const utilization = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
      cuPts = utilization < 30 ? 20 : utilization < 60 ? 10 : utilization < 90 ? 5 : 0;
      score += cuPts;
      breakdown.creditUtil = {
        points: cuPts,
        max: 20,
        label: 'Uso de tarjetas',
        status: utilization < 30 ? 'excelente' : utilization < 60 ? 'bueno' : 'mejorar',
      };
    } else {
      breakdown.creditUtil = { points: 0, max: 20, label: 'Uso de tarjetas', status: 'sin datos' };
    }

    // 4. Debt-to-income ratio (20 pts)
    const loans: any[] = await this.loansService.findByHouse(houseId);
    const monthlyIncome = budgets.length > 0 ? ((budgets[0] as any).summary?.totalMonthlyIncome ?? 0) : 0;
    const totalMonthlyDebt = loans.reduce((s, l) => s + Number(l.cuotaMensual ?? 0), 0);
    let dtiPts = 0;
    if (monthlyIncome > 0) {
      const dtiRatio = (totalMonthlyDebt / monthlyIncome) * 100;
      dtiPts = dtiRatio < 36 ? 20 : dtiRatio < 50 ? 10 : 0;
      score += dtiPts;
      breakdown.debtToIncome = {
        points: dtiPts,
        max: 20,
        label: 'Ratio deuda/ingreso',
        status: dtiRatio < 36 ? 'excelente' : dtiRatio < 50 ? 'bueno' : 'mejorar',
      };
    } else {
      breakdown.debtToIncome = { points: 0, max: 20, label: 'Ratio deuda/ingreso', status: 'sin datos' };
    }

    // 5. Has investments (10 pts)
    const investments = await this.investmentsService.findAll(houseId);
    const invPts = investments.length > 0 ? 10 : 0;
    score += invPts;
    breakdown.investments = {
      points: invPts,
      max: 10,
      label: 'Inversiones',
      status: investments.length > 0 ? 'excelente' : 'mejorar',
    };

    const badge = score >= 81 ? 'Excelente' : score >= 61 ? 'Saludable' : score >= 41 ? 'Básico' : 'Crítico';
    const badgeColor = score >= 81 ? 'green' : score >= 61 ? 'blue' : score >= 41 ? 'amber' : 'red';

    return { score, badge, badgeColor, breakdown };
  }
}
