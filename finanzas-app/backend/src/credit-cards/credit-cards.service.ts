import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditCard, CardPaymentType } from '../database/entities/credit-card.entity';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectRepository(CreditCard) private repo: Repository<CreditCard>,
  ) {}

  private toFrontend(card: CreditCard) {
    const util =
      card.creditLimit > 0
        ? (Number(card.currentBalance) / Number(card.creditLimit)) * 100
        : 0;

    const advisoryMap: Record<string, string> = {
      [CardPaymentType.FULL]:    'Bien, esa es la mejor manera',
      [CardPaymentType.MINIMUM]: 'Considerá refinanciar o pagar más del mínimo',
      [CardPaymentType.STOPPED]: 'Cuidado, te están cobrando intereses y penalidades',
      [CardPaymentType.PARTIAL]: 'Bien, intentá pagar el total para evitar intereses',
    };

    return {
      id:           card.id,
      banco:        card.bankName,
      nombreTarjeta:card.cardName,
      tasaAnual:    card.annualRate,
      saldoActual:  card.currentBalance,
      lineaCredito: card.creditLimit,
      fechaCorte:   card.cutDate,
      fechaPago:    card.paymentDate,
      tipoPago:     card.paymentType,
      createdAt:    card.createdAt,
      updatedAt:    card.updatedAt,
      utilizationPercent: Math.round(util * 10) / 10,
      advisory: advisoryMap[card.paymentType] ?? '',
    };
  }

  private fromFrontend(dto: any): Partial<CreditCard> {
    return {
      bankName:      dto.banco,
      cardName:      dto.nombreTarjeta,
      annualRate:    dto.tasaAnual,
      currentBalance:dto.saldoActual,
      creditLimit:   dto.lineaCredito,
      cutDate:       dto.fechaCorte,
      paymentDate:   dto.fechaPago,
      paymentType:   dto.tipoPago,
    };
  }

  async findByHouse(houseId: string): Promise<any[]> {
    if (!houseId) return [];
    const cards = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    return cards.map(c => this.toFrontend(c));
  }

  async create(dto: any, houseId: string) {
    const card = this.repo.create({
      ...this.fromFrontend(dto),
      house: { id: houseId } as any,
    });
    const saved = await this.repo.save(card);
    return this.toFrontend(saved);
  }

  async update(id: string, dto: any) {
    const card = await this.repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    Object.assign(card, this.fromFrontend(dto));
    const saved = await this.repo.save(card);
    return this.toFrontend(saved);
  }

  async remove(id: string) {
    const card = await this.repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    await this.repo.remove(card);
    return { message: 'Tarjeta eliminada' };
  }
}
