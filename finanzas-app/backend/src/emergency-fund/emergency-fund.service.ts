import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyFund, ExpenseCategory } from '../database/entities/emergency-fund.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../database/entities/transaction.entity';

@Injectable()
export class EmergencyFundService {
  constructor(
    @InjectRepository(EmergencyFund) private fundRepo: Repository<EmergencyFund>,
    @InjectRepository(ExpenseCategory) private catRepo: Repository<ExpenseCategory>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async findAll(houseId?: string) {
    if (!houseId) return [];
    const funds = await this.fundRepo.find({
      where: { house: { id: houseId } },
      relations: ['categories'],
      order: { createdAt: 'DESC' },
    });
    return funds.map(f => ({ ...f, calculations: this.calculate(f) }));
  }

  async findOne(id: string, houseId: string) {
    const fund = await this.fundRepo.findOne({
      where: { id, house: { id: houseId } },
      relations: ['categories'],
    });
    if (!fund) throw new NotFoundException('Fondo no encontrado');
    return { ...fund, calculations: this.calculate(fund) };
  }

  async create(dto: any, houseId: string) {
    const { categories, ...fundData } = dto;
    const fund = this.fundRepo.create({ ...fundData, house: { id: houseId } });
    const savedFund = await this.fundRepo.save(fund as unknown as EmergencyFund);

    if (categories?.length) {
      const cats = categories.map((c, i) =>
        this.catRepo.create({ ...c, fund: savedFund, sortOrder: i })
      );
      await this.catRepo.save(cats);
    }
    return this.findOne(savedFund.id, houseId);
  }

  async update(id: string, houseId: string, dto: any) {
    const fund = await this.fundRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!fund) throw new NotFoundException('Fondo no encontrado');
    const { categories, ...fundData } = dto;
    Object.assign(fund, fundData);
    await this.fundRepo.save(fund);

    if (categories) {
      await this.catRepo.delete({ fund: { id } });
      const cats = categories.map((c, i) =>
        this.catRepo.create({ ...c, fund, sortOrder: i })
      );
      await this.catRepo.save(cats);
    }
    return this.findOne(id, houseId);
  }

  async remove(id: string, houseId: string) {
    const fund = await this.fundRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!fund) throw new NotFoundException('Fondo no encontrado');
    await this.fundRepo.remove(fund);
    return { message: 'Fondo eliminado' };
  }

  async getLatest(houseId: string) {
    return this.fundRepo.findOne({
      where: { house: { id: houseId } },
      order: { updatedAt: 'DESC' },
    });
  }

  async getCoverage(houseId: string) {
    const funds = await this.findAll(houseId);
    const latestFund = funds[0] as any;
    const balance = latestFund?.currentBalance ?? 0;

    // Last 3 months of transactions to compute average monthly expenses
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await this.transactionsService.findByRange(
      houseId,
      threeMonthsAgo.toISOString().slice(0, 10),
      now.toISOString().slice(0, 10),
    );

    const expenseTxs = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const totalExpenses = expenseTxs.reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpenses = Math.round((totalExpenses / 3) * 100) / 100;

    const monthsCovered = monthlyExpenses > 0
      ? Math.round((balance / monthlyExpenses) * 10) / 10
      : 0;

    let status: 'safe' | 'low' | 'critical';
    if (monthsCovered >= 6) status = 'safe';
    else if (monthsCovered >= 3) status = 'low';
    else status = 'critical';

    return {
      balance: Math.round(balance * 100) / 100,
      monthlyExpenses,
      monthsCovered,
      targetMonths: 6,
      status,
    };
  }

  // Core business logic replicating Excel formulas:
  // Monto óptimo = total_gastos_mensuales * targetMonths
  // Monto mínimo = total_gastos_mensuales * minimumMonths
  // Ahorro mensual mínimo = monto_mínimo / savingPeriodMonths
  private calculate(fund: EmergencyFund) {
    const totalMonthlyExpenses = (fund.categories || [])
      .reduce((sum, c) => sum + Number(c.monthlyAmount), 0);

    const optimalFund = totalMonthlyExpenses * fund.targetMonths;
    const minimumFund = totalMonthlyExpenses * fund.minimumMonths;
    const monthlySavingsRequired = fund.savingPeriodMonths > 0
      ? minimumFund / fund.savingPeriodMonths
      : 0;
    const monthsToOptimal = monthlySavingsRequired > 0
      ? Math.ceil(optimalFund / monthlySavingsRequired)
      : 0;

    return {
      totalMonthlyExpenses,
      optimalFund,
      minimumFund,
      monthlySavingsRequired,
      monthsToOptimal,
    };
  }
}
