import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtType } from '../database/entities/debt.entity';

export interface DebtSnapshot {
  id: string;
  label: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

type StrategyType = 'avalanche' | 'snowball' | 'minimum';

export interface PayoffResult {
  monthsToPayoff: number;
  totalInterestPaid: number;
  order: string[];
  payoffTimeline: { month: number; totalBalance: number }[];
}

function computeStrategy(
  debts: DebtSnapshot[],
  strategy: StrategyType,
  extraPayment: number,
): PayoffResult {
  const working = debts.map(d => ({ ...d }));
  let month = 0;
  let totalInterestPaid = 0;
  const timeline: { month: number; totalBalance: number }[] = [];
  const order: string[] = [];

  while (working.some(d => d.balance > 0) && month < 600) {
    month++;

    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * (d.interestRate / 100)) / 12;
      totalInterestPaid += interest;
      d.balance += interest;
      const payment = Math.min(d.minimumPayment, d.balance);
      d.balance -= payment;
      d.balance = Math.max(0, Math.round(d.balance * 100) / 100);
    }

    const active = working.filter(d => d.balance > 0);

    if (active.length > 0 && extraPayment > 0) {
      let priority: DebtSnapshot;
      if (strategy === 'avalanche') {
        priority = active.reduce((a, b) => (a.interestRate >= b.interestRate ? a : b));
      } else {
        priority = active.reduce((a, b) => (a.balance <= b.balance ? a : b));
      }
      const extra = Math.min(extraPayment, priority.balance);
      priority.balance -= extra;
      priority.balance = Math.max(0, Math.round(priority.balance * 100) / 100);
    }

    for (const d of working) {
      if (d.balance <= 0 && !order.includes(d.label)) {
        order.push(d.label);
      }
    }

    const totalBalance = working.reduce((s, d) => s + d.balance, 0);
    timeline.push({ month, totalBalance: Math.round(totalBalance * 100) / 100 });

    if (totalBalance <= 0) break;
  }

  return {
    monthsToPayoff: month,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    order,
    payoffTimeline: timeline,
  };
}

interface CreateDebtDto {
  personName: string;
  amount: number;
  note?: string;
  type: DebtType;
  isPaid?: boolean;
  interestRate?: number;
  minimumPayment?: number;
}

interface UpdateDebtDto {
  personName?: string;
  amount?: number;
  note?: string;
  type?: DebtType;
  isPaid?: boolean;
  paidAt?: Date;
  interestRate?: number;
  minimumPayment?: number;
}

@Injectable()
export class DebtsService {
  constructor(@InjectRepository(Debt) private debtRepo: Repository<Debt>) {}

  async findAll(houseId?: string) {
    return this.debtRepo.find({ where: houseId ? { house: { id: houseId } } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const debt = await this.debtRepo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  async create(dto: CreateDebtDto, houseId: string) {
    const debt = this.debtRepo.create({ ...dto, house: { id: houseId } });
    return this.debtRepo.save(debt);
  }

  async update(id: string, houseId: string, dto: UpdateDebtDto) {
    const debt = await this.debtRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    if (dto.isPaid && !debt.isPaid) dto.paidAt = new Date();
    Object.assign(debt, dto);
    return this.debtRepo.save(debt);
  }

  async remove(id: string, houseId: string) {
    const debt = await this.debtRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    await this.debtRepo.remove(debt);
    return { message: 'Deuda eliminada' };
  }

  async getPayoffStrategies(houseId: string, extraMonthlyPayment: number) {
    const debts = await this.debtRepo.find({
      where: { house: { id: houseId }, isPaid: false },
    });

    const snapshots: DebtSnapshot[] = debts
      .filter(d => d.type === DebtType.I_OWE)
      .map(d => ({
        id: d.id,
        label: d.personName,
        balance: Number(d.amount),
        interestRate: Number(d.interestRate ?? 0),
        minimumPayment: Number(d.minimumPayment ?? Math.max(Number(d.amount) * 0.05, 100)),
      }));

    if (snapshots.length === 0) {
      const empty: PayoffResult = { monthsToPayoff: 0, totalInterestPaid: 0, order: [], payoffTimeline: [] };
      return { avalanche: empty, snowball: empty, currentMinimums: empty };
    }

    return {
      avalanche: computeStrategy(snapshots, 'avalanche', extraMonthlyPayment),
      snowball: computeStrategy(snapshots, 'snowball', extraMonthlyPayment),
      currentMinimums: computeStrategy(snapshots, 'minimum', 0),
    };
  }

  async getSummary(houseId?: string) {
    const debts = await this.findAll(houseId);
    const active = debts.filter(d => !d.isPaid);

    const theyOweMe = active
      .filter(d => d.type === DebtType.THEY_OWE_ME)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const iOwe = active
      .filter(d => d.type === DebtType.I_OWE)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const byPerson = active.reduce((acc, d) => {
      if (!acc[d.personName]) acc[d.personName] = { theyOweMe: 0, iOwe: 0 };
      if (d.type === DebtType.THEY_OWE_ME) acc[d.personName].theyOweMe += Number(d.amount);
      else acc[d.personName].iOwe += Number(d.amount);
      return acc;
    }, {});

    return {
      totalTheyOweMe: theyOweMe,
      totalIOwe: iOwe,
      balance: theyOweMe - iOwe,
      totalDebts: debts.length,
      activeDebts: active.length,
      byPerson,
    };
  }
}
