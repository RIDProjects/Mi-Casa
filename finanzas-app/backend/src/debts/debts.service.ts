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
  feasible: boolean;
  totalInterestPaid: number;
  order: string[];
  payoffTimeline: { month: number; totalBalance: number }[];
  // Detalle por deuda (saldo/tasa originales + mes en que se liquida esa
  // deuda puntual) -- el frontend (payoff.tsx) lo necesita para la tabla de
  // "Orden de pago", `order`/`payoffTimeline` de arriba son agregados, no
  // sirven para eso.
  debtDetails: { id: string; label: string; balance: number; interestRate: number; payoffMonth: number }[];
}

const MAX_SIMULATION_MONTHS = 600;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export function computeStrategy(
  debts: DebtSnapshot[],
  strategy: StrategyType,
  extraPayment: number,
): PayoffResult {
  const working = debts.map(d => ({ ...d }));
  let month = 0;
  let totalInterestPaid = 0;
  let feasible = true;
  const timeline: { month: number; totalBalance: number }[] = [];
  const order: string[] = [];
  const payoffMonthById = new Map<string, number>();

  // Presupuesto mensual fijo: suma de los mínimos originales + extra. Cuando
  // una deuda se liquida su mínimo queda libre y se re-aplica (snowball /
  // avalanche). La estrategia "minimum" solo paga mínimos y no rueda nada.
  const rolls = strategy !== 'minimum';
  const monthlyBudget = working.reduce((s, d) => s + d.minimumPayment, 0) + extraPayment;

  let previousTotal = roundMoney(working.reduce((s, d) => s + Math.max(0, d.balance), 0));

  while (working.some(d => d.balance > 0)) {
    if (month >= MAX_SIMULATION_MONTHS) {
      feasible = false;
      break;
    }
    month++;

    let spent = 0;
    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * (d.interestRate / 100)) / 12;
      totalInterestPaid += interest;
      d.balance += interest;
      const payment = Math.min(d.minimumPayment, d.balance);
      spent += payment;
      d.balance = Math.max(0, roundMoney(d.balance - payment));
    }

    if (rolls) {
      let leftover = roundMoney(monthlyBudget - spent);
      const targets = working.filter(d => d.balance > 0);
      if (strategy === 'avalanche') {
        targets.sort((a, b) => b.interestRate - a.interestRate);
      } else {
        targets.sort((a, b) => a.balance - b.balance);
      }
      for (const target of targets) {
        if (leftover <= 0) break;
        const extra = Math.min(leftover, target.balance);
        target.balance = Math.max(0, roundMoney(target.balance - extra));
        leftover = roundMoney(leftover - extra);
      }
    }

    for (const d of working) {
      if (d.balance <= 0 && !order.includes(d.label)) {
        order.push(d.label);
      }
      if (d.balance <= 0 && !payoffMonthById.has(d.id)) {
        payoffMonthById.set(d.id, month);
      }
    }

    const totalBalance = roundMoney(working.reduce((s, d) => s + d.balance, 0));
    timeline.push({ month, totalBalance });

    if (totalBalance <= 0) break;

    // Los pagos no cubren el interés: la deuda total no baja nunca.
    if (totalBalance >= previousTotal) {
      feasible = false;
      break;
    }
    previousTotal = totalBalance;
  }

  const debtDetails = debts.map(d => ({
    id: d.id,
    label: d.label,
    balance: d.balance,
    interestRate: d.interestRate,
    payoffMonth: payoffMonthById.get(d.id) ?? month,
  }));

  return {
    monthsToPayoff: month,
    feasible,
    totalInterestPaid: roundMoney(totalInterestPaid),
    order,
    payoffTimeline: timeline,
    debtDetails,
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
    if (!houseId) return [];
    return this.debtRepo.find({ where: { house: { id: houseId } }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, houseId: string) {
    const debt = await this.debtRepo.findOne({ where: { id, house: { id: houseId } } });
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

    // null (no un objeto con estrategias vacías) para que el frontend
    // (payoff.tsx: `!data && !isLoading`) muestre el estado "Sin deudas
    // registradas" en vez de intentar renderizar tarjetas sin datos.
    if (snapshots.length === 0) return null;

    const minimum = computeStrategy(snapshots, 'minimum', 0);
    const avalanche = computeStrategy(snapshots, 'avalanche', extraMonthlyPayment);
    const snowball = computeStrategy(snapshots, 'snowball', extraMonthlyPayment);

    // El frontend (payoff.tsx) espera { strategies: { minimum, avalanche,
    // snowball } } con totalMonths/totalInterest/interestSaved/debtOrder —
    // computeStrategy() da la simulación cruda (monthsToPayoff/
    // totalInterestPaid/debtDetails), acá se traduce a esa forma.
    const toFrontend = (result: PayoffResult, baseline: PayoffResult) => ({
      totalMonths: result.monthsToPayoff,
      feasible: result.feasible,
      totalInterest: result.totalInterestPaid,
      interestSaved: Math.max(0, Math.round((baseline.totalInterestPaid - result.totalInterestPaid) * 100) / 100),
      debtOrder: result.debtDetails.map(d => ({
        id: d.id,
        name: d.label,
        balance: d.balance,
        rate: d.interestRate,
        payoffMonths: d.payoffMonth,
      })),
    });

    return {
      strategies: {
        minimum: toFrontend(minimum, minimum),
        avalanche: toFrontend(avalanche, minimum),
        snowball: toFrontend(snowball, minimum),
      },
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
