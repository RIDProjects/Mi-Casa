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

@Entity('app_notifications')
export class AppNotification {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() message: string;

  @Column({ nullable: true }) title: string | null;

  @Column({ nullable: true }) body: string | null;

  @Column({ default: 'sistema' }) type: string;

  @Column({ default: false }) isRead: boolean;

  @CreateDateColumn() createdAt: Date;

  @ManyToOne(() => House, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @Index()
  @Column() houseId: string;
}
