import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscription } from '../database/entities/push-subscription.entity';

@Injectable()
export class PushService {
  constructor(
    @InjectRepository(PushSubscription) private repo: Repository<PushSubscription>,
    private readonly config: ConfigService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const email = config.get<string>('VAPID_EMAIL') || 'mailto:admin@mi-casa.app';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(email, publicKey, privateKey);
    }
  }

  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }

  async subscribe(houseId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    const existing = await this.repo.findOne({ where: { endpoint: subscription.endpoint }, relations: ['house'] });
    if (existing) {
      // Un mismo endpoint (dispositivo/navegador) puede volver a suscribirse
      // desde otra casa (cambio de casa, dispositivo compartido) — sin esto
      // quedaba pegado a la casa vieja para siempre.
      if (existing.house?.id !== houseId) {
        existing.house = { id: houseId } as any;
        await this.repo.save(existing);
      }
      return existing;
    }
    const sub = this.repo.create({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      house: { id: houseId },
    });
    return this.repo.save(sub);
  }

}
