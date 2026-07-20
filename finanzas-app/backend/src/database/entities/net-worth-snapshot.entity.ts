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

@Entity('net_worth_snapshots')
export class NetWorthSnapshot {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'date' }) snapshotDate: string;

  @Column('decimal', { precision: 14, scale: 2 }) totalAssets: number;

  @Column('decimal', { precision: 14, scale: 2 }) totalLiabilities: number;

  @Column('decimal', { precision: 14, scale: 2 }) netWorth: number;

  @Index()
  @ManyToOne(() => House)
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;
}
