import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HouseholdExpense, HouseholdCategory } from '../database/entities/household-expense.entity';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { PurchaseItem } from '../database/entities/purchase-item.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

const CATEGORIES = Object.values(HouseholdCategory);

@Injectable()
export class HouseholdExpensesService {
  constructor(
    @InjectRepository(HouseholdExpense) private repo: Repository<HouseholdExpense>,
    @InjectRepository(PurchaseList) private listRepo: Repository<PurchaseList>,
    private houseCurrenciesService: HouseCurrenciesService,
  ) {}

  async getMonthData(houseId: string, month: string) {
    if (!houseId) return this.emptyMonth(month);

    // Manual entries (salidas / otros gastos)
    const salidas = await this.repo.find({
      where: { house: { id: houseId }, month },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    // Grocery purchases grouped by place (from Lista de la Compra)
    const list = await this.listRepo.findOne({
      where: { house: { id: houseId }, name: month },
      relations: ['items'],
    });

    const comprasPorLugar = this.calcComprasPorLugar(list?.items ?? []);
    const totalCompras = comprasPorLugar.reduce((s, c) => s + c.totalCUP, 0);
    const totalSalidas = salidas.reduce((s, e) => s + Number(e.amountLocal), 0);

    const resumenCategoria = this.calcResumen(salidas, totalCompras);

    // Currency picker options for clients (mobile has no direct houseId to
    // call /houses/:houseId/currencies — see design.md "Currency options on
    // mobile"). Not itself required by any Phase 2 task, but Phase 5's
    // AddHouseholdExpenseScreen currency picker depends on it at runtime.
    const houseCurrencies = await this.houseCurrenciesService.findByHouse(houseId);
    const localCurrency = houseCurrencies.find(c => c.isLocal);

    return {
      month,
      comprasMercado: comprasPorLugar,
      salidas: salidas.map(e => this.toFrontend(e)),
      resumenCategoria,
      totalCompras: Math.round(totalCompras * 100) / 100,
      totalSalidas: Math.round(totalSalidas * 100) / 100,
      total: Math.round((totalCompras + totalSalidas) * 100) / 100,
      monedaLocal: localCurrency?.currencyCode ?? 'CUP',
      monedas: houseCurrencies.map(c => ({ code: c.currencyCode, symbol: c.symbol })),
    };
  }

  async create(dto: any, houseId: string) {
    const { monto, moneda } = this.normalizeAmount(dto);
    const { rate } = await this.houseCurrenciesService.resolveRateToLocal(
      houseId,
      moneda,
      dto.fecha,
    );

    const expense = this.repo.create({
      date:          dto.fecha,
      description:   dto.descripcion,
      category:      dto.categoria,
      amount:        monto,
      currencyCode:  moneda,
      exchangeRate:  rate,
      amountLocal:   Math.round(monto * rate * 100) / 100,
      place:         dto.lugar,
      month:         dto.mes,
      house:         { id: houseId } as any,
    });
    return this.toFrontend(await this.repo.save(expense));
  }

  async update(id: string, houseId: string, dto: any) {
    const expense = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    const { monto, moneda } = this.normalizeAmount(dto, expense);
    const newDate = dto.fecha ?? expense.date;

    const recomputeNeeded =
      dto.monto !== undefined ||
      dto.montoCUP !== undefined ||
      dto.moneda !== undefined ||
      dto.fecha !== undefined;

    if (recomputeNeeded) {
      const { rate } = await this.houseCurrenciesService.resolveRateToLocal(
        houseId,
        moneda,
        newDate,
      );
      expense.amount = monto;
      expense.currencyCode = moneda;
      expense.exchangeRate = rate;
      expense.amountLocal = Math.round(monto * rate * 100) / 100;
    }

    Object.assign(expense, {
      date:        newDate,
      description: dto.descripcion  ?? expense.description,
      category:    dto.categoria    ?? expense.category,
      place:       dto.lugar        ?? expense.place,
      month:       dto.mes          ?? expense.month,
    });
    return this.toFrontend(await this.repo.save(expense));
  }

  async remove(id: string, houseId: string) {
    const expense = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    await this.repo.remove(expense);
    return { message: 'Gasto eliminado' };
  }

  /**
   * Sums the local-currency snapshot (`amountLocal`) for a house's manual
   * expenses in a given month. Used by SummaryService — never re-converts
   * at read time, only sums the values already persisted at write time.
   */
  async sumLocalForMonth(houseId: string, month: string): Promise<number> {
    const salidas = await this.repo.find({ where: { house: { id: houseId }, month } });
    const total = salidas.reduce((s, e) => s + Number(e.amountLocal), 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Normalizes the entered amount/currency from the request DTO, honoring
   * the deprecated `montoCUP` shim (legacy mobile builds): when `montoCUP`
   * is sent instead of `monto`, it is treated as an amount in CUP.
   *
   * @deprecated Remove the `montoCUP` branch once the minimum supported
   * mobile app version submits `monto`/`moneda` natively — see
   * create-household-expense.dto.ts for the paired DTO-side shim.
   *
   * TODO(open follow-up, design.md Open Questions): the exact minimum
   * supported mobile version that triggers this removal has not been
   * decided yet. Removing this branch before every installed mobile build
   * sends `monto`/`moneda` will break create/update for users on old
   * builds (their request will fall through to `monto: 0`).
   */
  private normalizeAmount(
    dto: any,
    existing?: HouseholdExpense,
  ): { monto: number; moneda: string } {
    if (dto.montoCUP !== undefined) {
      return { monto: Number(dto.montoCUP), moneda: 'CUP' };
    }
    if (dto.monto !== undefined) {
      return { monto: Number(dto.monto), moneda: dto.moneda ?? existing?.currencyCode ?? 'CUP' };
    }
    return {
      monto: existing ? Number(existing.amount) : 0,
      moneda: dto.moneda ?? existing?.currencyCode ?? 'CUP',
    };
  }

  private toFrontend(e: HouseholdExpense) {
    return {
      id:          e.id,
      fecha:       e.date,
      descripcion: e.description,
      categoria:   e.category,
      monto:       e.amount,
      moneda:      e.currencyCode,
      montoLocal:  e.amountLocal,
      tasaCambio:  e.exchangeRate,
      // @deprecated kept for legacy mobile builds — equals montoLocal now.
      montoCUP:    e.amountLocal,
      lugar:       e.place,
      mes:         e.month,
      createdAt:   e.createdAt,
    };
  }

  private calcComprasPorLugar(items: PurchaseItem[]) {
    const map: Record<string, number> = {};
    items.forEach(item => {
      const lugar = item.lugar?.trim() || 'Sin especificar';
      map[lugar] = (map[lugar] ?? 0) + Number(item.unitPrice || 0) * Number(item.quantity || 0);
    });
    const today = new Date().toISOString().split('T')[0];
    return Object.entries(map).map(([lugar, totalCUP]) => ({
      fecha:    today,
      descripcion: `Compra en ${lugar}`,
      categoria:   'Comida',
      lugar,
      totalCUP: Math.round(totalCUP * 100) / 100,
    }));
  }

  private calcResumen(salidas: HouseholdExpense[], totalCompras: number) {
    const byCategory: Record<string, number> = {};
    CATEGORIES.forEach(c => (byCategory[c] = 0));
    byCategory['Comida'] = Math.round(totalCompras * 100) / 100;
    salidas.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amountLocal);
    });
    return Object.entries(byCategory)
      .map(([categoria, totalCUP]) => ({ categoria, totalCUP: Math.round(totalCUP * 100) / 100 }))
      .filter(c => c.totalCUP > 0);
  }

  private emptyMonth(month: string) {
    return {
      month, comprasMercado: [], salidas: [], resumenCategoria: [],
      totalCompras: 0, totalSalidas: 0, total: 0,
      monedaLocal: 'CUP', monedas: [],
    };
  }
}
