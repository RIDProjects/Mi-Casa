import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditCard, CardPaymentType, CardType } from '../database/entities/credit-card.entity';

/** Debit cards are record-only; anything that is not explicitly debit (incl. legacy rows) is credit. */
export const isCreditCard = (card: { tipo?: string }): boolean => card.tipo !== CardType.DEBIT;

interface CreditCardFrontendDto {
  tipo?: CardType;
  banco?: string;
  nombreTarjeta?: string;
  tasaAnual?: number;
  saldoActual?: number;
  lineaCredito?: number;
  fechaCorte?: string;
  fechaPago?: string;
  tipoPago?: CardPaymentType;
}

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
      [CardPaymentType.MINIMUM]: 'Considera refinanciar o pagar más del mínimo',
      [CardPaymentType.STOPPED]: 'Cuidado, te están cobrando intereses y penalidades',
      [CardPaymentType.PARTIAL]: 'Bien, intenta pagar el total para evitar intereses',
    };

    return {
      id:           card.id,
      tipo:         card.cardType,
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

  private fromFrontend(dto: CreditCardFrontendDto): Partial<CreditCard> {
    return {
      cardType:      dto.tipo,
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

  async create(dto: CreditCardFrontendDto, houseId: string) {
    const card = this.repo.create({
      ...this.fromFrontend(dto),
      house: { id: houseId } as any,
    });
    const saved = await this.repo.save(card);
    return this.toFrontend(saved);
  }

  async update(id: string, houseId: string, dto: CreditCardFrontendDto) {
    const card = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    Object.assign(card, this.fromFrontend(dto));
    const saved = await this.repo.save(card);
    return this.toFrontend(saved);
  }

  async remove(id: string, houseId: string) {
    const card = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    await this.repo.remove(card);
    return { message: 'Tarjeta eliminada' };
  }
}
