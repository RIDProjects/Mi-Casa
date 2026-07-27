import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppNotification } from '../database/entities/app-notification.entity';

@Injectable()
export class InAppNotificationsService {
  constructor(
    @InjectRepository(AppNotification)
    private readonly repo: Repository<AppNotification>,
  ) {}

  findAllByHouse(houseId: string): Promise<AppNotification[]> {
    return this.repo.find({
      where: { houseId },
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(id: string, houseId: string): Promise<void> {
    const notification = await this.repo.findOne({ where: { id, houseId } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found for this house`);
    }
    await this.repo.update(id, { isRead: true });
  }

  async markAllRead(houseId: string): Promise<void> {
    await this.repo.update({ houseId, isRead: false }, { isRead: true });
  }

  async create(
    houseId: string,
    data: { message: string; title?: string; body?: string; type?: string },
  ): Promise<AppNotification> {
    const notification = this.repo.create({
      houseId,
      message: data.message,
      title: data.title ?? null,
      body: data.body ?? null,
      type: data.type ?? 'sistema',
    });
    return this.repo.save(notification);
  }
}
