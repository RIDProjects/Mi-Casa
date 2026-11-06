import { Injectable } from '@nestjs/common';
import { BudgetService } from '../budget/budget.service';
import { computeDebtHealth, DebtHealth } from './debt-health';

/** Debt verdict for the dashboard: debt modules + the latest budget. */
@Injectable()
export class DebtHealthService {
  constructor(private readonly budgetService: BudgetService) {}

  async getDebtHealth(houseId: string): Promise<DebtHealth> {
    const [latest] = await this.budgetService.findByHouse(houseId, 1);
    const summary = latest?.summary;
    return computeDebtHealth({
      income: Number(summary?.totalMonthlyIncome ?? 0),
      available: Number(summary?.available ?? 0),
      savingsTarget: Number(summary?.savingsTargetAmount ?? 0),
      manualDebtMonthly: Number(summary?.manualDebtMonthly ?? 0),
      lines: latest?.autoDebtLines ?? [],
    });
  }
}
