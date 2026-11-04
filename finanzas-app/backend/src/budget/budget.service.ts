import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Budget,
  BudgetCategory,
  BudgetExpense,
  IncomeSource,
  Periodicity,
} from '../database/entities/budget.entity';
import { SavingsGoal } from '../database/entities/savings-goal.entity';
import { EmergencyFund } from '../database/entities/emergency-fund.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { HousesService } from '../houses/houses.service';

const FI_GOAL_NAME = 'Independencia Financiera';
const EMERGENCY_FUND_NAME = 'Fondo de Emergencia';
const DEFAULT_FI_MULTIPLIER = 150;

// Monthly normalization: a month has 52/12 weeks (not 4), and "quincenal"
// means every 15 days, i.e. 365/15 payments a year spread over 12 months.
const PERIODICITY_FACTOR: Record<Periodicity, number> = {
  [Periodicity.DAILY]:       1 / 30,
  [Periodicity.WEEKLY]:      12 / 52,       // 52 weeks a year -> ~4.33 per month
  [Periodicity.BIWEEKLY]:    (12 * 15) / 365, // every 15 days -> ~2.03 per month
  [Periodicity.MONTHLY]:     1,
  [Periodicity.BIMONTHLY]:   2,
  [Periodicity.QUARTERLY]:   3,
  [Periodicity.FOURMONTHLY]: 4,
  [Periodicity.SEMIANNUAL]:  6,
  [Periodicity.ANNUAL]:      12,
};

interface CreateBudgetDto {
  name?: string;
  year?: number;
  savingsTargetPercent?: number;
  rule?: string;
}

interface UpdateBudgetDto {
  name?: string;
  year?: number;
  savingsTargetPercent?: number;
  rule?: string;
  // Plan overrides: null resets a value to its default.
  fiMultiplier?: number | null;
  minInvestmentPercent?: number | null;
  emergencyFundMonths?: number | null;
  entertainmentPercent?: number | null;
  fixedExpensesCapPercent?: number | null;
}

interface AddIncomeDto {
  name: string;
  type?: string;
  amount: number;
}

interface UpdateIncomeDto {
  name?: string;
  type?: string;
  amount?: number;
}

interface AddCategoryDto {
  name: string;
  sortOrder?: number;
}

interface AddExpenseDto {
  name: string;
  amount: number;
  periodicity?: Periodicity;
  isFixed?: boolean;
  isCreditCard?: boolean;
  isAntExpense?: boolean;
}

