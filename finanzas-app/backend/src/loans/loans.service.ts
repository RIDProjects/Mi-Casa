import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../database/entities/loan.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan) private repo: Repository<Loan>,
  ) {}

  private withSummary(loan: Loan) {
    const progressPercent =
      loan.initialDebt > 0
        ? Math.min(100, Math.round(((1 - Number(loan.currentDebt) / Number(loan.initialDebt)) * 100) * 10) / 10)
        : 0;
    return { ...loan, progressPercent };
  }

  async findByHouse(houseId: string) {
    const loans = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    const withSummary = loans.map((l) => this.withSummary(l));
    const totalDebt = loans.reduce((s, l) => s + Number(l.currentDebt), 0);
    const totalMonthlyPayment = loans.reduce((s, l) => s + Number(l.monthlyPayment), 0);
    return { loans: withSummary, totals: { totalDebt, totalMonthlyPayment } };
  }

  async create(dto: any, houseId: string) {
    const loan = this.repo.create({ ...dto, house: { id: houseId } });
    return this.withSummary(await this.repo.save(loan));
  }

  async update(id: string, dto: any) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    Object.assign(loan, dto);
    return this.withSummary(await this.repo.save(loan));
  }

  async remove(id: string) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    await this.repo.remove(loan);
    return { message: 'Crédito eliminado' };
  }
}
