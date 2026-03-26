import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { PurchaseItem, PurchaseStatus } from '../database/entities/purchase-item.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseList) private listRepo: Repository<PurchaseList>,
    @InjectRepository(PurchaseItem) private itemRepo: Repository<PurchaseItem>,
  ) {}

  async findAllLists() {
    const lists = await this.listRepo.find({ relations: ['items'], order: { createdAt: 'DESC' } });
    return lists.map(list => ({ ...list, summary: this.calcSummary(list) }));
  }

  async findOneList(id: string) {
    const list = await this.listRepo.findOne({ where: { id }, relations: ['items'] });
    if (!list) throw new NotFoundException('Lista no encontrada');
    return { ...list, summary: this.calcSummary(list) };
  }

  async createList(dto: any, userId: string) {
    const list = this.listRepo.create({ ...dto, createdBy: { id: userId } });
    return this.listRepo.save(list);
  }

  async updateList(id: string, dto: any) {
    const list = await this.listRepo.findOne({ where: { id } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    Object.assign(list, dto);
    const saved = await this.listRepo.save(list);
    return { ...saved, summary: this.calcSummary(saved) };
  }

  async removeList(id: string) {
    const list = await this.listRepo.findOne({ where: { id } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    await this.listRepo.remove(list);
    return { message: 'Lista eliminada' };
  }

  async addItem(listId: string, dto: any) {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) throw new NotFoundException('Lista no encontrada');

    // Auto-calculate realPriceCUP from quantity * unitPrice if not provided
    if (!dto.realPriceCUP && dto.quantity && dto.unitPrice) {
      dto.realPriceCUP = Number(dto.quantity) * Number(dto.unitPrice);
    }
    // Auto-calculate realPriceUSD from CUP / exchangeRate
    if (!dto.realPriceUSD && dto.realPriceCUP && list.exchangeRate) {
      dto.realPriceUSD = Number(dto.realPriceCUP) / Number(list.exchangeRate);
    }

    const item = this.itemRepo.create({ ...dto, list });
    return this.itemRepo.save(item);
  }

  async updateItem(itemId: string, dto: any) {
    const item = await this.itemRepo.findOne({ where: { id: itemId }, relations: ['list'] });
    if (!item) throw new NotFoundException('Producto no encontrado');

    Object.assign(item, dto);

    // Recalculate if qty or price changed
    if (dto.quantity || dto.unitPrice) {
      const qty = Number(dto.quantity ?? item.quantity);
      const price = Number(dto.unitPrice ?? item.unitPrice);
      item.realPriceCUP = qty * price;
      if (item.list?.exchangeRate) {
        item.realPriceUSD = item.realPriceCUP / Number(item.list.exchangeRate);
      }
    }

    return this.itemRepo.save(item);
  }

  async removeItem(itemId: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Producto no encontrado');
    await this.itemRepo.remove(item);
    return { message: 'Producto eliminado' };
  }

  private calcSummary(list: PurchaseList) {
    const items = list.items || [];
    const totalRealCUP = items.reduce((s, i) => s + Number(i.realPriceCUP || 0), 0);
    const totalRealUSD = items.reduce((s, i) => s + Number(i.realPriceUSD || 0), 0);
    const totalPlanCUP = items.reduce((s, i) => s + Number(i.plannedPriceCUP || 0), 0);
    const totalPlanUSD = items.reduce((s, i) => s + Number(i.plannedPriceUSD || 0), 0);
    const differenceCUP = totalRealCUP - totalPlanCUP;
    const differenceUSD = totalRealUSD - totalPlanUSD;
    const remainingCUP = Number(list.budgetCUP) - totalRealCUP;
    const remainingUSD = Number(list.budgetUSD) - totalRealUSD;

    let statusCUP = '✅ Justo';
    if (remainingCUP < 0) statusCUP = '🔴 Excedido';
    else if (remainingCUP < Number(list.budgetCUP) * 0.1) statusCUP = '⚠️ Ajustado';

    return {
      totalRealCUP, totalRealUSD, totalPlanCUP, totalPlanUSD,
      differenceCUP, differenceUSD, remainingCUP, remainingUSD,
      statusCUP,
      purchased: items.filter(i => i.status === PurchaseStatus.PURCHASED).length,
      pending: items.filter(i => i.status === PurchaseStatus.PENDING).length,
      total: items.length,
    };
  }
}