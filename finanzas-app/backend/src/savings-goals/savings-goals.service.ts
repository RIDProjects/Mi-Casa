import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsGoal } from '../database/entities/savings-goal.entity';

interface SavingsGoalFrontendDto {
  nombre?: string;
  montoMeta?: number;
  ahorrosActuales?: number;
  mesesParaAhorrarla?: number;
  tasaInteres?: number;
  emoji?: string;
}

@Injectable()
export class SavingsGoalsService {
  constructor(
    @InjectRepository(SavingsGoal) private repo: Repository<SavingsGoal>,
  ) {}

  private computePMT(goal: number, current: number, months: number, annualRate: number): number {
    if (months <= 0) return 0;
    const r = annualRate / 12;
    if (r === 0) return Math.max(0, (goal - current) / months);
    const fvCurrent = current * Math.pow(1 + r, months);
    const needed = goal - fvCurrent;
    if (needed <= 0) return 0;
    return (needed * r) / (Math.pow(1 + r, months) - 1);
  }

  private toFrontend(goal: SavingsGoal) {
    const monthlyContribution = this.computePMT(
      Number(goal.goalAmount),
      Number(goal.currentSavings),
      goal.months,
      Number(goal.annualInterestRate),
    );
    const progress =
      goal.goalAmount > 0
        ? Math.min(100, Math.round((Number(goal.currentSavings) / Number(goal.goalAmount)) * 1000) / 10)
        : 0;

    return {
      id:                   goal.id,
      nombre:               goal.name,
      montoMeta:            goal.goalAmount,
      ahorrosActuales:      goal.currentSavings,
      mesesParaAhorrarla:   goal.months,
      tasaInteres:          goal.annualInterestRate,
      emoji:                goal.emoji,
      createdAt:            goal.createdAt,
      updatedAt:            goal.updatedAt,
      monthlyContribution:  Math.round(monthlyContribution * 100) / 100,
      progress,
    };
  }

  private fromFrontend(dto: SavingsGoalFrontendDto): Partial<SavingsGoal> {
    return {
      name:               dto.nombre,
      goalAmount:         dto.montoMeta,
      currentSavings:     dto.ahorrosActuales,
      months:             dto.mesesParaAhorrarla,
      annualInterestRate: dto.tasaInteres,
      emoji:              dto.emoji,
    };
  }

  async findByHouse(houseId: string) {
    if (!houseId) return [];
    const goals = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    return goals.map(g => this.toFrontend(g));
  }

  async create(dto: SavingsGoalFrontendDto, houseId: string) {
    const goal = this.repo.create({
      ...this.fromFrontend(dto),
      house: { id: houseId } as any,
    });
    return this.toFrontend(await this.repo.save(goal));
  }

  async update(id: string, houseId: string, dto: SavingsGoalFrontendDto) {
    const goal = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    Object.assign(goal, this.fromFrontend(dto));
    return this.toFrontend(await this.repo.save(goal));
  }

  async remove(id: string, houseId: string) {
    const goal = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    await this.repo.remove(goal);
    return { message: 'Meta eliminada' };
  }
}
