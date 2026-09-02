import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { NotificationsService } from '../notifications/notifications.service';

const FI_GOAL_NAME = 'Independencia Financiera';

const PERIODICITY_FACTOR: Record<Periodicity, number> = {
  [Periodicity.DAILY]:       1 / 30,
  [Periodicity.WEEKLY]:      1 / 4,
  [Periodicity.BIWEEKLY]:    1 / 2,
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
  ) {}

  private computeMonthlyAmount(
    amount: number,
    periodicity: Periodicity,
  ): number {
    return Number(amount) / PERIODICITY_FACTOR[periodicity];
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
      fiTarget:             round2(totalMonthlyIncome * 150),
      minMonthlyInvestment: round2(totalMonthlyIncome * 0.20),
      emergencyFundTarget:  round2(totalMonthlyIncome * 6),
      entertainmentBudget:  round2(totalMonthlyIncome * (isFifty ? 0.30 : 0.10)),
      fixedExpensesCap:     round2(totalMonthlyIncome * (isFifty ? 0.50 : 0.70)),
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
      const to = process.env.SMTP_USER || 'ridgomez99@gmail.com';
      if (summary.alerts?.overBudget) {
        await this.notificationsService.sendBudgetAlert(
          to,
          'Gastos superan ingresos',
          'Tus gastos del mes superan tus ingresos. Revisá tu presupuesto.',
        );
      }
      if (summary.alerts?.antExpensesWarning) {
        await this.notificationsService.sendBudgetAlert(
          to,
          'Alerta gastos hormiga',
          'Los gastos hormiga superan el 15% de tus ingresos.',
        );
      }
    } catch (e) {
      // swallow — never fail the main request due to notification errors
    }
  }

  async findByHouse(houseId: string) {
    const budgets = await this.budgetRepo.find({
      where: { house: { id: houseId } },
      relations: ['incomeSources', 'categories', 'categories.expenses'],
      order: { createdAt: 'DESC' },
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
      savingsTargetPercent: dto.savingsTargetPercent || 20,
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

    await this.budgetRepo.save(budget);
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
    const income = this.incomeRepo.create({
      ...dto,
      budget: { id: budgetId } as any,
    });
    return this.incomeRepo.save(income);
  }

  async updateIncome(id: string, houseId: string, dto: UpdateIncomeDto) {
    const income = await this.incomeRepo
      .createQueryBuilder('i')
      .innerJoin('i.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('i.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    Object.assign(income, dto);
    return this.incomeRepo.save(income);
  }

  async removeIncome(id: string, houseId: string) {
    const income = await this.incomeRepo
      .createQueryBuilder('i')
      .innerJoin('i.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('i.id = :id AND house.id = :houseId', { id, houseId })
      .getOne();
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    await this.incomeRepo.remove(income);
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
      .innerJoin('c.budget', 'budget')
      .innerJoin('budget.house', 'house')
      .where('c.id = :id AND house.id = :houseId', { id: categoryId, houseId })
      .getOne();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    const expense = this.expenseRepo.create({
      ...dto,
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
    Object.assign(expense, dto);
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
      annualInterestRate: 0.07,
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
    const fiTarget = Math.round(totalMonthlyIncome * 150 * 100) / 100;
    return this.syncFiGoal(houseId, fiTarget);
  }
}
