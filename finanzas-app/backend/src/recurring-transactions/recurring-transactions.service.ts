import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransaction } from '../database/entities/recurring-transaction.entity';
import { Transaction, TransactionType, PaymentMethod } from '../database/entities/transaction.entity';

interface CreateRecurringTransactionDto {
  name: string;
  amount: number;
  category?: string;
  dayOfMonth?: number;
  isActive?: boolean;
}

interface UpdateRecurringTransactionDto {
  name?: string;
  amount?: number;
  category?: string;
  dayOfMonth?: number;
  isActive?: boolean;
}

@Injectable()
export class RecurringTransactionsService {
  constructor(
    @InjectRepository(RecurringTransaction)
    private recurringRepo: Repository<RecurringTransaction>,

    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  async findByHouse(houseId: string): Promise<RecurringTransaction[]> {
    if (!houseId) return [];
    return this.recurringRepo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateRecurringTransactionDto, houseId: string): Promise<RecurringTransaction> {
    const entity = this.recurringRepo.create({
      name: dto.name,
      amount: dto.amount,
      category: dto.category,
      dayOfMonth: dto.dayOfMonth ?? 1,
      isActive: dto.isActive ?? true,
      house: { id: houseId } as any,
    });
    return this.recurringRepo.save(entity);
  }

  async update(id: string, houseId: string, dto: UpdateRecurringTransactionDto): Promise<RecurringTransaction> {
    const entity = await this.recurringRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!entity) throw new NotFoundException('Transacción recurrente no encontrada');
    Object.assign(entity, dto);
    return this.recurringRepo.save(entity);
  }

  async remove(id: string, houseId: string): Promise<{ message: string }> {
    const entity = await this.recurringRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!entity) throw new NotFoundException('Transacción recurrente no encontrada');
    await this.recurringRepo.remove(entity);
    return { message: 'Transacción recurrente eliminada' };
  }

  async generateForMonth(houseId: string, year: number, month: number): Promise<{ generated: number }> {
    if (!houseId) return { generated: 0 };

    const active = await this.recurringRepo.find({
      where: { house: { id: houseId }, isActive: true },
    });

    const mm = String(month).padStart(2, '0');
    const monthKey = `${year}-${mm}`;
    let generated = 0;

    for (const rt of active) {
      if (rt.lastGeneratedAt && rt.lastGeneratedAt.startsWith(monthKey)) {
        continue;
      }

      const day = Math.min(rt.dayOfMonth, 28);
      const dd = String(day).padStart(2, '0');
      const date = `${year}-${mm}-${dd}`;

      const tx = this.txRepo.create({
        type: TransactionType.EXPENSE,
        concept: rt.name,
        category: rt.category,
        amount: rt.amount,
        paymentMethod: PaymentMethod.TRANSFER,
        date,
        house: { id: houseId } as any,
      });

      await this.txRepo.save(tx);

      rt.lastGeneratedAt = date;
      await this.recurringRepo.save(rt);
      generated++;
    }

    return { generated };
  }
}
