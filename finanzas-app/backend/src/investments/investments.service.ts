import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment, InvestmentType } from '../database/entities/investment.entity';

interface InvestmentFrontendDto {
  nombre?: string;
  tipo?: InvestmentType;
  monto?: number;
  moneda?: string;
  tna?: number;
  fechaInicio?: string;
  fechaFin?: string;
  notas?: string;
  activo?: boolean;
}

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment) private repo: Repository<Investment>,
  ) {}

  private toFrontend(inv: Investment) {
    return {
      id: inv.id,
      nombre: inv.name,
      tipo: inv.type,
      monto: inv.amount,
      moneda: inv.currency,
      tna: inv.annualRate,
      fechaInicio: inv.startDate,
      fechaFin: inv.endDate,
      notas: inv.notes,
      activo: inv.isActive,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    };
  }

  private fromFrontend(dto: InvestmentFrontendDto): Partial<Investment> {
    const entity: Partial<Investment> = {};
    if (dto.nombre !== undefined) entity.name = dto.nombre;
    if (dto.tipo !== undefined) entity.type = dto.tipo;
    if (dto.monto !== undefined) entity.amount = dto.monto;
    if (dto.moneda !== undefined) entity.currency = dto.moneda as Investment['currency'];
    if (dto.tna !== undefined) entity.annualRate = dto.tna;
    if (dto.fechaInicio !== undefined) entity.startDate = dto.fechaInicio;
    if (dto.fechaFin !== undefined) entity.endDate = dto.fechaFin;
    if (dto.notas !== undefined) entity.notes = dto.notas;
    if (dto.activo !== undefined) entity.isActive = dto.activo;
    return entity;
  }

  async findAll(houseId: string) {
    const investments = await this.repo.find({
      where: { house: { id: houseId }, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return investments.map(inv => this.toFrontend(inv));
  }

  async create(dto: InvestmentFrontendDto, houseId: string) {
    const inv = this.repo.create({ ...this.fromFrontend(dto), house: { id: houseId } as any });
    return this.toFrontend(await this.repo.save(inv));
  }

  async update(id: string, houseId: string, dto: InvestmentFrontendDto) {
    const inv = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!inv) throw new NotFoundException('Inversión no encontrada');
    Object.assign(inv, this.fromFrontend(dto));
    return this.toFrontend(await this.repo.save(inv));
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
    const investments = await this.repo.find({
      where: { house: { id: houseId }, isActive: true },
      order: { createdAt: 'DESC' },
    });
    const withValue = investments.map(inv => ({
      ...this.toFrontend(inv),
      currentValue: this.calculateCurrentValue(inv),
    }));
    const totalByCurrency = withValue.reduce((acc, inv) => {
      acc[inv.moneda as string] = (acc[inv.moneda as string] || 0) + inv.currentValue;
      return acc;
    }, {} as Record<string, number>);
    return { investments: withValue, totalByCurrency, count: investments.length };
  }

}
