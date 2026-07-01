import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TransactionType } from '../database/entities/transaction.entity';

export type Thermometer = 'on_track' | 'near_limit' | 'over_budget';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  private toFrontend(tx: Transaction) {
    return {
      id:            tx.id,
      tipo:          tx.type,
      concepto:      tx.concept,
      categoria:     tx.category,
      monto:         tx.amount,
      metodoPago:    tx.paymentMethod,
      nombreTarjeta: tx.cardName,
      fecha:         tx.date,
      notas:         tx.notes,
      createdAt:     tx.createdAt,
    };
  }

  private fromFrontend(dto: any): Partial<Transaction> {
    return {
      type:          dto.tipo,
      concept:       dto.concepto,
      category:      dto.categoria,
      amount:        dto.monto,
      paymentMethod: dto.metodoPago,
      cardName:      dto.nombreTarjeta,
      date:          dto.fecha,
      notes:         dto.notas,
    };
  }

  private async rawFindByMonth(houseId: string, year: number, month: number): Promise<Transaction[]> {
    if (!houseId) return [];
    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end = `${year}-${mm}-31`;
    return this.txRepo.find({
      where: { house: { id: houseId }, date: Between(start, end) as any },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByMonth(houseId: string, year: number, month: number): Promise<any[]> {
    const rows = await this.rawFindByMonth(houseId, year, month);
    return rows.map(t => this.toFrontend(t));
  }

  async create(dto: any, houseId: string): Promise<any> {
    const tx = this.txRepo.create({
      ...this.fromFrontend(dto),
      house: { id: houseId } as any,
    });
    return this.toFrontend(await this.txRepo.save(tx));
  }

  async update(id: string, dto: any): Promise<any> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    Object.assign(tx, this.fromFrontend(dto));
    return this.toFrontend(await this.txRepo.save(tx));
  }

  async remove(id: string): Promise<{ message: string }> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    await this.txRepo.remove(tx);
    return { message: 'Transacción eliminada' };
  }

  async getMonthSummary(
    houseId: string,
    year: number,
    month: number,
    expectedIncome = 0,
    expectedExpenses = 0,
  ) {
    const transactions = await this.rawFindByMonth(houseId, year, month);

    const realIncome = transactions
      .filter(t => t.type === TransactionType.FIXED_INCOME || t.type === TransactionType.VARIABLE_INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const realExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const available = realIncome - realExpenses;
    const usagePercent = expectedExpenses > 0 ? (realExpenses / expectedExpenses) * 100 : 0;

    let thermometer: Thermometer;
    if (usagePercent <= 80) thermometer = 'on_track';
    else if (usagePercent <= 100) thermometer = 'near_limit';
    else thermometer = 'over_budget';

    const byCategory = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        const cat = t.category || 'Otros';
        acc[cat] = (acc[cat] ?? 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const byPaymentMethod = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] ?? 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return {
      year,
      month,
      realIncome:      Math.round(realIncome * 100) / 100,
      realExpenses:    Math.round(realExpenses * 100) / 100,
      expectedIncome,
      expectedExpenses,
      available:       Math.round(available * 100) / 100,
      usagePercent:    Math.round(usagePercent * 10) / 10,
      thermometer,
      byCategory,
      byPaymentMethod,
      transactionCount: transactions.length,
    };
  }
}
