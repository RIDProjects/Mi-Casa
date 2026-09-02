import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
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

  // create() se llama desde chequeos que corren en CADA request (ej.
  // GET /budget dispara notifyBudgetAlerts en cada carga de la pantalla de
  // presupuesto) -- sin dedup, una alerta que sigue activa generaria una
  // fila nueva por cada fetch, inundando la campanita. createIfNotRecent
  // solo inserta si no hay una notificacion sin leer del mismo `type` para
  // esa casa creada dentro de `windowHours` (24hs por default).
  async createIfNotRecent(
    houseId: string,
    data: { message: string; title?: string; body?: string; type: string },
    windowHours = 24,
  ): Promise<AppNotification | null> {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recent = await this.repo.findOne({
      where: { houseId, type: data.type, isRead: false, createdAt: MoreThan(since) },
    });
    if (recent) return null;
    return this.create(houseId, data);
  }
}
