import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem, InventoryLocation, InventoryStatus } from '../database/entities/inventory-item.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../database/entities/user.entity';
import { House } from '../database/entities/house.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private itemRepo: Repository<InventoryItem>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(House) private houseRepo: Repository<House>,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(houseId?: string) {
    const where = houseId ? { house: { id: houseId } } : {};
    const items = await this.itemRepo.find({ where, order: { location: 'ASC', name: 'ASC' } });
    return items.map(item => ({ ...item, status: item.status }));
  }

  async findOne(id: string) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Producto no encontrado');
    return { ...item, status: item.status };
  }

  async create(dto: any, houseId: string) {
    const item = this.itemRepo.create({ ...dto, house: { id: houseId } });
    const saved = await this.itemRepo.save(item);
    const savedItem = Array.isArray(saved) ? saved[0] : saved;
    await this.checkAndNotify(savedItem);
    return { ...savedItem, status: savedItem.status };
  }

  async update(id: string, dto: any) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Producto no encontrado');

    const prevQty = item.quantity;
    Object.assign(item, dto);

    // Reset alert flag if stock increased
    if (dto.quantity !== undefined && Number(dto.quantity) > prevQty) {
      item.alertSent = false;
    }

    const saved = await this.itemRepo.save(item);
    const savedItem = Array.isArray(saved) ? saved[0] : saved;
    await this.checkAndNotify(savedItem);
    return { ...savedItem, status: savedItem.status };
  }

  async remove(id: string) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Producto no encontrado');
    await this.itemRepo.remove(item);
    return { message: 'Producto eliminado' };
  }

  async getDashboard(houseId?: string) {
    const items = await this.findAll(houseId);
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.location]) acc[item.location] = [];
      acc[item.location].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const stats = {
      total: items.length,
      ok: items.filter(i => i.status === InventoryStatus.OK).length,
      last: items.filter(i => i.status === InventoryStatus.LAST).length,
      outOfStock: items.filter(i => i.status === InventoryStatus.OUT_OF_STOCK).length,
    };

    return { stats, grouped, items };
  }

  private async checkAndNotify(item: InventoryItem) {
    if (item.quantity === 1 && !item.alertSent && item.house) {
      // Get all active users in the same house
      const users = await this.userRepo
        .createQueryBuilder('user')
        .innerJoin('user.houses', 'house', 'house.id = :houseId', { houseId: item.house.id })
        .where('user.isActive = true')
        .getMany();

      // Send to admin (ridgomez99@gmail.com) always
      await this.notificationsService.sendLowStockEmail('ridgomez99@gmail.com', item.name, true);

      // Send to each user in the house at their email address
      for (const user of users) {
        if (user.email && user.email !== 'ridgomez99@gmail.com') {
          await this.notificationsService.sendLowStockEmail(user.email, item.name, false);
        }
      }

      // Mark alert as sent
      item.alertSent = true;
      await this.itemRepo.save(item);
    }
  }
}
