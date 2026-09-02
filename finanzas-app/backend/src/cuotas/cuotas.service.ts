import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cuota } from '../database/entities/cuota.entity';
import { CreateCuotaDto } from './dto/create-cuota.dto';

@Injectable()
export class CuotasService {
  constructor(
    @InjectRepository(Cuota) private repo: Repository<Cuota>,
  ) {}

  private computeFields(c: Cuota) {
    const remaining = c.totalInstallments - c.paidInstallments;
    const startDate = new Date(c.startDate);
    const nextPayment = new Date(startDate);
    nextPayment.setMonth(nextPayment.getMonth() + c.paidInstallments);

    return {
      ...c,
      remainingInstallments: remaining,
      remainingAmount: Math.round(remaining * Number(c.installmentAmount) * 100) / 100,
      nextPaymentDate: nextPayment.toISOString().slice(0, 10),
      isCompleted: c.paidInstallments >= c.totalInstallments,
    };
  }

  async findByHouse(houseId: string) {
    const cuotas = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    return cuotas.map(c => this.computeFields(c));
  }

  // El DTO usa cardLastFour (nombre real que manda el frontend); la entidad
  // sigue usando la columna cardLast4. Se mapea explícitamente acá en vez de
  // spread directo para no perder el dato silenciosamente (TypeORM ignora
  // propiedades que no existen como columna).
  private toEntityFields(dto: Partial<CreateCuotaDto>): Partial<Cuota> {
    const { cardLastFour, ...rest } = dto;
    const fields: Partial<Cuota> = { ...rest };
    if (cardLastFour !== undefined) fields.cardLast4 = cardLastFour;
    return fields;
  }

  async create(dto: CreateCuotaDto, houseId: string) {
    const cuota = this.repo.create({
      ...this.toEntityFields(dto),
      paidInstallments: dto.paidInstallments ?? 0,
      house: { id: houseId } as any,
    });
    const saved = await this.repo.save(cuota);
    return this.computeFields(saved);
  }

  async update(id: string, houseId: string, dto: Partial<CreateCuotaDto>) {
    const cuota = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!cuota) throw new NotFoundException('Cuota no encontrada');
    Object.assign(cuota, this.toEntityFields(dto));
    const saved = await this.repo.save(cuota);
    return this.computeFields(saved);
  }

  async remove(id: string, houseId: string) {
    const cuota = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!cuota) throw new NotFoundException('Cuota no encontrada');
    await this.repo.remove(cuota);
    return { message: 'Cuota eliminada' };
  }

  async payInstallment(id: string, houseId: string) {
    const cuota = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!cuota) throw new NotFoundException('Cuota no encontrada');
    cuota.paidInstallments = Math.min(cuota.paidInstallments + 1, cuota.totalInstallments);
    const saved = await this.repo.save(cuota);
    return this.computeFields(saved);
  }

  async getMonthlyCommitment(houseId: string) {
    const cuotas = await this.repo.find({ where: { house: { id: houseId } } });
    const active = cuotas.filter(c => c.paidInstallments < c.totalInstallments);
    const monthly = active.reduce((s, c) => s + Number(c.installmentAmount), 0);
    return {
      monthlyCommitment: Math.round(monthly * 100) / 100,
      activeCount: active.length,
      totalRemainingDebt: active.reduce((s, c) => {
        const rem = (c.totalInstallments - c.paidInstallments) * Number(c.installmentAmount);
        return s + rem;
      }, 0),
    };
  }

  async getActiveCuotas(houseId: string) {
    const cuotas = await this.repo.find({ where: { house: { id: houseId } } });
    return cuotas
      .filter(c => c.paidInstallments < c.totalInstallments)
      .map(c => this.computeFields(c));
  }
}
