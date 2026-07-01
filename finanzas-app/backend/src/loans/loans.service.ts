import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../database/entities/loan.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan) private repo: Repository<Loan>,
  ) {}

  private toFrontend(loan: Loan) {
    const progressPercent =
      loan.initialDebt > 0
        ? Math.min(
            100,
            Math.round(
              ((1 - Number(loan.currentDebt) / Number(loan.initialDebt)) * 100) * 10,
            ) / 10,
          )
        : 0;

    return {
      id:           loan.id,
      tipo:         loan.loanType,
      institucion:  loan.institution,
      deudaInicial: loan.initialDebt,
      deudaActual:  loan.currentDebt,
      cuotaMensual: loan.monthlyPayment,
      notas:        loan.notes,
      createdAt:    loan.createdAt,
      updatedAt:    loan.updatedAt,
      progressPercent,
    };
  }

  private fromFrontend(dto: any): Partial<Loan> {
    return {
      loanType:      dto.tipo,
      institution:   dto.institucion,
      initialDebt:   dto.deudaInicial,
      currentDebt:   dto.deudaActual,
      monthlyPayment:dto.cuotaMensual,
      notes:         dto.notas,
    };
  }

  async findByHouse(houseId: string): Promise<any[]> {
    if (!houseId) return [];
    const loans = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    return loans.map(l => this.toFrontend(l));
  }

  async create(dto: any, houseId: string) {
    const loan = this.repo.create({
      ...this.fromFrontend(dto),
      house: { id: houseId } as any,
    });
    const saved = await this.repo.save(loan);
    return this.toFrontend(saved);
  }

  async update(id: string, dto: any) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    Object.assign(loan, this.fromFrontend(dto));
    const saved = await this.repo.save(loan);
    return this.toFrontend(saved);
  }

  async remove(id: string) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Crédito no encontrado');
    await this.repo.remove(loan);
    return { message: 'Crédito eliminado' };
  }
}
