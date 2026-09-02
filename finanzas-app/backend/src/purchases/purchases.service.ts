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

  private formatItemResponse(item: PurchaseItem): any {
    return { ...item };
  }

  async findAllLists(houseId?: string) {
    if (!houseId) return [];
    const lists = await this.listRepo.find({
      where: { house: { id: houseId } },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return lists.map(list => ({ ...list, summary: this.calcSummary(list) }));
  }

  async findOneList(id: string, houseId: string) {
    const list = await this.listRepo.findOne({
      where: { id, house: { id: houseId } },
      relations: ['items'],
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    return { ...list, summary: this.calcSummary(list) };
  }

  async createList(dto: any, houseId: string) {
    const list = this.listRepo.create({ ...dto, house: { id: houseId } });
    return this.listRepo.save(list);
  }

  async updateList(id: string, houseId: string, dto: any) {
    const list = await this.listRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    Object.assign(list, dto);
    await this.listRepo.save(list);
    return this.findOneList(id, houseId);
  }

  async removeList(id: string, houseId: string) {
    const list = await this.listRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    await this.listRepo.remove(list);
    return { message: 'Lista eliminada' };
  }

  async addItem(listId: string, houseId: string, dto: any) {
    const list = await this.listRepo.findOne({ where: { id: listId, house: { id: houseId } } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    const item = this.itemRepo.create({ ...dto, list });
    const saved = await this.itemRepo.save(item as unknown as PurchaseItem);
    return this.formatItemResponse(saved);
  }

  async updateItem(itemId: string, houseId: string, dto: any) {
    const item = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('i.list', 'list')
      .innerJoin('list.house', 'house')
      .where('i.id = :itemId AND house.id = :houseId', { itemId, houseId })
      .getOne();
    if (!item) throw new NotFoundException('Producto no encontrado');
    Object.assign(item, dto);
    const saved = await this.itemRepo.save(item);
    return this.formatItemResponse(saved);
  }

  async removeItem(itemId: string, houseId: string) {
    const item = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('i.list', 'list')
      .innerJoin('list.house', 'house')
      .where('i.id = :itemId AND house.id = :houseId', { itemId, houseId })
      .getOne();
    if (!item) throw new NotFoundException('Producto no encontrado');
    await this.itemRepo.remove(item);
    return { message: 'Producto eliminado' };
  }

  private calcSummary(list: PurchaseList) {
    const items = list.items || [];
    const total = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
    const budget = Number(list.budget || 0);
    const remaining = budget > 0 ? budget - total : null;

    let status = '✅ Justo';
    if (remaining !== null && remaining < 0) status = '🔴 Excedido';
    else if (remaining !== null && budget > 0 && remaining < budget * 0.1) status = '⚠️ Ajustado';

    return {
      total,
      budget,
      remaining,
      status,
      purchased: items.filter(i => i.status === PurchaseStatus.PURCHASED).length,
      pending: items.filter(i => i.status === PurchaseStatus.PENDING).length,
      count: items.length,
    };
  }
}
