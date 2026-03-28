import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyFund, ExpenseCategory } from '../database/entities/emergency-fund.entity';

@Injectable()
export class EmergencyFundService {
  constructor(
    @InjectRepository(EmergencyFund) private fundRepo: Repository<EmergencyFund>,
    @InjectRepository(ExpenseCategory) private catRepo: Repository<ExpenseCategory>,
  ) {}

  async findAll(houseId?: string) {
    const where = houseId ? { house: { id: houseId } } : {};
    const funds = await this.fundRepo.find({ where, relations: ['categories'], order: { createdAt: 'DESC' } });
    return funds.map(f => ({ ...f, calculations: this.calculate(f) }));
  }

  async findOne(id: string) {
    const fund = await this.fundRepo.findOne({ where: { id }, relations: ['categories'] });
    if (!fund) throw new NotFoundException('Fondo no encontrado');
    return { ...fund, calculations: this.calculate(fund) };
  }

  async create(dto: any, houseId: string) {
    const { categories, ...fundData } = dto;
    const fund = this.fundRepo.create({ ...fundData, house: { id: houseId } });
    const saved = await this.fundRepo.save(fund);
    const savedFund = Array.isArray(saved) ? saved[0] : saved;

    if (categories?.length) {
      const cats = categories.map((c, i) =>
        this.catRepo.create({ ...c, fund: savedFund, sortOrder: i })
      );
      await this.catRepo.save(cats);
    }
    return this.findOne(savedFund.id);
  }

  async update(id: string, dto: any) {
    const fund = await this.fundRepo.findOne({ where: { id } });
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
    return this.findOne(id);
  }

  async remove(id: string) {
    const fund = await this.fundRepo.findOne({ where: { id } });
    if (!fund) throw new NotFoundException('Fondo no encontrado');
    await this.fundRepo.remove(fund);
    return { message: 'Fondo eliminado' };
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
