import { Injectable } from '@nestjs/common';
import { DebtsService } from '../debts/debts.service';
import { LoansService } from '../loans/loans.service';
import { CuotasService } from '../cuotas/cuotas.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { DebtType } from '../database/entities/debt.entity';
import { CardPaymentType } from '../database/entities/credit-card.entity';
import { computeDebtOffset, OffsetPriority } from '../debts/debt-offset';

export type DebtLineSource = 'debt' | 'loan' | 'cuota' | 'card';

export interface DebtLine {
  source: DebtLineSource;
  id: string;
  label: string;
  /** What the house has to pay each month for this obligation. */
  monthlyAmount: number;
  /** What is still owed. */
  balance: number;
  /** True when the monthly amount is an estimate, not a value the user entered. */
  estimated: boolean;
  /** Annual interest rate in %, used by the payoff simulation (0 when the payment already includes it). */
  interestRate: number;
}

// Same convention the debts payoff simulation uses when no minimum is set.
const ESTIMATED_PAYMENT_RATE = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Monthly debt service of a house, one line per obligation. This is the single
 * source for the automatic "Deudas" budget lines and for the debt health card.
 */
@Injectable()
export class DebtLinesService {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly loansService: LoansService,
    private readonly cuotasService: CuotasService,
    private readonly creditCardsService: CreditCardsService,
  ) {}

  async getLines(houseId: string): Promise<DebtLine[]> {
    if (!houseId) return [];
    const [debts, loans, cuotas, cards] = await Promise.all([
      this.debtsService.findAll(houseId),
      this.loansService.findByHouse(houseId),
      this.cuotasService.getActiveCuotas(houseId),
      this.creditCardsService.findByHouse(houseId),
    ]);

    const lines: DebtLine[] = [];

    // What is owed to the house is applied against its debts by priority; only what is
    // left uncovered is budgeted, with its payment computed on that remaining balance.
    const unpaid = debts.filter((d: any) => !d.isPaid);
    const owedToMe = unpaid
      .filter((d: any) => d.type === DebtType.THEY_OWE_ME)
      .reduce((s: number, d: any) => s + Number(d.amount), 0);
    const owing = unpaid.filter((d: any) => d.type === DebtType.I_OWE);
    const byId = new Map<string, any>(owing.map((d: any) => [d.id, d]));
    const offset = computeDebtOffset({
      owedToMe,
      debts: owing.map((d: any) => ({
        id: d.id,
        label: d.personName,
        amount: Number(d.amount),
        priority: (d.priority ?? 'media') as OffsetPriority,
        createdAt: d.createdAt ?? new Date(0),
      })),
    });

    for (const item of offset.items) {
      if (item.pending <= 0) continue;
      const d = byId.get(item.id);
      // The debt form saves 0 when the minimum payment is left empty: that means "not set".
      const minimum = d.minimumPayment != null ? Number(d.minimumPayment) : 0;
      const entered = minimum > 0 ? minimum : null;
      lines.push({
        source: 'debt',
        id: item.id,
        label: item.label,
        monthlyAmount: round2(entered != null ? Math.min(entered, item.pending) : item.pending * ESTIMATED_PAYMENT_RATE),
        balance: item.pending,
        estimated: entered == null,
        interestRate: Number(d.interestRate ?? 0),
      });
    }

    for (const l of loans) {
      const monthly = Number(l.cuotaMensual ?? 0);
      if (monthly <= 0) continue;
      lines.push({
        source: 'loan',
        id: l.id,
        label: `${l.tipo} - ${l.institucion}`,
        monthlyAmount: round2(monthly),
        balance: Number(l.deudaActual ?? 0),
        estimated: false,
        interestRate: 0,
      });
    }

    for (const c of cuotas) {
      const remaining = Number(c.totalInstallments) - Number(c.paidInstallments);
      lines.push({
        source: 'cuota',
        id: c.id,
        label: c.description,
        monthlyAmount: round2(Number(c.installmentAmount)),
        balance: round2(remaining * Number(c.installmentAmount)),
        estimated: false,
        interestRate: 0,
      });
    }

    for (const k of cards) {
      // A card paid in full each month is regular spending, not debt service.
      if (k.tipoPago === CardPaymentType.FULL) continue;
      const balance = Number(k.saldoActual ?? 0);
      if (balance <= 0) continue;
      lines.push({
        source: 'card',
        id: k.id,
        label: `${k.banco} ${k.nombreTarjeta}`.trim(),
        monthlyAmount: round2(balance * ESTIMATED_PAYMENT_RATE),
        balance,
        estimated: true,
        interestRate: Number(k.tasaAnual ?? 0),
      });
    }

    return lines;
  }

  async getMonthlyTotal(houseId: string): Promise<number> {
    const lines = await this.getLines(houseId);
    return round2(lines.reduce((s, l) => s + l.monthlyAmount, 0));
  }
}
