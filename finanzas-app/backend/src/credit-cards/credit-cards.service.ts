import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditCard, CardPaymentType } from '../database/entities/credit-card.entity';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectRepository(CreditCard) private repo: Repository<CreditCard>,
  ) {}

  private withSummary(card: CreditCard) {
    const utilizationPercent =
      card.creditLimit > 0
        ? (Number(card.currentBalance) / Number(card.creditLimit)) * 100
        : 0;

    let utilizationStatus: 'good' | 'warning' | 'danger';
    if (utilizationPercent <= 30) utilizationStatus = 'good';
    else if (utilizationPercent <= 50) utilizationStatus = 'warning';
    else utilizationStatus = 'danger';

    // Monthly interest estimate — if paying minimum, interest accrues on ~95% of balance
    const monthlyInterest =
      card.paymentType === CardPaymentType.MINIMUM
        ? Number(card.currentBalance) * 0.95 * (Number(card.annualRate) / 12)
        : Number(card.currentBalance) * (Number(card.annualRate) / 12);

    let advisory: string;
    switch (card.paymentType) {
      case CardPaymentType.FULL:
        advisory = 'Bien, esa es la mejor manera';
        break;
      case CardPaymentType.MINIMUM:
        advisory = 'Considerá refinanciar o pagar más del mínimo';
        break;
      case CardPaymentType.STOPPED:
        advisory = 'Cuidado, te están cobrando intereses y penalidades';
        break;
      case CardPaymentType.PARTIAL:
        advisory = 'Bien, intentá pagar el total para evitar intereses';
        break;
    }

    return {
      ...card,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      utilizationStatus,
      monthlyInterest: Math.round(monthlyInterest * 100) / 100,
      advisory,
    };
  }

  async findByHouse(houseId: string) {
    const cards = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
    const withSummary = cards.map((c) => this.withSummary(c));

    const totalBalance = cards.reduce((s, c) => s + Number(c.currentBalance), 0);
    const totalLimit = cards.reduce((s, c) => s + Number(c.creditLimit), 0);
    const overallUtilization =
      totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 1000) / 10 : 0;

    return {
      cards: withSummary,
      totals: { totalBalance, totalLimit, overallUtilization },
    };
  }

  async create(dto: any, houseId: string) {
    const card = this.repo.create({ ...dto, house: { id: houseId } });
    return this.withSummary(await this.repo.save(card));
  }

  async update(id: string, dto: any) {
    const card = await this.repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    Object.assign(card, dto);
    return this.withSummary(await this.repo.save(card));
  }

  async remove(id: string) {
    const card = await this.repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    await this.repo.remove(card);
    return { message: 'Tarjeta eliminada' };
  }
}
