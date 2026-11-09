import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { BudgetService } from '../budget/budget.service';
import { PurchaseItem, PurchaseStatus } from '../database/entities/purchase-item.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

type Rates = Record<string, number | null> | undefined;

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseList) private listRepo: Repository<PurchaseList>,
    @InjectRepository(PurchaseItem) private itemRepo: Repository<PurchaseItem>,
    private readonly budgetService: BudgetService,
    // Optional so lightweight constructions (tests) keep working without conversion.
    @Optional() private readonly houseCurrenciesService?: HouseCurrenciesService,
  ) {}

  private async getRates(houseId: string): Promise<Rates> {
    return this.houseCurrenciesService ? this.houseCurrenciesService.getRates(houseId) : undefined;
  }

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
    const shoppingBudget = lists.length > 0 ? await this.budgetService.getShoppingBudget(houseId) : null;
    const rates = lists.length > 0 ? await this.getRates(houseId) : undefined;
    return lists.map(list => this.withBudget(list, shoppingBudget, rates));
  }

  async findOneList(id: string, houseId: string) {
    const list = await this.listRepo.findOne({
      where: { id, house: { id: houseId } },
      relations: ['items'],
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    const shoppingBudget = await this.budgetService.getShoppingBudget(houseId);
    return this.withBudget(list, shoppingBudget, await this.getRates(houseId));
  }

  /** The budget always comes from the budget module (0 when it defines none); the stored column is never read. */
  private withBudget(list: PurchaseList, shoppingBudget: number | null, rates?: Rates) {
    const synced = shoppingBudget != null;
    const resolved = { ...list, budget: shoppingBudget ?? 0 };
    return { ...resolved, budgetSynced: synced, summary: this.calcSummary(resolved as PurchaseList, rates) };
  }

  async createList(dto: any, houseId: string) {
    const list = this.listRepo.create({ ...dto, house: { id: houseId } });
    return this.listRepo.save(list);
  }

  async updateList(id: string, houseId: string, dto: any) {
    const list = await this.listRepo.findOne({ where: { id, house: { id: houseId } } });
    if (!list) throw new NotFoundException('Lista no encontrada');
    // The budget module is the source of truth: manual budget edits are ignored.
    const { budget: _budget, ...rest } = dto ?? {};
    Object.assign(list, rest);
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

  /**
   * Item totals are converted to the house local currency with the latest rate. Items without a
   * currency are local; an item whose currency has no rate is left out and reported in missingRates.
   */
  private calcSummary(list: PurchaseList, rates?: Rates) {
    const items = list.items || [];
    const missing = new Set<string>();
    const total = items.reduce((s, i) => {
      const amount = Number(i.quantity || 0) * Number(i.unitPrice || 0);
      if (!rates || !i.currency) return s + amount;
      const rate = rates[i.currency];
      if (rate == null) {
        missing.add(i.currency);
        return s;
      }
      return s + amount * rate;
    }, 0);
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
      missingRates: [...missing],
    };
  }
}