interface UpdateExpenseDto {
  name?: string;
  amount?: number;
  periodicity?: Periodicity;
  isFixed?: boolean;
  isCreditCard?: boolean;
  isAntExpense?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Casa',
  'Comida',
  'Familia',
  'Transporte',
  'Viajes',
  'Deudas',
  'Salud',
  'Suscripciones',
  'Cuidado Personal',
];

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(Budget)
    private budgetRepo: Repository<Budget>,

    @InjectRepository(BudgetCategory)
    private categoryRepo: Repository<BudgetCategory>,

    @InjectRepository(BudgetExpense)
    private expenseRepo: Repository<BudgetExpense>,

    @InjectRepository(IncomeSource)
    private incomeRepo: Repository<IncomeSource>,

    @InjectRepository(SavingsGoal)
    private savingsGoalRepo: Repository<SavingsGoal>,

    private readonly notificationsService: NotificationsService,
    private readonly inAppNotificationsService: InAppNotificationsService,
    private readonly housesService: HousesService,

    // Optional so lightweight constructions (tests) keep working.
    @InjectRepository(EmergencyFund)
    private fundRepo?: Repository<EmergencyFund>,
  ) {}

  private computeMonthlyAmount(
    amount: number,
    periodicity: Periodicity,
  ): number {
    return Number(amount) / PERIODICITY_FACTOR[periodicity];
  }

  /**
   * Live basis for the emergency fund: fixed expenses as monthly lines plus the
   * budget's emergency fund months. Reads the repository directly so it has none
   * of the notification side effects of findByHouse/findOne.
   */
  async getEmergencyFundBasis(houseId: string): Promise<{
    lines: { name: string; monthlyAmount: number }[];
    emergencyFundMonths: number | null;
  } | null> {
    const budget = await this.budgetRepo.findOne({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
      relations: ['categories', 'categories.expenses'],
    });
    if (!budget) return null;

    const lines = (budget.categories ?? [])
      .flatMap((c) => c.expenses ?? [])
      .filter((e) => e.isFixed === true)
      .map((e) => ({
        name: e.name,
        monthlyAmount: Math.round(this.computeMonthlyAmount(Number(e.amount), e.periodicity) * 100) / 100,
      }));

    return {
      lines,
      emergencyFundMonths: budget.emergencyFundMonths != null ? Number(budget.emergencyFundMonths) : null,
    };
  }

  /**
   * Live monthly amount of the "Salidas" expense inside the "Comida" category: the limit the
   * household expense registry compares outings against. Matched by name (case and spacing
   * ignored), so it needs no flag or migration. Null when the budget or the expense is missing.
   */
  async getOutingsBudget(houseId: string): Promise<number | null> {
    const [budget] = await this.budgetRepo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
      take: 1,
      relations: ['categories', 'categories.expenses'],
    });
    if (!budget) return null;
    const norm = (v?: string) => (v ?? '').trim().toLowerCase();
    const outings = budget.categories
      ?.filter((c) => norm(c.name) === 'comida')
      .flatMap((c) => c.expenses ?? [])
      .find((e) => norm(e.name) === 'salidas');
    if (!outings) return null;
    return Math.round(this.computeMonthlyAmount(Number(outings.amount), outings.periodicity) * 100) / 100;
  }

  /**
   * Live monthly amount of the budget expense flagged as the shopping budget.
   * Reads the repository directly: no notification side effects.
   */
  async getShoppingBudget(houseId: string): Promise<number | null> {
    const [budget] = await this.budgetRepo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
      take: 1,
      relations: ['categories', 'categories.expenses'],
    });
    if (!budget) return null;
    const flagged = budget.categories
      ?.flatMap((c) => c.expenses ?? [])
      .find((e) => e.isShoppingBudget === true);
    if (!flagged) return null;
    return Math.round(this.computeMonthlyAmount(Number(flagged.amount), flagged.periodicity) * 100) / 100;
  }

  private computeSummary(budget: Budget) {
    const totalMonthlyIncome =
      budget.incomeSources?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;

    const allExpenses = budget.categories?.flatMap((c) => c.expenses ?? []) ?? [];

    const totalMonthlyExpenses = allExpenses.reduce((s, e) => {
      return s + this.computeMonthlyAmount(Number(e.amount), e.periodicity);
    }, 0);

    const available = totalMonthlyIncome - totalMonthlyExpenses;
    const savingsTargetAmount =
      (totalMonthlyIncome * Number(budget.savingsTargetPercent)) / 100;

    const antExpensesTotal = allExpenses
      .filter((e) => e.isAntExpense)
      .reduce(
        (s, e) =>
          s + this.computeMonthlyAmount(Number(e.amount), e.periodicity),
        0,
      );

    let advisory: 'ok' | 'warning' | 'danger';
    if (available >= savingsTargetAmount) {
      advisory = 'ok';
    } else if (available > 0) {
      advisory = 'warning';
    } else {
      advisory = 'danger';
    }

    const savingsShortfall = Math.max(0, savingsTargetAmount - available);

    const rule = budget.rule ?? '50-30-20';
    const isFifty = rule === '50-30-20';
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const plan = totalMonthlyIncome > 0 ? {
      rule,
      fiTarget:             round2(totalMonthlyIncome * (budget.fiMultiplier != null ? Number(budget.fiMultiplier) : DEFAULT_FI_MULTIPLIER)),
      minMonthlyInvestment: round2(totalMonthlyIncome * (budget.minInvestmentPercent != null ? Number(budget.minInvestmentPercent) / 100 : 0.20)),
      emergencyFundTarget:  round2(totalMonthlyIncome * (budget.emergencyFundMonths != null ? Number(budget.emergencyFundMonths) : 6)),
      entertainmentBudget:  round2(totalMonthlyIncome * (budget.entertainmentPercent != null ? Number(budget.entertainmentPercent) / 100 : isFifty ? 0.30 : 0.10)),
      fixedExpensesCap:     round2(totalMonthlyIncome * (budget.fixedExpensesCapPercent != null ? Number(budget.fixedExpensesCapPercent) / 100 : isFifty ? 0.50 : 0.70)),
    } : null;

    return {
      totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
      totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
      available: Math.round(available * 100) / 100,
      savingsTargetAmount: Math.round(savingsTargetAmount * 100) / 100,
      antExpensesTotal: Math.round(antExpensesTotal * 100) / 100,
      advisory,
      alerts: {
        overBudget: totalMonthlyExpenses > totalMonthlyIncome,
        nearLimit: totalMonthlyExpenses > totalMonthlyIncome * 0.8,
        savingsShortfall: Math.round(savingsShortfall * 100) / 100,
        antExpensesWarning: totalMonthlyIncome > 0 && antExpensesTotal > totalMonthlyIncome * 0.15,
      },
      plan,
    };
  }

  private async notifyBudgetAlerts(houseId: string, summary: any): Promise<void> {
    try {
      const alerts: Array<{ type: string; title: string; message: string }> = [];
      if (summary.alerts?.overBudget) {
        alerts.push({
          type: 'budget_over',
          title: 'Gastos superan ingresos',
          message: 'Tus gastos del mes superan tus ingresos. Revisa tu presupuesto.',
        });
      }
      if (summary.alerts?.antExpensesWarning) {
        alerts.push({
          type: 'ant_expenses',
          title: 'Alerta gastos hormiga',
          message: 'Los gastos hormiga superan el 15% de tus ingresos.',
        });
      }
      if (alerts.length === 0) return;

      let recipients: string[] | null = null;
      for (const alert of alerts) {
        const created = await this.inAppNotificationsService.createIfNotRecent(houseId, alert);
        // Email only when the in-app notification was actually created; a
        // deduplicated one means the admins were already notified.
        if (!created) continue;

        recipients ??= await this.housesService.getHouseAdminEmails(houseId);
        if (recipients.length === 0) {
          this.logger.warn(`No house admin recipients for budget alert in house ${houseId}; email skipped`);
          continue;
        }
        for (const to of recipients) {
          await this.notificationsService.sendBudgetAlert(to, alert.title, alert.message);
        }
      }
    } catch (e) {
      // No relanzar — nunca debe fallar la request principal por un error de
      // notificación, pero antes ni siquiera se logueaba, así que un fallo
      // silencioso de email/in-app quedaba completamente invisible.
      this.logger.error(`Failed to send budget alerts for house ${houseId}: ${e.message}`);
    }
  }

  // `limit` lets callers that only need the latest budget (summary, health
  // score) skip loading the whole history with its nested relations.
  async findByHouse(houseId: string, limit?: number) {
    const budgets = await this.budgetRepo.find({
      where: { house: { id: houseId } },
      relations: ['incomeSources', 'categories', 'categories.expenses'],
      order: { createdAt: 'DESC' },
      ...(limit ? { take: limit } : {}),
    });
    const result = budgets.map((b) => ({ ...b, summary: this.computeSummary(b) }));
    if (result[0]) {
      // Fire-and-forget — do NOT await so budget response is never delayed
      void this.notifyBudgetAlerts(houseId, result[0].summary);
    }
    return result;
  }

  async findOne(id: string, houseId: string) {
    const budget = await this.budgetRepo.findOne({
      where: { id, house: { id: houseId } },
      relations: ['incomeSources', 'categories', 'categories.expenses'],
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    return { ...budget, summary: this.computeSummary(budget) };
  }

  async create(dto: CreateBudgetDto, houseId: string) {
    const defaultCategories = DEFAULT_CATEGORIES.map((name, i) => ({
      name,
      sortOrder: i,
      isDefault: true,
      expenses: [],
    }));

    const budget = this.budgetRepo.create({
      name: dto.name || 'Mi Presupuesto',
      year: dto.year || new Date().getFullYear(),
      savingsTargetPercent: dto.savingsTargetPercent ?? 20,
      rule: dto.rule ?? '50-30-20',
      house: { id: houseId } as any,
      incomeSources: [],
      categories: defaultCategories as any,
    });

    const saved = await this.budgetRepo.save(budget);
    return this.findOne(saved.id, houseId);
  }

  async update(id: string, houseId: string, dto: UpdateBudgetDto) {
    const budget = await this.budgetRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');

    if (dto.name !== undefined) budget.name = dto.name;
    if (dto.year !== undefined) budget.year = dto.year;
    if (dto.savingsTargetPercent !== undefined)
      budget.savingsTargetPercent = dto.savingsTargetPercent;
    if (dto.rule !== undefined) budget.rule = dto.rule;
    if (dto.fiMultiplier !== undefined) budget.fiMultiplier = dto.fiMultiplier;
    if (dto.minInvestmentPercent !== undefined) budget.minInvestmentPercent = dto.minInvestmentPercent;
    if (dto.emergencyFundMonths !== undefined) budget.emergencyFundMonths = dto.emergencyFundMonths;
    if (dto.entertainmentPercent !== undefined) budget.entertainmentPercent = dto.entertainmentPercent;
    if (dto.fixedExpensesCapPercent !== undefined) budget.fixedExpensesCapPercent = dto.fixedExpensesCapPercent;

    await this.budgetRepo.save(budget);
    if (dto.fiMultiplier !== undefined) await this.refreshFiGoalIfExists(id, houseId);
    return this.findOne(id, houseId);
  }

  async remove(id: string, houseId: string) {
    const budget = await this.budgetRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    await this.budgetRepo.remove(budget);
    return { message: 'Presupuesto eliminado' };
  }

  // ── Income sources ──────────────────────────────────────────────────────────

  async addIncome(budgetId: string, houseId: string, dto: AddIncomeDto) {
    const budget = await this.budgetRepo.findOne({ where: { id: budgetId, house: { id: houseId } } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    const isFirstIncome = await this.hasNoIncome(budgetId);
    const income = this.incomeRepo.create({
      ...dto,
      budget: { id: budgetId } as any,
    });
    const saved = await this.incomeRepo.save(income);
    if (isFirstIncome) await this.ensureDerivedPlan(budgetId, houseId);
    else await this.refreshFiGoalIfExists(budgetId, houseId);
    return saved;
  }

  async updateIncome(id: string, houseId: string, dto: UpdateIncomeDto) {
    const income = await this.incomeRepo
      .createQueryBuilder('i')
      .innerJoin('i.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('i.id = :id AND house.id = :houseId', { id, houseId })
      .leftJoinAndSelect('i.budget', 'b')
      .getOne();
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    Object.assign(income, dto);
    const saved = await this.incomeRepo.save(income);
    await this.refreshFiGoalIfExists(income.budget?.id ?? (saved as any)?.budget?.id, houseId);
    return saved;
  }

  async removeIncome(id: string, houseId: string) {
    const income = await this.incomeRepo
      .createQueryBuilder('i')
      .innerJoin('i.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('i.id = :id AND house.id = :houseId', { id, houseId })
      .leftJoinAndSelect('i.budget', 'b')
      .getOne();
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    const budgetId = income.budget?.id;
    await this.incomeRepo.remove(income);
    await this.refreshFiGoalIfExists(budgetId, houseId);
    return { message: 'Ingreso eliminado' };
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  async addCategory(budgetId: string, houseId: string, dto: AddCategoryDto) {
    const budget = await this.budgetRepo.findOne({ where: { id: budgetId, house: { id: houseId } } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    const cat = this.categoryRepo.create({
      ...dto,
      budget: { id: budgetId } as any,
      expenses: [],
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(id: string, houseId: string, dto: { name?: string; sortOrder?: number }) {
    const cat = await this.categoryRepo
      .createQueryBuilder('c')
      .innerJoin('c.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('c.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async removeCategory(id: string, houseId: string) {
    const cat = await this.categoryRepo
      .createQueryBuilder('c')
      .innerJoin('c.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('c.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (cat.isDefault) throw new BadRequestException('Las categorías predeterminadas no se pueden eliminar');
    await this.categoryRepo.remove(cat);
    return { message: 'Categoría eliminada' };
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async addExpense(categoryId: string, houseId: string, dto: AddExpenseDto) {
    const cat = await this.categoryRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('c.id = :id AND house.id = :houseId', { id: categoryId, houseId })
      .getOne();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    // The first expense of the food category feeds the shopping list budget.
    let shopping: Partial<BudgetExpense> = {};
    if (cat.name?.trim().toLowerCase() === 'comida') {
      const inCategory = await this.expenseRepo.count({ where: { category: { id: categoryId } } });
      const flagged = inCategory
        ? 0
        : await this.expenseRepo.count({
            where: { isShoppingBudget: true, category: { budget: { id: cat.budget.id } } },
          });
      if (!inCategory && !flagged) shopping = { isShoppingBudget: true, name: 'Presupuesto compra' };
    }
    const { isShoppingBudget: _ignored, ...safeDto } = dto as AddExpenseDto & { isShoppingBudget?: boolean };
    const expense = this.expenseRepo.create({
      ...safeDto,
      ...shopping,
      category: { id: categoryId } as any,
    });
    return this.expenseRepo.save(expense);
  }

  async updateExpense(id: string, houseId: string, dto: UpdateExpenseDto) {
    const expense = await this.expenseRepo
      .createQueryBuilder('e')
      .innerJoin('e.category', 'cat')
      .innerJoin('cat.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('e.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    const { isShoppingBudget: _ignored, ...safeDto } = dto as UpdateExpenseDto & { isShoppingBudget?: boolean };
    Object.assign(expense, safeDto);
    return this.expenseRepo.save(expense);
  }

  async removeExpense(id: string, houseId: string) {
    const expense = await this.expenseRepo
      .createQueryBuilder('e')
      .innerJoin('e.category', 'cat')
      .innerJoin('cat.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('e.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    await this.expenseRepo.remove(expense);
    return { message: 'Gasto eliminado' };
  }

  private async syncFiGoal(houseId: string, fiTarget: number): Promise<SavingsGoal> {
    const goal = await this.savingsGoalRepo.findOne({
      where: { name: FI_GOAL_NAME, house: { id: houseId } },
    });
    if (goal) {
      goal.goalAmount = fiTarget;
      return this.savingsGoalRepo.save(goal);
    }
    const created = this.savingsGoalRepo.create({
      name: FI_GOAL_NAME,
      goalAmount: fiTarget,
      currentSavings: 0,
      months: 240,
      annualInterestRate: 7, // percent, same unit as the savings goals form
      emoji: '🏠',
      house: { id: houseId } as any,
    });
    return this.savingsGoalRepo.save(created);
  }

  async syncFiGoalForBudget(id: string, houseId: string): Promise<SavingsGoal> {
    const budget = await this.budgetRepo.findOne({
      where: { id, house: { id: houseId } },
      relations: ['incomeSources'],
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    const totalMonthlyIncome = budget.incomeSources?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
    if (totalMonthlyIncome === 0) throw new BadRequestException('El presupuesto no tiene ingresos registrados');
    const multiplier = budget.fiMultiplier != null ? Number(budget.fiMultiplier) : DEFAULT_FI_MULTIPLIER;
    const fiTarget = Math.round(totalMonthlyIncome * multiplier * 100) / 100;
    return this.syncFiGoal(houseId, fiTarget);
  }

  private async hasNoIncome(budgetId: string): Promise<boolean> {
    try {
      return (await this.incomeRepo.count({ where: { budget: { id: budgetId } } })) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Runs once, when a budget receives its first income: gives the house the plan that follows
   * from the budget — the FI goal and, if the house has no emergency fund at all, a fund synced
   * with the budget. Later incomes never recreate them, so a fund the user deleted stays deleted.
   * Never fails the caller.
   */
  private async ensureDerivedPlan(budgetId: string, houseId: string): Promise<void> {
    try {
      const budget = await this.budgetRepo.findOne({
        where: { id: budgetId, house: { id: houseId } },
        relations: ['incomeSources'],
      });
      if (!budget) return;
      const totalMonthlyIncome = budget.incomeSources?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
      if (totalMonthlyIncome === 0) return;
      const multiplier = budget.fiMultiplier != null ? Number(budget.fiMultiplier) : DEFAULT_FI_MULTIPLIER;
      await this.syncFiGoal(houseId, Math.round(totalMonthlyIncome * multiplier * 100) / 100);

      if (this.fundRepo && (await this.fundRepo.count({ where: { house: { id: houseId } } })) === 0) {
        await this.fundRepo.save(
          this.fundRepo.create({
            name: EMERGENCY_FUND_NAME,
            targetMonths: budget.emergencyFundMonths != null ? Math.round(Number(budget.emergencyFundMonths)) : 6,
            syncWithBudget: true,
            house: { id: houseId } as any,
          }),
        );
      }
    } catch (err) {
      this.logger.warn(`Could not create the derived plan for budget ${budgetId}: ${(err as Error)?.message}`);
    }
  }

  /** Keeps an existing FI goal in line with the budget. Never creates it and never fails the caller. */
  private async refreshFiGoalIfExists(budgetId: string, houseId: string): Promise<void> {
    try {
      if (!budgetId) return;
      const budget = await this.budgetRepo.findOne({
        where: { id: budgetId, house: { id: houseId } },
        relations: ['incomeSources'],
      });
      if (!budget) return;
      const totalMonthlyIncome = budget.incomeSources?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
      if (totalMonthlyIncome === 0) return;
      const multiplier = budget.fiMultiplier != null ? Number(budget.fiMultiplier) : DEFAULT_FI_MULTIPLIER;
      const fiTarget = Math.round(totalMonthlyIncome * multiplier * 100) / 100;
      const goal = await this.savingsGoalRepo.findOne({
        where: { name: FI_GOAL_NAME, house: { id: houseId } },
      });
      if (!goal) return;
      goal.goalAmount = fiTarget;
      await this.savingsGoalRepo.save(goal);
    } catch (err) {
      this.logger.warn(`Could not refresh FI goal for budget ${budgetId}: ${(err as Error)?.message}`);
    }
  }
}
