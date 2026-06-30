import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsGoal } from '../database/entities/savings-goal.entity';

@Injectable()
export class SavingsGoalsService {
  constructor(
    @InjectRepository(SavingsGoal) private repo: Repository<SavingsGoal>,
  ) {}

  private computePMT(
    goal: number,
    current: number,
    months: number,
    annualRate: number,
  ): number {
    if (months <= 0) return 0;
    const r = annualRate / 12;
    if (r === 0) return Math.max(0, (goal - current) / months);
    const fvCurrent = current * Math.pow(1 + r, months);
    const needed = goal - fvCurrent;
    if (needed <= 0) return 0;
    return (needed * r) / (Math.pow(1 + r, months) - 1);
  }

  private withSummary(goal: SavingsGoal) {
    const monthlyContribution = this.computePMT(
      Number(goal.goalAmount),
      Number(goal.currentSavings),
      goal.months,
      Number(goal.annualInterestRate),
    );
    const progress =
      goal.goalAmount > 0
        ? (Number(goal.currentSavings) / Number(goal.goalAmount)) * 100
        : 0;
    return {
      ...goal,
      monthlyContribution: Math.round(monthlyContribution * 100) / 100,
      progress: Math.min(100, Math.round(progress * 10) / 10),
    };
  }

  async findByHouse(houseId: string) {
    const goals = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    return goals.map((g) => this.withSummary(g));
  }

  async create(dto: any, houseId: string) {
    const goal = this.repo.create({ ...dto, house: { id: houseId } });
    return this.withSummary(await this.repo.save(goal));
  }

  async update(id: string, dto: any) {
    const goal = await this.repo.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    Object.assign(goal, dto);
    return this.withSummary(await this.repo.save(goal));
  }

  async remove(id: string) {
    const goal = await this.repo.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    await this.repo.remove(goal);
    return { message: 'Meta eliminada' };
  }
}
