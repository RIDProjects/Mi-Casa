import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { House } from './house.entity';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text') endpoint: string;
  @Column('json') keys: { p256dh: string; auth: string };

  @Index()
  @ManyToOne(() => House, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;
}
