import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment, InvestmentType } from '../database/entities/investment.entity';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment) private repo: Repository<Investment>,
  ) {}

  findAll(houseId: string) {
    return this.repo.find({
      where: { house: { id: houseId }, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  create(dto: any, houseId: string) {
    const inv = this.repo.create({ ...dto, house: { id: houseId } });
    return this.repo.save(inv);
  }

  async update(id: string, houseId: string, dto: any) {
    const inv = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!inv) throw new NotFoundException('Inversión no encontrada');
    Object.assign(inv, dto);
    return this.repo.save(inv);
  }

  async remove(id: string, houseId: string) {
    const inv = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!inv) throw new NotFoundException('Inversión no encontrada');
    await this.repo.remove(inv);
    return { message: 'Inversión eliminada' };
  }

  calculateCurrentValue(inv: Investment): number {
    const base = Number(inv.amount);
    if (inv.type !== InvestmentType.PLAZO_FIJO || !inv.annualRate || !inv.startDate) return base;
    const start = new Date(inv.startDate);
    const end = inv.endDate ? new Date(inv.endDate) : new Date();
    const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
    return base * (1 + (Number(inv.annualRate) / 100) * (days / 365));
  }

  async getSummary(houseId: string) {
    const investments = await this.findAll(houseId);
    const withValue = investments.map(inv => ({
      ...inv,
      currentValue: this.calculateCurrentValue(inv),
    }));
    const totalByCurrency = withValue.reduce((acc, inv) => {
      acc[inv.currency] = (acc[inv.currency] || 0) + inv.currentValue;
      return acc;
    }, {} as Record<string, number>);
    return { investments: withValue, totalByCurrency, count: investments.length };
  }

}
