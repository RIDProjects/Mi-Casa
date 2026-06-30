import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Budget,
  BudgetCategory,
  BudgetExpense,
  IncomeSource,
  Periodicity,
} from '../database/entities/budget.entity';

const PERIODICITY_FACTOR: Record<Periodicity, number> = {
  [Periodicity.MONTHLY]: 1,
  [Periodicity.BIMONTHLY]: 2,
  [Periodicity.QUARTERLY]: 3,
  [Periodicity.SEMIANNUAL]: 6,
  [Periodicity.ANNUAL]: 12,
};

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

    return {
      totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
      totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
      available: Math.round(available * 100) / 100,
      savingsTargetAmount: Math.round(savingsTargetAmount * 100) / 100,
      antExpensesTotal: Math.round(antExpensesTotal * 100) / 100,
      advisory,
    };
  }

  async findByHouse(houseId: string) {
    const budgets = await this.budgetRepo.find({
      where: { house: { id: houseId } },
      relations: ['incomeSources', 'categories', 'categories.expenses'],
      order: { createdAt: 'DESC' },
    });
    return budgets.map((b) => ({ ...b, summary: this.computeSummary(b) }));
  }

  async findOne(id: string) {
    const budget = await this.budgetRepo.findOne({
      where: { id },
      relations: ['incomeSources', 'categories', 'categories.expenses'],
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    return { ...budget, summary: this.computeSummary(budget) };
  }

  async create(dto: any, houseId: string) {
    const defaultCategories = DEFAULT_CATEGORIES.map((name, i) => ({
      name,
      sortOrder: i,
      expenses: [],
    }));

    const budget = this.budgetRepo.create({
      name: dto.name || 'Mi Presupuesto',
      year: dto.year || new Date().getFullYear(),
      savingsTargetPercent: dto.savingsTargetPercent || 20,
      house: { id: houseId } as any,
      incomeSources: [],
      categories: defaultCategories as any,
    });

    const saved = await this.budgetRepo.save(budget);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: any) {
    const budget = await this.budgetRepo.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');

    if (dto.name !== undefined) budget.name = dto.name;
    if (dto.year !== undefined) budget.year = dto.year;
    if (dto.savingsTargetPercent !== undefined)
      budget.savingsTargetPercent = dto.savingsTargetPercent;

    await this.budgetRepo.save(budget);
    return this.findOne(id);
  }

  async remove(id: string) {
    const budget = await this.budgetRepo.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    await this.budgetRepo.remove(budget);
    return { message: 'Presupuesto eliminado' };
  }

  // ── Income sources ──────────────────────────────────────────────────────────

  async addIncome(budgetId: string, dto: any) {
    const income = this.incomeRepo.create({
      ...dto,
      budget: { id: budgetId },
    });
    return this.incomeRepo.save(income);
  }

  async updateIncome(id: string, dto: any) {
    const income = await this.incomeRepo.findOne({ where: { id } });
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    Object.assign(income, dto);
    return this.incomeRepo.save(income);
  }

  async removeIncome(id: string) {
    const income = await this.incomeRepo.findOne({ where: { id } });
    if (!income) throw new NotFoundException('Fuente de ingreso no encontrada');
    await this.incomeRepo.remove(income);
    return { message: 'Ingreso eliminado' };
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  async addCategory(budgetId: string, dto: any) {
    const cat = this.categoryRepo.create({
      ...dto,
      budget: { id: budgetId },
      expenses: [],
    });
    return this.categoryRepo.save(cat);
  }

  async removeCategory(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    await this.categoryRepo.remove(cat);
    return { message: 'Categoría eliminada' };
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async addExpense(categoryId: string, dto: any) {
    const expense = this.expenseRepo.create({
      ...dto,
      category: { id: categoryId },
    });
    return this.expenseRepo.save(expense);
  }

  async updateExpense(id: string, dto: any) {
    const expense = await this.expenseRepo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    Object.assign(expense, dto);
    return this.expenseRepo.save(expense);
  }

  async removeExpense(id: string) {
    const expense = await this.expenseRepo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    await this.expenseRepo.remove(expense);
    return { message: 'Gasto eliminado' };
  }
}
