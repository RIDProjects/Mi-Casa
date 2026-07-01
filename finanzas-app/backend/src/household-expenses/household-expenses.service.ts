import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HouseholdExpense, HouseholdCategory } from '../database/entities/household-expense.entity';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { PurchaseItem } from '../database/entities/purchase-item.entity';

const CATEGORIES = Object.values(HouseholdCategory);

@Injectable()
export class HouseholdExpensesService {
  constructor(
    @InjectRepository(HouseholdExpense) private repo: Repository<HouseholdExpense>,
    @InjectRepository(PurchaseList) private listRepo: Repository<PurchaseList>,
    @InjectRepository(PurchaseItem) private itemRepo: Repository<PurchaseItem>,
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
    const totalSalidas = salidas.reduce((s, e) => s + Number(e.amountCUP), 0);

    const resumenCategoria = this.calcResumen(salidas, totalCompras);

    return {
      month,
      comprasMercado: comprasPorLugar,
      salidas: salidas.map(e => this.toFrontend(e)),
      resumenCategoria,
      totalCompras: Math.round(totalCompras * 100) / 100,
      totalSalidas: Math.round(totalSalidas * 100) / 100,
      total: Math.round((totalCompras + totalSalidas) * 100) / 100,
    };
  }

  async create(dto: any, houseId: string) {
    const expense = this.repo.create({
      date:        dto.fecha,
      description: dto.descripcion,
      category:    dto.categoria,
      amountCUP:   dto.montoCUP,
      place:       dto.lugar,
      month:       dto.mes,
      house:       { id: houseId } as any,
    });
    return this.toFrontend(await this.repo.save(expense));
  }

  async update(id: string, dto: any) {
    const expense = await this.repo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    Object.assign(expense, {
      date:        dto.fecha        ?? expense.date,
      description: dto.descripcion  ?? expense.description,
      category:    dto.categoria    ?? expense.category,
      amountCUP:   dto.montoCUP    ?? expense.amountCUP,
      place:       dto.lugar        ?? expense.place,
      month:       dto.mes          ?? expense.month,
    });
    return this.toFrontend(await this.repo.save(expense));
  }

  async remove(id: string) {
    const expense = await this.repo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    await this.repo.remove(expense);
    return { message: 'Gasto eliminado' };
  }

  private toFrontend(e: HouseholdExpense) {
    return {
      id:          e.id,
      fecha:       e.date,
      descripcion: e.description,
      categoria:   e.category,
      montoCUP:    e.amountCUP,
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
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amountCUP);
    });
    return Object.entries(byCategory)
      .map(([categoria, totalCUP]) => ({ categoria, totalCUP: Math.round(totalCUP * 100) / 100 }))
      .filter(c => c.totalCUP > 0);
  }

  private emptyMonth(month: string) {
    return { month, comprasMercado: [], salidas: [], resumenCategoria: [], totalCompras: 0, totalSalidas: 0, total: 0 };
  }
}
